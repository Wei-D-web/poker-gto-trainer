/**
 * Stripe Client Utilities
 *
 * Handles Stripe.js loading (singleton), Checkout Session creation,
 * and Customer Portal redirect. Works for both web and Electron.
 */
import { loadStripe, type Stripe } from '@stripe/stripe-js'

let stripePromise: Promise<Stripe | null> | null = null

const PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''

/**
 * Get or create the Stripe.js singleton.
 * Returns null if no publishable key is configured (graceful degradation).
 */
export function getStripe(): Promise<Stripe | null> {
  if (!PUBLISHABLE_KEY) {
    console.warn('Stripe: VITE_STRIPE_PUBLISHABLE_KEY not set')
    return Promise.resolve(null)
  }
  if (!stripePromise) {
    stripePromise = loadStripe(PUBLISHABLE_KEY)
  }
  return stripePromise
}

/**
 * Get the base URL for API calls.
 * In Electron, we need an absolute URL. In web, relative URLs work.
 */
function getBaseUrl(): string {
  // Always use Supabase URL for Edge Functions
  return import.meta.env.VITE_SUPABASE_URL || ''
}

/**
 * Create a Stripe Checkout Session and redirect the user to Stripe.
 *
 * Calls the Supabase Edge Function that creates the session server-side.
 *
 * @param priceId    — Stripe Price ID (e.g. price_xxx)
 * @param tier       — 'pro' | 'lifetime'
 * @param customerEmail — User's email for pre-filling Stripe checkout
 * @returns void — redirects browser to Stripe Checkout
 */
export async function redirectToCheckout(
  priceId: string,
  tier: 'pro' | 'lifetime',
  _customerEmail?: string,
): Promise<{ error?: string }> {
  // 1) Client-side Stripe.js redirectToCheckout — no server needed
  try {
    const stripe = await getStripe()
    if (stripe) {
      const { error } = await stripe.redirectToCheckout({
        lineItems: [{ price: priceId, quantity: 1 }],
        mode: tier === 'lifetime' ? 'payment' : 'subscription',
        successUrl: `${window.location.origin}/app/?stripe=success`,
        cancelUrl: `${window.location.origin}/app/?stripe=canceled`,
        customerEmail: _customerEmail,
      })
      if (!error) return {}
      console.warn('Stripe.js redirectToCheckout failed:', error.message)
    }
  } catch (err: any) {
    console.warn('Stripe.js redirectToCheckout error:', err.message)
  }

  // 2) Fallback: Supabase Edge Function
  const baseUrl = getBaseUrl()
  if (baseUrl) {
    try {
      const res = await fetch(`${baseUrl}/functions/v1/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeader()),
        },
        body: JSON.stringify({
          priceId,
          tier,
          customerEmail: _customerEmail,
          successUrl: `${window.location.origin}/app/?stripe=success`,
          cancelUrl: `${window.location.origin}/app/?stripe=canceled`,
        }),
      })
      const data = await res.json()
      if (res.ok && data.url) {
        window.location.href = data.url
        return {}
      }
      console.warn('Edge Function checkout failed:', data.error)
    } catch (err: any) {
      console.warn('Edge Function unreachable:', err.message)
    }
  }

  // 3) Last resort: Payment Link URL
  const priceToLink: Record<string, string> = {
    [import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY || '']: import.meta.env.VITE_STRIPE_LINK_PRO_MONTHLY || '',
    [import.meta.env.VITE_STRIPE_PRICE_PRO_YEARLY || '']: import.meta.env.VITE_STRIPE_LINK_PRO_YEARLY || '',
    [import.meta.env.VITE_STRIPE_PRICE_LIFETIME || '']: import.meta.env.VITE_STRIPE_LINK_LIFETIME || '',
  }
  const link = priceToLink[priceId]
  if (link) {
    window.location.href = link
    return {}
  }

  return { error: 'No payment method available' }
}

/**
 * Redirect to Stripe Customer Portal for subscription management.
 *
 * @param customerId — Stripe customer ID (stored in Supabase profiles)
 * @returns void — redirects browser to Customer Portal
 */
export async function redirectToCustomerPortal(customerId?: string): Promise<{ error?: string }> {
  try {
    const baseUrl = getBaseUrl()
    const returnUrl = `${window.location.origin}/?portal=return`
    const functionUrl = `${baseUrl}/functions/v1/create-customer-portal`

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(await getAuthHeader()),
      },
      body: JSON.stringify({
        customerId,
        returnUrl,
      }),
    })

    const data = await response.json()

    if (!response.ok || !data.url) {
      return { error: data.error || 'Failed to open customer portal' }
    }

    window.location.href = data.url
    return {}
  } catch (err: any) {
    console.error('Customer portal error:', err)
    return { error: err.message || 'Network error' }
  }
}

/**
 * Get Supabase auth header from localStorage (web) or electron-store (desktop).
 */
async function getAuthHeader(): Promise<Record<string, string>> {
  // Always include Supabase anon key (required for Edge Functions gateway)
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
  const headers: Record<string, string> = {}
  if (anonKey) {
    headers['Authorization'] = `Bearer ${anonKey}`
    headers['apikey'] = anonKey
  }

  // Override Authorization with real user JWT if logged in
  try {
    const sbToken = localStorage.getItem('sb-token')
    if (sbToken) {
      const parsed = JSON.parse(sbToken)
      if (parsed?.access_token) {
        headers['Authorization'] = `Bearer ${parsed.access_token}`
      }
    }
  } catch {}

  try {
    if ((window as any).electronAPI?.auth?.getSession) {
      const session = await (window as any).electronAPI.auth.getSession()
      if (session?.session?.access_token) {
        headers['Authorization'] = `Bearer ${session.session.access_token}`
      }
    }
  } catch {}

  return headers
}

/**
 * Stripe Price IDs — configured via environment variables.
 * These are the Stripe Price IDs (not Product IDs).
 * Create these in Stripe Dashboard → Products → Pricing.
 */
export const STRIPE_PRICES = {
  proMonthly: import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY || '',
  proYearly: import.meta.env.VITE_STRIPE_PRICE_PRO_YEARLY || '',
  lifetime: import.meta.env.VITE_STRIPE_PRICE_LIFETIME || '',
}
