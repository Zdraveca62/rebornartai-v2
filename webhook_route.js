// app/api/stripe/webhook/route.js
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { query, withTransaction } from '@/lib/db'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
})

export const config = {
  api: { bodyParser: false },
}

// ─── Email helper ──────────────────────────────────────────────────────────────
async function sendEmail(route, payload) {
  const base = process.env.NEXT_PUBLIC_APP_URL
  const res  = await fetch(`${base}/api/email/${route}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Email /api/email/${route} failed: ${text}`)
  }
  return res.json()
}

// ─── Handler: платена поръчка (preview или full) ───────────────────────────────
async function handleOrderPaid(metadata, session) {
  const { orderType, dbOrderId, userId, locale } = metadata

  await withTransaction(async (client) => {
    // 1. Маркираме поръчката като платена
    const updateRes = await client.query(
      `UPDATE orders
       SET status                = 'paid',
           paid_at               = NOW(),
           stripe_payment_intent = $2
       WHERE id = $1
       RETURNING id, order_type, gross_amount, vat_amount, net_amount,
                 youtube_id, duration_seconds`,
      [dbOrderId, session.payment_intent ?? null]
    )

    if (updateRes.rowCount === 0) {
      throw new Error(`orders update failed — не намерена поръчка: ${dbOrderId}`)
    }

    const order = updateRes.rows[0]

    // 2. Вземаме email от registrations
    const userRes = await client.query(
      `SELECT email FROM registrations WHERE id = $1`,
      [userId]
    )
    const customerEmail = userRes.rows[0]?.email ?? session.customer_email

    // 3. Вземаме заглавието от youtube_cache
    const ytRes = await client.query(
      `SELECT title FROM youtube_cache WHERE youtube_id = $1`,
      [order.youtube_id]
    )
    const videoTitle = ytRes.rows[0]?.title ?? order.youtube_id

    // 4. Email до клиента — потвърждение за плащане
    await sendEmail('send-receipt', {
      orderType,
      orderId:     dbOrderId,
      userId,
      locale:      locale ?? 'bg',
      email:       customerEmail,
      videoTitle,
      amountGross: order.gross_amount,
      amountNet:   order.net_amount,
      amountVat:   order.vat_amount,
    })

    // 5. Email до администратора
    await sendEmail('send-admin-notification', {
      orderType,
      orderId:     dbOrderId,
      email:       customerEmail,
      videoTitle,
      amountGross: order.gross_amount,
    })
  })

  console.log(`✅ Order ${dbOrderId} (${orderType}) маркирана като платена.`)
}

// ─── POST /api/stripe/webhook ──────────────────────────────────────────────────
export async function POST(request) {
  const rawBody = await request.text()
  const sig     = request.headers.get('stripe-signature')

  let event

  // ── Verify Stripe signature ────────────────────────────────────────────────
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('❌ Stripe webhook signature failed:', err.message)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  // ── Handle events ──────────────────────────────────────────────────────────
  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object

        if (session.payment_status !== 'paid') {
          console.log(`⏳ Session ${session.id} не е платена още, пропускаме.`)
          break
        }

        const { dbOrderId, orderType } = session.metadata ?? {}

        if (!dbOrderId || !orderType) {
          console.error('❌ Липсва metadata в session:', session.id)
          break
        }

        await handleOrderPaid(session.metadata, session)
        break
      }

      case 'checkout.session.async_payment_succeeded': {
        // Забавени методи на плащане (банков превод и др.)
        const session = event.data.object
        const { dbOrderId, orderType } = session.metadata ?? {}

        if (!dbOrderId || !orderType) {
          console.error('❌ Липсва metadata в async session:', session.id)
          break
        }

        await handleOrderPaid(session.metadata, session)
        break
      }

      case 'checkout.session.async_payment_failed':
      case 'payment_intent.payment_failed': {
        const obj       = event.data.object
        const sessionId = obj.id ?? obj.latest_charge

        await query(
          `UPDATE orders SET status = 'failed' WHERE stripe_session_id = $1`,
          [sessionId]
        )

        console.log(`❌ Неуспешно плащане за session: ${sessionId}`)
        break
      }

      default:
        console.log(`ℹ️ Unhandled event: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (err) {
    console.error('❌ Webhook handler error:', err)
    // Връщаме 200 за да не retry-ва Stripe
    return NextResponse.json(
      { received: true, warning: err.message },
      { status: 200 }
    )
  }
}
