-- License Keys table for pre-generated activation codes.
-- Keys are generated via scripts/generate-license-keys.mjs and inserted here.
-- The LS webhook auto-assigns an available key on successful payment.
CREATE TABLE IF NOT EXISTS license_keys (
  id BIGSERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('pro', 'lifetime')),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'revoked')),
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX idx_license_keys_status ON license_keys(status);
CREATE INDEX idx_license_keys_assigned_to ON license_keys(assigned_to);

-- Order history table for audit trail
CREATE TABLE IF NOT EXISTS order_history (
  id BIGSERIAL PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ls_order_id TEXT,
  event TEXT NOT NULL,
  tier TEXT,
  amount NUMERIC(10,2),
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_history_profile ON order_history(profile_id);
CREATE INDEX idx_order_history_created ON order_history(created_at);
