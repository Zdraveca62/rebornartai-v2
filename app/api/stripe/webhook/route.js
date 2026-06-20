import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ─── Raw body needed for Stripe signature verification ─────────────────────────
export const config = {
  api: { bodyParser: false },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate a signed GCS download URL (24h expiry, max 3 requests tracked)
 * Replace this with your actual GCS signed URL logic.
 */
async function generateGCSLink(orderId) {
  // TODO: integrate with @google-cloud/storage
  // Example:
  // const [url] = await storage
  //   .bucket(process.env.GCS_BUCKET)
  //   .file(`orders/${orderId}/final.mp4`)
  //   .getSignedUrl({ action: 'read', expires: Date.now() + 24 * 60 * 60 * 1000 })
  // return url

  // Placeholder — replace with real GCS signed URL
  return `https://storage.googleapis.com/${process.env.GCS_BUCKET}/orders/${orderId}/final.mp4?signed=placeholder`
}

/**
 * Call our internal email API routes
 */
async function sendEmail(route, payload) {
  const base = process.env.NEXT_PUBLIC_APP_URL
  const res = await fetch(`${base}/api/email/${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Email route /api/email/${route} failed: ${text}`)
  }
  return res.json()
}

// ─── Event handlers ────────────────────────────────────────────────────────────

async function handlePreviewPaid(metadata, session) {
  const { dbOrderId, userId, invoiceNumber, locale } = metadata

  // 1. Update preview_orders → paid
  const { error: updateError } = await supabase
    .from('preview_orders')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      stripe_payment_intent: session.payment_intent,
    })
    .eq('id', dbOrderId)

  if (updateError) throw new Error(`preview_orders update failed: ${updateError.message}`)

  // 2. Fetch order details for email
  const { data: order } = await supabase
    .from('preview_orders')
    .select('*, profiles(email, full_name)')
    .eq('id', dbOrderId)
    .single()

  // 3. Send receipt email (no invoice PDF for preview)
  await sendEmail('send-receipt', {
    orderType: 'preview',
    orderId: dbOrderId,
    invoiceNumber,
    userId,
    locale,
    email: order?.profiles?.email ?? session.customer_email,
    fullName: order?.profiles?.full_name ?? '',
    amountGross: order?.amount_gross,
    amountNet: order?.amount_net,
    amountVat: order?.amount_vat,
  })

  // 4. Notify admin
  await sendEmail('send-admin-notification', {
    orderType: 'preview',
    orderId: dbOrderId,
    invoiceNumber,
    email: order?.profiles?.email,
    amountGross: order?.amount_gross,
  })

  console.log(`✅ Preview order ${dbOrderId} marked paid. Invoice: ${invoiceNumber}`)
}

async function handleFullOrderPaid(metadata, session) {
  const { dbOrderId, userId, invoiceNumber, locale } = metadata

  // 1. Update full_orders → paid
  const { error: updateError } = await supabase
    .from('full_orders')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      stripe_payment_intent: session.payment_intent,
    })
    .eq('id', dbOrderId)

  if (updateError) throw new Error(`full_orders update failed: ${updateError.message}`)

  // 2. Generate GCS signed download link (24h, tracked)
  const gcsLink = await generateGCSLink(dbOrderId)

  // 3. Save download link + request count in client_downloads
  const { error: dlError } = await supabase
    .from('client_downloads')
    .insert({
      user_id: userId,
      full_order_id: dbOrderId,
      download_url: gcsLink,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      request_count: 0,
      max_requests: 3,
    })

  if (dlError) throw new Error(`client_downloads insert failed: ${dlError.message}`)

  // 4. Fetch order details for email
  const { data: order } = await supabase
    .from('full_orders')
    .select('*, profiles(email, full_name)')
    .eq('id', dbOrderId)
    .single()

  const customerEmail = order?.profiles?.email ?? session.customer_email
  const customerName = order?.profiles?.full_name ?? ''

  // 5. Create invoice record in invoices table
  const invoiceFileName = `IPG-${invoiceNumber}.pdf`
  const { error: invError } = await supabase
    .from('invoices')
    .insert({
      full_order_id: dbOrderId,
      user_id: userId,
      invoice_number: invoiceNumber,
      file_name: invoiceFileName,
      amount_gross: order?.amount_gross,
      amount_net: order?.amount_net,
      amount_vat: order?.amount_vat,
      issued_at: new Date().toISOString(),
    })

  if (invError) throw new Error(`invoices insert failed: ${invError.message}`)

  // 6. Send invoice email with download link
  await sendEmail('send-invoice', {
    orderId: dbOrderId,
    invoiceNumber,
    invoiceFileName,
    userId,
    locale,
    email: customerEmail,
    fullName: customerName,
    amountGross: order?.amount_gross,
    amountNet: order?.amount_net,
    amountVat: order?.amount_vat,
    downloadUrl: gcsLink,
    productName: order?.product_name,
  })

  // 7. Notify admin
  await sendEmail('send-admin-notification', {
    orderType: 'full',
    orderId: dbOrderId,
    invoiceNumber,
    email: customerEmail,
    amountGross: order?.amount_gross,
    downloadUrl: gcsLink,
  })

  console.log(`✅ Full order ${dbOrderId} paid. Invoice: ${invoiceNumber}. GCS link generated.`)
}

// ─── POST /api/stripe/webhook ──────────────────────────────────────────────────
export async function POST(request) {
  const rawBody = await request.text()
  const sig = request.headers.get('stripe-signature')

  let event

  // ── Verify Stripe signature ────────────────────────────────────────────────
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('❌ Stripe webhook signature verification failed:', err.message)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  // ── Handle events ──────────────────────────────────────────────────────────
  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object

        // Only process paid sessions (not pending bank transfers etc.)
        if (session.payment_status !== 'paid') {
          console.log(`⏳ Session ${session.id} not yet paid, skipping.`)
          break
        }

        const { orderType, dbOrderId, invoiceNumber, userId, locale } = session.metadata ?? {}

        if (!orderType || !dbOrderId) {
          console.error('❌ Missing metadata in session:', session.id)
          break
        }

        if (orderType === 'preview') {
          await handlePreviewPaid(session.metadata, session)
        } else if (orderType === 'full') {
          await handleFullOrderPaid(session.metadata, session)
        }

        break
      }

      case 'checkout.session.async_payment_succeeded': {
        // Handle delayed payment methods (bank transfers, etc.)
        const session = event.data.object
        const { orderType } = session.metadata ?? {}

        if (orderType === 'preview') {
          await handlePreviewPaid(session.metadata, session)
        } else if (orderType === 'full') {
          await handleFullOrderPaid(session.metadata, session)
        }

        break
      }

      case 'checkout.session.async_payment_failed':
      case 'payment_intent.payment_failed': {
        const obj = event.data.object
        const sessionId = obj.id ?? obj.latest_charge

        // Update both tables — whichever has this session
        await supabase
          .from('preview_orders')
          .update({ status: 'failed' })
          .eq('stripe_session_id', sessionId)

        await supabase
          .from('full_orders')
          .update({ status: 'failed' })
          .eq('stripe_session_id', sessionId)

        console.log(`❌ Payment failed for session: ${sessionId}`)
        break
      }

      default:
        // Ignore unhandled event types
        console.log(`ℹ️ Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (err) {
    console.error('❌ Webhook handler error:', err)
    // Return 200 so Stripe doesn't retry — log the error internally
    return NextResponse.json(
      { received: true, warning: err.message },
      { status: 200 }
    )
  }
}