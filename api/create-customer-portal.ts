/**
 * Supabase Edge Function: Create Stripe Customer Portal Session
 *
 * Deploy:
 *   supabase functions deploy create-customer-portal
 *
 * Redirects users to Stripe Customer Portal for managing subscriptions.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '')
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseKey)

interface RequestBody {
  customerId?: string
  returnUrl?: string
}

Deno.serve(async (req: Request) => {
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
    const { customerId, returnUrl } = body

    let stripeCustomerId = customerId

    // If no customerId provided, look it up from the authenticated user
    if (!stripeCustomerId) {
      const authHeader = req.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1]
        const { data: { user } } = await supabase.auth.getUser(token)

        if (user?.id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('stripe_customer_id')
            .eq('id', user.id)
            .single()

          stripeCustomerId = profile?.stripe_customer_id || undefined
        }
      }
    }

    if (!stripeCustomerId) {
      return jsonResponse(400, { error: 'No Stripe customer found. Please subscribe first.' })
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl || `${req.headers.get('origin') || ''}/`,
    })

    return jsonResponse(200, { url: portalSession.url })
  } catch (err: any) {
    console.error('Customer portal error:', err)
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
