// app/api/stripe/checkout/route.js
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { query } from '@/lib/db'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
})

// ─── POST /api/stripe/checkout ────────────────────────────────────────────────
export async function POST(req) {
  try {
    const body = await req.json()
    const {
      orderType,      // 'preview' | 'full'
      userId,         // UUID от registrations
      userEmail,      // за Stripe customer_email
      youtubeId,      // избраното видео/песен
      itemType,       // 'song' | 'video'
      category,       // за full orders: 'birthday', 'wedding', итн.
      parentOrderId,  // за full orders: UUID на preview поръчката
      locale,         // 'bg' | 'en'
      notes,          // допълнителни забележки (само за full)
    } = body

    // ── Валидация ──────────────────────────────────────────────────────────
    if (!orderType || !userId || !userEmail || !youtubeId || !itemType) {
      return NextResponse.json(
        { error: 'Липсват задължителни полета: orderType, userId, userEmail, youtubeId, itemType' },
        { status: 400 }
      )
    }

    if (!['preview', 'full'].includes(orderType)) {
      return NextResponse.json({ error: 'orderType трябва да е preview или full' }, { status: 400 })
    }

    if (orderType === 'full' && !parentOrderId) {
      return NextResponse.json(
        { error: 'Full поръчката изисква parentOrderId (UUID на preview поръчката)' },
        { status: 400 }
      )
    }

    // ── Вземаме duration_seconds от youtube_cache ──────────────────────────
    const cacheRes = await query(
      `SELECT duration_seconds, title FROM youtube_cache WHERE youtube_id = $1`,
      [youtubeId]
    )

    if (cacheRes.rowCount === 0) {
      return NextResponse.json(
        { error: `youtube_id "${youtubeId}" не е намерен в youtube_cache` },
        { status: 400 }
      )
    }

    const { duration_seconds, title: videoTitle } = cacheRes.rows[0]

    if (!duration_seconds) {
      return NextResponse.json(
        { error: 'Дължината на видеото все още не е заредена. Опитай след малко.' },
        { status: 400 }
      )
    }

    // ── Изчисляване на цената ──────────────────────────────────────────────
    // Preview: фиксирана €2.80
    // Full: duration_seconds / 60 * €80 (цена на минута без ДДС) * 1.23 (ДДС)
    // gross_amount е крайната сума С ДДС
    let grossAmountEur
    let durationForOrder

    if (orderType === 'preview') {
      grossAmountEur   = 2.80
      durationForOrder = 10  // preview винаги е 10 сек
    } else {
      durationForOrder = duration_seconds
      const minutes    = duration_seconds / 60
      const netAmount  = minutes * 80          // €80/мин без ДДС
      grossAmountEur   = Math.round(netAmount * 1.23 * 100) / 100  // с ДДС, закръглено
    }

    const grossAmountCents = Math.round(grossAmountEur * 100)  // за Stripe (в центове)

    // ── Stripe line items ──────────────────────────────────────────────────
    const lineItems = [{
      price_data: {
        currency: 'eur',
        product_data: {
          name: orderType === 'preview'
            ? `AI Видео — Преглед: ${videoTitle}`
            : `AI Видео — Пълна версия: ${videoTitle}`,
          description: orderType === 'preview'
            ? '10-секунден персонализиран преглед'
            : `Пълна версия (${Math.round(duration_seconds / 60 * 10) / 10} мин)`,
        },
        unit_amount: grossAmountCents,
      },
      quantity: 1,
    }]

    const baseUrl    = process.env.NEXT_PUBLIC_SITE_URL
    const localePath = locale && locale !== 'bg' ? `/${locale}` : ''

    // ── Създаваме pending order в DB ПРЕДИ Stripe ──────────────────────────
    const insertRes = await query(
      `INSERT INTO orders
         (user_id, order_type, parent_order_id, youtube_id, item_type,
          category, duration_seconds, gross_amount, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
       RETURNING id`,
      [
        userId,
        orderType,
        parentOrderId ?? null,
        youtubeId,
        itemType,
        category ?? null,
        durationForOrder,
        grossAmountEur,
        notes ?? null,
      ]
    )

    if (insertRes.rowCount === 0) {
      throw new Error('orders insert върна 0 реда')
    }

    const dbOrderId = insertRes.rows[0].id

    // ── Stripe Checkout Session ────────────────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: userEmail,
      line_items: lineItems,
      metadata: {
        orderType,
        dbOrderId,
        userId,
        youtubeId,
        locale: locale ?? 'bg',
      },
      success_url: `${baseUrl}${localePath}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${baseUrl}${localePath}/order-cancel`,
    })

    // ── Update order с stripe_session_id ──────────────────────────────────
    await query(
      `UPDATE orders SET stripe_session_id = $1 WHERE id = $2`,
      [session.id, dbOrderId]
    )

    return NextResponse.json({
      sessionUrl: session.url,
      dbOrderId,
      grossAmount: grossAmountEur,
    })

  } catch (err) {
    console.error('❌ Stripe checkout error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
