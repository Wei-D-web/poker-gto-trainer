-- ==========================================
-- PokerGTO Trainer — License Key System
-- Run in Supabase SQL Editor
-- ==========================================

-- License keys table
CREATE TABLE IF NOT EXISTS public.license_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,                        -- e.g. "PGTO-XXXX-XXXX-XXXX"
  tier TEXT NOT NULL DEFAULT 'pro',               -- 'pro' | 'lifetime'
  status TEXT NOT NULL DEFAULT 'active',           -- 'active' | 'used' | 'revoked'
  batch_id TEXT,                                   -- batch identifier for tracking
  created_at TIMESTAMPTZ DEFAULT now(),
  activated_at TIMESTAMPTZ,
  activated_by UUID REFERENCES auth.users(id),     -- who activated it
  activated_email TEXT,                            -- email at activation time
  notes TEXT                                       -- admin notes
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_license_keys_key ON public.license_keys(key);
CREATE INDEX IF NOT EXISTS idx_license_keys_status ON public.license_keys(status);
CREATE INDEX IF NOT EXISTS idx_license_keys_batch ON public.license_keys(batch_id);

-- RLS: only admins can insert/update keys
ALTER TABLE public.license_keys ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (edge functions use service_role key)
-- The edge function will bypass RLS using the service_role key

-- Function: validate and activate a license key
-- Called by the edge function with service_role privileges
CREATE OR REPLACE FUNCTION public.activate_license_key(
  p_key TEXT,
  p_user_id UUID,
  p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_key_record RECORD;
  v_current_tier TEXT;
BEGIN
  -- Find and lock the key
  SELECT * INTO v_key_record
  FROM public.license_keys
  WHERE key = p_key
  FOR UPDATE;

  -- Key not found
  IF v_key_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_KEY',
      'message', '卡密无效，请检查是否输入正确'
    );
  END IF;

  -- Key already used
  IF v_key_record.status = 'used' THEN
    -- If same user activated it, allow re-activation (e.g., reinstall)
    IF v_key_record.activated_by = p_user_id THEN
      RETURN jsonb_build_object(
        'success', true,
        'tier', v_key_record.tier,
        'message', '重新激活成功',
        'reactivated', true
      );
    END IF;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'ALREADY_USED',
      'message', '该卡密已被使用'
    );
  END IF;

  -- Key revoked
  IF v_key_record.status = 'revoked' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'REVOKED',
      'message', '该卡密已被作废'
    );
  END IF;

  -- Check current user tier — don't downgrade
  SELECT tier INTO v_current_tier
  FROM public.profiles
  WHERE id = p_user_id;

  -- Only upgrade, never downgrade
  IF v_current_tier = 'lifetime' THEN
    RETURN jsonb_build_object(
      'success', true,
      'tier', 'lifetime',
      'message', '您已是终身会员，无需再次激活',
      'already_premium', true
    );
  END IF;

  IF v_current_tier = 'pro' AND v_key_record.tier = 'pro' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ALREADY_PRO',
      'message', '您已是 Pro 会员'
    );
  END IF;

  -- Activate the key
  UPDATE public.license_keys
  SET
    status = 'used',
    activated_at = now(),
    activated_by = p_user_id,
    activated_email = p_email
  WHERE id = v_key_record.id;

  -- Upgrade user tier
  UPDATE public.profiles
  SET
    tier = v_key_record.tier,
    updated_at = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'tier', v_key_record.tier,
    'message', CASE
      WHEN v_key_record.tier = 'lifetime' THEN '终身会员激活成功！🎉'
      ELSE 'Pro 会员激活成功！🎉'
    END
  );
END;
$$;

-- Function: generate a batch of license keys (admin only)
CREATE OR REPLACE FUNCTION public.generate_license_keys(
  p_count INTEGER,
  p_tier TEXT DEFAULT 'pro',
  p_prefix TEXT DEFAULT 'PGTO',
  p_batch_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_keys TEXT[] := ARRAY[]::TEXT[];
  v_key TEXT;
  v_batch TEXT;
  i INTEGER;
BEGIN
  v_batch := COALESCE(p_batch_id, 'batch_' || to_char(now(), 'YYYYMMDD_HH24MISS'));

  FOR i IN 1..p_count LOOP
    -- Generate key: PGTO-XXXX-XXXX-XXXX
    v_key := p_prefix || '-' ||
             upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4)) || '-' ||
             upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4)) || '-' ||
             upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4));

    INSERT INTO public.license_keys (key, tier, status, batch_id)
    VALUES (v_key, p_tier, 'active', v_batch);

    v_keys := array_append(v_keys, v_key);
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'batch_id', v_batch,
    'count', p_count,
    'tier', p_tier,
    'keys', v_keys
  );
END;
$$;
