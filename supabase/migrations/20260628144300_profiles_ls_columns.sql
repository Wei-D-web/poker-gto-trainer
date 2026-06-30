-- Migration: add LS columns to profiles (existing table)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ls_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS ls_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Ensure tier column exists with default
ALTER TABLE public.profiles
  ALTER COLUMN tier SET DEFAULT 'free';

-- Indexes (skip if exists)
CREATE INDEX IF NOT EXISTS idx_profiles_tier ON public.profiles(tier);
CREATE INDEX IF NOT EXISTS idx_profiles_ls_customer ON public.profiles(ls_customer_id);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SELECT policy
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can read own profile') THEN
    CREATE POLICY "Users can read own profile"
      ON public.profiles FOR SELECT
      USING (auth.uid() = id);
  END IF;
END $$;

-- UPDATE policy
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile') THEN
    CREATE POLICY "Users can update own profile"
      ON public.profiles FOR UPDATE
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- INSERT policy
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile') THEN
    CREATE POLICY "Users can insert own profile"
      ON public.profiles FOR INSERT
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
