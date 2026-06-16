/**
 * Stripe Webhook Handler — Supabase Edge Function
 *
 * Deploy to Supabase:
 *   supabase functions deploy stripe-webhook
 *
 * Handles the full subscription lifecycle:
 *   - checkout.session.completed  → activate subscription
 *   - customer.subscription.updated → sync status changes
 *   - customer.subscription.deleted → downgrade to free
 *   - invoice.paid                 → record payment
 *   - invoice.payment_failed       → flag payment issue
 *
 * Set STRIPE_WEBHOOK_SECRET in Supabase secrets.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '')
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
)

const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''

Deno.serve(async (req: Request) => {
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    console.warn('⚠️ No stripe-signature header')
    return new Response('No signature', { status: 400 })
  }

  try {
    const body = await req.text()
    const event = stripe.webhooks.constructEvent(body, signature, endpointSecret)

    console.log(`📨 Stripe event: ${event.type}`)

    switch (event.type) {
      // ── Checkout completed (new subscription or one-time payment) ──
      case 'checkout.session.completed': {
        await handleCheckoutCompleted(event.data.object)
        break
      }

      // ── Subscription lifecycle ──
      case 'customer.subscription.created': {
        await handleSubscriptionChange(event.data.object, 'active')
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object
        const status = sub.status === 'active' ? 'active'
          : sub.status === 'past_due' ? 'past_due'
          : sub.status === 'unpaid' ? 'unpaid'
          : sub.status === 'canceled' ? 'canceled'
          : 'inactive'
        await handleSubscriptionChange(sub, status)
        break
      }

      case 'customer.subscription.deleted': {
        await handleSubscriptionCanceled(event.data.object)
        break
      }

      // ── Payment events ──
      case 'invoice.paid': {
        await handleInvoicePaid(event.data.object)
        break
      }

      case 'invoice.payment_failed': {
        await handleInvoiceFailed(event.data.object)
        break
      }

      default:
        console.log(`ℹ️ Unhandled event: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('❌ Webhook error:', err.message)
    return new Response(`Webhook error: ${err.message}`, { status: 400 })
  }
})

// ─── Handlers ───────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const customerEmail = session.customer_details?.email
  const customerId = session.customer as string
  const tier = session.metadata?.tier || 'pro'
  const userId = session.metadata?.user_id

  if (!customerEmail && !userId) {
    console.warn('⚠️ No email or user_id in checkout session')
    return
  }

  // Find user — prefer metadata user_id, fallback to email
  let profile: any = null

  if (userId) {
    const { data } = await supabase.from('profiles').select('id, email').eq('id', userId).single()
    profile = data
  }

  if (!profile && customerEmail) {
    const { data } = await supabase.from('profiles').select('id, email').eq('email', customerEmail)
    if (data?.length) profile = data[0]
  }

  if (!profile) {
    console.warn(`⚠️ No profile found for email=${customerEmail} user_id=${userId}`)
    return
  }

  // Update profile with tier and Stripe customer ID
  const updates: Record<string, any> = {
    tier,
    stripe_customer_id: customerId,
    subscription_status: 'active',
    updated_at: new Date().toISOString(),
  }

  if (session.subscription) {
    updates.stripe_subscription_id = session.subscription as string
  }

  const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id)

  if (error) {
    console.error('❌ Failed to update profile:', error.message)
  } else {
    console.log(`✅ Upgraded ${profile.email || profile.id} to ${tier}`)
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription, status: string) {
  const customerId = subscription.customer as string
  const tier = subscription.metadata?.tier || 'pro'

  // Find profile by Stripe customer ID
  const { data: users } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('stripe_customer_id', customerId)

  if (!users?.length) {
    console.warn(`⚠️ No profile for Stripe customer ${customerId}`)
    return
  }

  const isCanceled = subscription.cancel_at_period_end

  const updates: Record<string, any> = {
    subscription_status: status,
    stripe_subscription_id: subscription.id,
    updated_at: new Date().toISOString(),
  }

  // If canceled but still active (will end at period end), keep tier
  // If fully canceled/unpaid, downgrade
  if (status === 'canceled' || status === 'unpaid') {
    updates.tier = 'free'
    updates.subscription_status = status
  } else if (isCanceled) {
    updates.subscription_status = 'cancel_at_period_end'
    // Tier stays until period ends
  }

  const { error } = await supabase.from('profiles').update(updates).eq('id', users[0].id)

  if (error) {
    console.error('❌ Failed to update subscription:', error.message)
  } else {
    console.log(`🔄 Subscription ${status} for ${users[0].email}: tier=${updates.tier || tier}`)
  }
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  const { data: users } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('stripe_customer_id', customerId)

  if (!users?.length) {
    console.warn(`⚠️ No profile for Stripe customer ${customerId}`)
    return
  }

  const { error } = await supabase.from('profiles').update({
    tier: 'free',
    subscription_status: 'canceled',
    stripe_subscription_id: null,
    updated_at: new Date().toISOString(),
  }).eq('id', users[0].id)

  if (error) {
    console.error('❌ Failed to downgrade:', error.message)
  } else {
    console.log(`⬇️ Downgraded ${users[0].email} to free (subscription deleted)`)
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string

  // Only record subscription payments (not one-off invoices)
  if (!invoice.subscription) return

  const { data: users } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)

  if (!users?.length) return

  // Record payment in Supabase (if you add a payments table)
  // For now, just log it
  console.log(`💰 Invoice paid: $${(invoice.amount_paid / 100).toFixed(2)} for customer ${customerId}`)

  // Optional: update last_payment_date on profile
  await supabase.from('profiles').update({
    updated_at: new Date().toISOString(),
  }).eq('id', users[0].id)
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string

  console.warn(`❌ Payment failed for customer ${customerId}: $${(invoice.amount_due / 100).toFixed(2)}`)

  // Optional: notify user, update status, etc.
}
