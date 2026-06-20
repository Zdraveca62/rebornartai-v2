// app/api/stripe/checkout/route.js
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Service role за сървърни операции
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(req) {
  try {
    const body = await req.json()
    const { type, userId, userEmail, sceneId, photoPath, locale } = body

    // --- Валидация ---
    if (!type || !userId || !userEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const isPreview = type === 'preview'

    // --- Stripe продукт ---
    const lineItems = isPreview
      ? [{
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'AI Video Preview',
              description: `Scene: ${sceneId}`,
            },
            unit_amount: 280, // €2.80
          },
          quantity: 1,
        }]
      : [{
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'AI Video Full Order',
              description: 'Full HD AI personalized video',
            },
            unit_amount: 2900, // €29.00 — смени по нужда
          },
          quantity: 1,
        }]

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
    const localePath = locale === 'bg' ? '' : `/${locale}`

    // --- Създаваме Checkout Session ---
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: userEmail,
      line_items: lineItems,
      metadata: {
        type,
        userId,
        sceneId: sceneId || '',
        photoPath: photoPath || '',
        locale,
      },
      success_url: `${baseUrl}${localePath}/${isPreview ? 'order-preview' : 'full-order'}?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}${localePath}/${isPreview ? 'order-preview' : 'full-order'}?cancelled=true`,
      // Автоматична Stripe фактура (само receipt за preview)
      invoice_creation: isPreview ? undefined : { enabled: true },
    })

    // --- Записваме pending order в Supabase ---
    if (isPreview) {
      const { error } = await supabase
        .from('preview_orders')
        .insert({
          user_id: userId,
          stripe_session_id: session.id,
          scene_id: sceneId,
          photo_path: photoPath,
          status: 'pending',
          amount: 280,
          currency: 'eur',
        })

      if (error) console.error('Supabase preview_orders insert error:', error)
    } else {
      const { error } = await supabase
        .from('full_orders')
        .insert({
          user_id: userId,
          stripe_session_id: session.id,
          status: 'pending',
          amount: 2900,
          currency: 'eur',
        })

      if (error) console.error('Supabase full_orders insert error:', error)
    }

    return NextResponse.json({ sessionUrl: session.url })

  } catch (err) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

