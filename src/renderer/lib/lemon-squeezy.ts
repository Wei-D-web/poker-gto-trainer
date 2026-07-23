/**
 * Lemon Squeezy Client Utilities
 *
 * Handles LS checkout creation via API and direct redirect fallback.
 * Works for both web and Electron.
 *
 * Environment variables:
 *   VITE_LS_STORE_ID  — Lemon Squeezy store ID (numeric)
 *   VITE_LS_API_KEY   — Lemon Squeezy API key (VITE_ prefix = client-safe)
 */

const STORE_ID = import.meta.env.VITE_LS_STORE_ID || ''
const API_KEY = import.meta.env.VITE_LS_API_KEY || ''

/**
 * Get the base URL for Supabase Edge Function calls.
 */
function getBaseUrl(): string {
  return import.meta.env.VITE_SUPABASE_URL || ''
}

/**
 * Create a Lemon Squeezy Checkout and redirect the user.
 *
 * Calls the LS API directly to create a checkout session,
 * then redirects the browser to the LS checkout page.
 *
 * @param variantId — LS Variant ID (e.g. var_xxx)
 * @param tier      — 'pro' | 'lifetime'
 * @param customerEmail — User's email for pre-filling checkout
 * @returns void — redirects browser to LS Checkout
 */
export async function redirectToCheckout(
  variantId: string,
  tier: 'starter' | 'pro' | 'lifetime',
  customerEmail?: string,
): Promise<{ error?: string }> {
  if (!variantId) {
    return { error: 'LS variant ID not configured. Check environment variables.' }
  }

  // ── 1) Primary: LS API → create checkout → redirect ──
  if (STORE_ID && API_KEY) {
    try {
      const body: Record<string, unknown> = {
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              email: customerEmail || undefined,
              custom: {},
            },
            product_options: {
              redirect_url: `${window.location.origin}/app/?ls=success`,
            },
          },
          relationships: {
            store: {
              data: { type: 'stores', id: STORE_ID },
            },
            variant: {
              data: { type: 'variants', id: variantId },
            },
          },
        },
      }

      const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (res.ok && data.data?.attributes?.url) {
        window.location.href = data.data.attributes.url
        return {}
      }

      console.warn('LS API checkout creation failed:', data)
    } catch (err: any) {
      console.warn('LS API unreachable:', err.message)
    }
  }

  // ── 2) Fallback: Supabase Edge Function ──
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
          variantId,
          tier,
          customerEmail,
          successUrl: `${window.location.origin}/app/?ls=success`,
          cancelUrl: `${window.location.origin}/app/?ls=canceled`,
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

  return { error: 'No payment method available' }
}

/**
 * Open Lemon Squeezy customer order lookup.
 *
 * LS doesn't have a Stripe-style Customer Portal. Users manage
 * subscriptions via magic links sent to their email after purchase.
 * This redirects to the LS customer hub where they can look up orders.
 */
export async function redirectToCustomerPortal(_customerId?: string): Promise<{ error?: string }> {
  // LS uses email-based magic links for subscription management.
  // Redirect to the LS store page where users can access their purchases.
  try {
    const baseUrl = getBaseUrl()
    if (baseUrl) {
      const res = await fetch(`${baseUrl}/functions/v1/create-customer-portal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeader()),
        },
        body: JSON.stringify({ customerId: _customerId }),
      })
      const data = await res.json()
      if (res.ok && data.url) {
        window.location.href = data.url
        return {}
      }
    }
  } catch (err: any) {
    console.error('Customer portal error:', err)
  }

  // Fallback: LS does not have a generic customer portal.
  // Tell the user to check their email for subscription management links.
  return { error: '请查看购买确认邮件中的管理链接来管理订阅。Check your purchase confirmation email for subscription management.' }
}

/**
 * Get Supabase auth header from localStorage (web) or electron-store (desktop).
 * Shared utility — also used by other modules.
 */
async function getAuthHeader(): Promise<Record<string, string>> {
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
    if (window.electronAPI?.auth?.getSession) {
      const session = await window.electronAPI.auth.getSession()
      if (session?.session?.access_token) {
        headers['Authorization'] = `Bearer ${session.session.access_token}`
      }
    }
  } catch {}

  return headers
}

/**
 * Lemon Squeezy price variant IDs — configured via environment variables.
 * These are LS Variant IDs (format: var_xxxxxxxx).
 * Create these in Lemon Squeezy Dashboard → Products → Variants.
 */
export const LS_PRICES = {
  starterMonthly: import.meta.env.VITE_LS_STARTER_MONTHLY || '',
  starterYearly: import.meta.env.VITE_LS_STARTER_YEARLY || '',
  proMonthly: import.meta.env.VITE_LS_PRO_MONTHLY || '',
  proYearly: import.meta.env.VITE_LS_PRO_YEARLY || '',
  lifetime: import.meta.env.VITE_LS_LIFETIME || '',
}
