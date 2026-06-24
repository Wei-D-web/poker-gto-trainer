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

-- ============================================================
-- Preset Strategies — Pre-computed GTO strategies for 50 flop textures
-- Readable by all users (including anonymous), writable only by service_role.
-- ============================================================

-- Preset strategy metadata (one row per scenario)
CREATE TABLE IF NOT EXISTS public.preset_strategies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board TEXT NOT NULL,                          -- e.g. "As 7d 2c"
  texture TEXT NOT NULL,                        -- e.g. "ace-high-dry"
  hero_position INTEGER NOT NULL,               -- 0=UTG, 1=MP, 2=CO, 3=BTN
  villain_position INTEGER NOT NULL,            -- e.g. 5=BB
  stack_depth INTEGER NOT NULL DEFAULT 100,     -- in big blinds
  game_type TEXT NOT NULL DEFAULT 'cash',       -- 'cash' | 'tournament'
  description TEXT DEFAULT '',                  -- e.g. "A72 rainbow — classic dry A-high"
  hero_ev REAL DEFAULT 0,
  villain_ev REAL DEFAULT 0,
  hero_equity REAL DEFAULT 0,
  recommended_sizing TEXT DEFAULT '',           -- e.g. "33%", "50%", "75%"
  overall_cbet_freq REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(board, hero_position, villain_position, stack_depth, game_type)
);

-- Per-combo strategy actions (one row per combo per strategy)
CREATE TABLE IF NOT EXISTS public.strategy_combos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  strategy_id UUID REFERENCES public.preset_strategies(id) ON DELETE CASCADE NOT NULL,
  hand TEXT NOT NULL,                           -- e.g. "AKs", "T9o", "AA"
  hand_type TEXT DEFAULT '',                    -- e.g. "top_pair", "flush_draw", "air"
  weight REAL DEFAULT 0,                        -- how much this combo is in preflop range (0-1)
  equity REAL DEFAULT 0,                        -- raw equity vs villain range (0-1)
  action TEXT NOT NULL,                         -- e.g. "bet_33", "check", "fold"
  frequency REAL DEFAULT 0,                     -- 0.0 - 1.0
  ev REAL DEFAULT 0,                            -- expected value in big blinds
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_preset_strategies_lookup
  ON public.preset_strategies(board, hero_position, stack_depth);

CREATE INDEX IF NOT EXISTS idx_preset_strategies_texture
  ON public.preset_strategies(texture);

CREATE INDEX IF NOT EXISTS idx_strategy_combos_strategy_id
  ON public.strategy_combos(strategy_id);

CREATE INDEX IF NOT EXISTS idx_strategy_combos_hand
  ON public.strategy_combos(strategy_id, hand);

-- Row Level Security
ALTER TABLE public.preset_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_combos ENABLE ROW LEVEL SECURITY;

-- Everyone can read (including anonymous users — needed for web version)
CREATE POLICY "Anyone can read preset strategies"
  ON public.preset_strategies FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read strategy combos"
  ON public.strategy_combos FOR SELECT
  USING (true);

-- No INSERT/UPDATE/DELETE policies for regular users.
-- Only service_role can write (service_role bypasses RLS entirely).
-- Use the Supabase service_role key when running the migration script.
