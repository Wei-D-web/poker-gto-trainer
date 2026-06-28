/**
 * Lemon Squeezy Webhook Handler — Supabase Edge Function
 *
 * Deploy to Supabase:
 *   supabase functions deploy ls-webhook
 *
 * Handles the full subscription lifecycle:
 *   - order_created              → activate license (one-time) / initial subscription
 *   - subscription_created       → set tier to pro
 *   - subscription_updated       → sync status changes
 *   - subscription_cancelled     → downgrade to free
 *   - subscription_expired       → downgrade to free
 *   - subscription_payment_success → extend subscription
 *
 * Set LS_WEBHOOK_SECRET in Supabase secrets (from LS Dashboard → Settings → Webhooks).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
)

const webhookSecret = Deno.env.get('LS_WEBHOOK_SECRET') || ''

// ─── Helpers ───────────────────────────────────────────────

/**
 * Verify the Lemon Squeezy webhook signature.
 * LS sends an HMAC-SHA256 hex digest in the X-Signature header.
 */
async function verifySignature(body: string, signature: string): Promise<boolean> {
  if (!webhookSecret) {
    console.warn('⚠️ LS_WEBHOOK_SECRET not set — skipping signature verification')
    return true // Allow in dev if not configured
  }

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')

  return hex === signature
}

/**
 * Find a user profile by email or custom user_id metadata.
 */
async function findProfile(email?: string, userId?: string): Promise<{ id: string; email?: string } | null> {
  if (userId) {
    const { data } = await supabase.from('profiles').select('id, email').eq('id', userId).single()
    if (data) return data
  }
  if (email) {
    const { data } = await supabase.from('profiles').select('id, email').eq('email', email)
    if (data?.length) return data[0]
  }
  return null
}

/**
 * Convert tier string to db value.
 */
function normalizeTier(variantName: string): string {
  const lower = variantName.toLowerCase()
  if (lower.includes('lifetime') || lower.includes('终身')) return 'lifetime'
  if (lower.includes('pro') || lower.includes('monthly') || lower.includes('yearly')) return 'pro'
  return 'pro'
}

// ─── Main Handler ──────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Signature',
      },
    })
  }

  const signature = req.headers.get('x-signature') || ''
  if (!signature) {
    console.warn('⚠️ No X-Signature header')
    return new Response('No signature', { status: 400 })
  }

  try {
    const body = await req.text()
    const isValid = await verifySignature(body, signature)
    if (!isValid) {
      console.error('❌ Invalid webhook signature')
      return new Response('Invalid signature', { status: 401 })
    }

    const event = JSON.parse(body)
    const eventName = event.meta?.event_name || 'unknown'

    console.log(`📨 LS event: ${eventName}`)

    switch (eventName) {
      // ── Order created (one-time purchase or subscription first payment) ──
      case 'order_created': {
        await handleOrderCreated(event.data)
        break
      }

      // ── Subscription lifecycle ──
      case 'subscription_created': {
        await handleSubscriptionChange(event.data, 'active')
        break
      }

      case 'subscription_updated': {
        const status = event.data.attributes.status === 'active' ? 'active'
          : event.data.attributes.status === 'past_due' ? 'past_due'
          : event.data.attributes.status === 'paused' ? 'paused'
          : 'inactive'
        await handleSubscriptionChange(event.data, status)
        break
      }

      case 'subscription_cancelled': {
        await handleSubscriptionEnded(event.data, 'canceled')
        break
      }

      case 'subscription_expired': {
        await handleSubscriptionEnded(event.data, 'expired')
        break
      }

      case 'subscription_payment_success': {
        await handlePaymentSuccess(event.data)
        break
      }

      case 'subscription_payment_failed': {
        console.warn(`❌ Payment failed for subscription ${event.data.id}`)
        break
      }

      default:
        console.log(`ℹ️ Unhandled event: ${eventName}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err: any) {
    console.error('❌ Webhook error:', err.message)
    return new Response(`Webhook error: ${err.message}`, { status: 400 })
  }
})

// ─── Event Handlers ────────────────────────────────────────

async function handleOrderCreated(data: any) {
  const attrs = data.attributes
  const email = attrs.user_email || attrs.customer_email
  const userId = attrs.user_data?.custom?.user_id
  const variantName = attrs.first_order_item?.variant_name || ''
  const tier = normalizeTier(variantName)

  const profile = await findProfile(email, userId)
  if (!profile) {
    console.warn(`⚠️ No profile found for email=${email} user_id=${userId}`)
    return
  }

  const isSubscription = !!attrs.first_order_item?.subscription_id

  const updates: Record<string, any> = {
    tier,
    subscription_status: isSubscription ? 'active' : tier === 'lifetime' ? 'active' : 'inactive',
    updated_at: new Date().toISOString(),
  }

  if (attrs.customer_id) {
    updates.ls_customer_id = String(attrs.customer_id)
  }
  if (attrs.first_order_item?.subscription_id) {
    updates.ls_subscription_id = String(attrs.first_order_item.subscription_id)
  }

  const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id)

  if (error) {
    console.error('❌ Failed to update profile:', error.message)
  } else {
    console.log(`✅ Upgraded ${profile.email || profile.id} to ${tier} (${isSubscription ? 'subscription' : 'one-time'})`)
  }
}

async function handleSubscriptionChange(data: any, status: string) {
  const attrs = data.attributes
  const customerId = String(attrs.customer_id)
  const variantName = attrs.variant_name || ''
  const tier = normalizeTier(variantName)

  // Find profile by LS customer ID
  const { data: users } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('ls_customer_id', customerId)

  if (!users?.length) {
    console.warn(`⚠️ No profile for LS customer ${customerId}`)
    return
  }

  const endsAt = attrs.ends_at
  const isEnding = endsAt && new Date(endsAt).getTime() < Date.now() + 86400000 // within 24h

  const updates: Record<string, any> = {
    subscription_status: status,
    ls_subscription_id: String(data.id),
    updated_at: new Date().toISOString(),
  }

  // Downgrade if fully canceled/expired
  if (status === 'canceled' || status === 'expired' || status === 'paused') {
    updates.tier = 'free'
  } else if (status === 'past_due') {
    // Keep tier but mark payment issue
    updates.subscription_status = 'past_due'
  }

  const { error } = await supabase.from('profiles').update(updates).eq('id', users[0].id)

  if (error) {
    console.error('❌ Failed to update subscription:', error.message)
  } else {
    console.log(`🔄 Subscription ${status} for ${users[0].email}: tier=${updates.tier || tier}`)
  }
}

async function handleSubscriptionEnded(data: any, reason: string) {
  const attrs = data.attributes
  const customerId = String(attrs.customer_id)

  const { data: users } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('ls_customer_id', customerId)

  if (!users?.length) {
    console.warn(`⚠️ No profile for LS customer ${customerId}`)
    return
  }

  const { error } = await supabase.from('profiles').update({
    tier: 'free',
    subscription_status: reason,
    ls_subscription_id: null,
    updated_at: new Date().toISOString(),
  }).eq('id', users[0].id)

  if (error) {
    console.error('❌ Failed to downgrade:', error.message)
  } else {
    console.log(`⬇️ Downgraded ${users[0].email} to free (${reason})`)
  }
}

async function handlePaymentSuccess(data: any) {
  const attrs = data.attributes
  const customerId = String(attrs.customer_id)

  const { data: users } = await supabase
    .from('profiles')
    .select('id')
    .eq('ls_customer_id', customerId)

  if (!users?.length) return

  await supabase.from('profiles').update({
    updated_at: new Date().toISOString(),
  }).eq('id', users[0].id)

  console.log(`💰 Payment success for LS customer ${customerId}`)
}
