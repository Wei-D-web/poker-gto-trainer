-- ==========================================
-- PokerGTO Trainer — Profiles Table
-- Run in Supabase SQL Editor
-- ==========================================

-- User profiles with subscription tier and LS customer data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  tier TEXT NOT NULL DEFAULT 'free',            -- 'free' | 'pro' | 'lifetime' | 'developer'
  subscription_status TEXT DEFAULT 'inactive',  -- 'active' | 'past_due' | 'paused' | 'canceled' | 'expired' | 'inactive'
  ls_customer_id TEXT,                          -- Lemon Squeezy customer ID
  ls_subscription_id TEXT,                      -- Lemon Squeezy subscription ID
  stripe_customer_id TEXT,                      -- Stripe customer ID (legacy)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_tier ON public.profiles(tier);
CREATE INDEX IF NOT EXISTS idx_profiles_ls_customer ON public.profiles(ls_customer_id);

-- RLS: users can read/update their own profile only
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Everyone can read (for tier checks)
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own non-sensitive fields
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Everyone can insert their own profile on signup
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Edge function bypasses RLS via service_role key, so no admin CRUD policy needed.

-- Trigger: auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, tier, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    'free',
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger: handle_new_user on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
