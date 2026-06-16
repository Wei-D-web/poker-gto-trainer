/**
 * Supabase Edge Function: Create Stripe Checkout Session
 *
 * Deploy:
 *   supabase functions deploy create-checkout-session
 *
 * Called by the frontend when a user clicks "Subscribe" / "Upgrade".
 * Creates a Stripe Checkout Session and returns the URL for redirection.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '')
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseKey)

interface RequestBody {
  priceId: string
  tier: 'pro' | 'lifetime'
  customerEmail?: string
  successUrl?: string
  cancelUrl?: string
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  try {
    const body: RequestBody = await req.json()
    const { priceId, tier, customerEmail, successUrl, cancelUrl } = body

    if (!priceId) {
      return jsonResponse(400, { error: 'Missing priceId' })
    }

    // Authenticate user via Authorization header
    let userId: string | undefined
    const authHeader = req.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const { data: { user } } = await supabase.auth.getUser(token)
      userId = user?.id
    }

    // Look up existing Stripe customer ID from profiles
    let stripeCustomerId: string | undefined
    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_customer_id, email')
        .eq('id', userId)
        .single()

      stripeCustomerId = profile?.stripe_customer_id || undefined

      // If no email was passed, use the one from profile
      if (!customerEmail && profile?.email) {
        // profile.email is from the profiles table — use auth user email instead
        const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId)
        // Fallback: try getting from auth
      }
    }

    // Get customer email from auth if available
    if (!customerEmail && userId) {
      try {
        const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId)
        customerEmail = authUser?.email
      } catch {
        // admin API may not be available; continue without email
      }
    }

    // Build checkout session params based on tier type
    const isLifetime = tier === 'lifetime'
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: isLifetime ? 'payment' : 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        user_id: userId || '',
        tier,
      },
      success_url: successUrl || `${req.headers.get('origin') || ''}/?checkout=success&tier=${tier}`,
      cancel_url: cancelUrl || `${req.headers.get('origin') || ''}/?checkout=canceled`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    }

    // Attach customer if we know them
    if (stripeCustomerId) {
      sessionParams.customer = stripeCustomerId
    } else if (customerEmail) {
      sessionParams.customer_email = customerEmail
    }

    // For subscriptions, enable automatic tax and proration
    if (!isLifetime) {
      sessionParams.subscription_data = {
        metadata: {
          user_id: userId || '',
          tier,
        },
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return jsonResponse(200, { url: session.url })
  } catch (err: any) {
    console.error('Create checkout session error:', err)
    return jsonResponse(500, { error: err.message || 'Internal server error' })
  }
})

function jsonResponse(status: number, data: Record<string, unknown>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
