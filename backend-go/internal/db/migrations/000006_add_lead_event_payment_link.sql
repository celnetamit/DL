ALTER TABLE lead_events
  ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_events_payment_id
  ON lead_events (payment_id)
  WHERE payment_id IS NOT NULL;
