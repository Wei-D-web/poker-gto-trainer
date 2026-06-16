-- ==========================================
-- PokerGTO Trainer — Supabase Database Schema
-- Run this in Supabase SQL Editor
-- ==========================================

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  tier TEXT NOT NULL DEFAULT 'free',        -- 'free', 'pro', 'lifetime'
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT,                  -- 'active', 'canceled', 'past_due'
  subscription_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (for Stripe customer ID, etc)
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, tier)
  VALUES (NEW.id, NEW.email, 'free');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Spot library table (cloud sync for web users)
CREATE TABLE IF NOT EXISTS public.spots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL DEFAULT 'Untitled Spot',
  category TEXT DEFAULT 'General',
  game_type TEXT NOT NULL,
  hero_position INTEGER NOT NULL,
  villain_position INTEGER NOT NULL,
  stack_depth INTEGER NOT NULL,
  board TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.spots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own spots"
  ON public.spots FOR ALL
  USING (auth.uid() = user_id);

-- Progress history
CREATE TABLE IF NOT EXISTS public.progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  hands_played INTEGER DEFAULT 0,
  avg_grade TEXT,
  avg_ev_lost REAL DEFAULT 0,
  win_rate REAL DEFAULT 0,
  UNIQUE(user_id, date)
);

ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own progress"
  ON public.progress FOR ALL
  USING (auth.uid() = user_id);
