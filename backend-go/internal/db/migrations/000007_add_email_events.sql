CREATE TABLE IF NOT EXISTS email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sns_message_id VARCHAR(255) NOT NULL UNIQUE,
  topic_arn VARCHAR(500) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  notification_type VARCHAR(100) NOT NULL,
  ses_message_id VARCHAR(255),
  source_email VARCHAR(255),
  subject VARCHAR(500),
  primary_recipient VARCHAR(255),
  status VARCHAR(100) NOT NULL,
  diagnostic_message TEXT,
  event_at TIMESTAMPTZ,
  raw_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_events_topic_arn ON email_events (topic_arn);
CREATE INDEX IF NOT EXISTS idx_email_events_event_type ON email_events (event_type);
CREATE INDEX IF NOT EXISTS idx_email_events_notification_type ON email_events (notification_type);
CREATE INDEX IF NOT EXISTS idx_email_events_ses_message_id ON email_events (ses_message_id);
CREATE INDEX IF NOT EXISTS idx_email_events_source_email ON email_events (source_email);
CREATE INDEX IF NOT EXISTS idx_email_events_primary_recipient ON email_events (primary_recipient);
CREATE INDEX IF NOT EXISTS idx_email_events_status ON email_events (status);
