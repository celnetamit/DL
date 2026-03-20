CREATE TABLE IF NOT EXISTS lead_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  lead_type VARCHAR(50) NOT NULL,
  source VARCHAR(100) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  institution_name VARCHAR(255),
  subject VARCHAR(255),
  message TEXT,
  plan_code VARCHAR(150),
  product_name VARCHAR(255),
  amount INTEGER,
  currency VARCHAR(16) NOT NULL DEFAULT 'INR',
  sync_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  sync_attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  synced_at TIMESTAMPTZ,
  last_attempted_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_events_user_id ON lead_events (user_id);
CREATE INDEX IF NOT EXISTS idx_lead_events_institution_id ON lead_events (institution_id);
CREATE INDEX IF NOT EXISTS idx_lead_events_product_id ON lead_events (product_id);
CREATE INDEX IF NOT EXISTS idx_lead_events_lead_type ON lead_events (lead_type);
CREATE INDEX IF NOT EXISTS idx_lead_events_source ON lead_events (source);
CREATE INDEX IF NOT EXISTS idx_lead_events_email ON lead_events (email);
CREATE INDEX IF NOT EXISTS idx_lead_events_sync_status ON lead_events (sync_status);
