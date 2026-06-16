/**
 * Validate License Key — Supabase Edge Function
 *
 * Deploy:
 *   cd supabase && supabase functions deploy validate-license-key
 *
 * Call from desktop/web to activate a license key and upgrade tier.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '', // service_role bypasses RLS
)

Deno.serve(async (req: Request) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  try {
    const body = await req.json()
    const { key, userId, email } = body

    if (!key || !userId) {
      return respond(400, { success: false, error: 'MISSING_FIELDS', message: '缺少卡密或用户信息' })
    }

    // Validate key format: PGTO-XXXX-XXXX-XXXX
    const keyPattern = /^[A-Z0-9]{4,8}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/
    if (!keyPattern.test(key.toUpperCase())) {
      return respond(400, {
        success: false,
        error: 'INVALID_FORMAT',
        message: '卡密格式不正确，应为 XXXX-XXXX-XXXX-XXXX',
      })
    }

    // Call the database function
    const { data, error } = await supabase.rpc('activate_license_key', {
      p_key: key.toUpperCase(),
      p_user_id: userId,
      p_email: email || '',
    })

    if (error) {
      console.error('RPC error:', error)
      return respond(500, { success: false, error: 'SERVER_ERROR', message: '服务器错误，请稍后重试' })
    }

    return respond(200, data)
  } catch (err) {
    console.error('Unexpected error:', err)
    return respond(500, { success: false, error: 'SERVER_ERROR', message: '服务器错误' })
  }
})

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
