-- Baseline PostgreSQL schema for the LMS platform.
-- This mirrors backend-go/internal/db/migrations/000001_initial_schema.sql
-- and is kept for manual bootstrap / inspection workflows.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255),
  code VARCHAR(50),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  student_limit INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_institutions_domain ON institutions (domain) WHERE domain IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_institutions_code ON institutions (code) WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_institutions_deleted_at ON institutions (deleted_at);

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  full_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  google_id TEXT,
  avatar_url TEXT,
  last_login_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL,
  consent_given BOOLEAN NOT NULL DEFAULT FALSE,
  consent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users (google_id) WHERE google_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_institution_id ON users (institution_id);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subdomains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subdomains_domain_name ON subdomains (domain_id, name);
CREATE INDEX IF NOT EXISTS idx_subdomains_domain_id ON subdomains (domain_id);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price DOUBLE PRECISION NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  tier TEXT NOT NULL,
  content_types TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  domain_id UUID REFERENCES domains(id) ON DELETE SET NULL,
  subdomain_id UUID REFERENCES subdomains(id) ON DELETE SET NULL,
  content_id UUID,
  bundle_domain_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'draft',
  razorpay_plan_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_domain_id ON products (domain_id);
CREATE INDEX IF NOT EXISTS idx_products_subdomain_id ON products (subdomain_id);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  plan_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'inactive',
  razorpay_subscription_id TEXT,
  razorpay_customer_id TEXT,
  current_period_end TIMESTAMPTZ,
  cancel_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_institution_id ON subscriptions (institution_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_product_id ON subscriptions (product_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_code ON subscriptions (plan_code);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  plan_code TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_institution_id ON payments (institution_id);
CREATE INDEX IF NOT EXISTS idx_payments_product_id ON payments (product_id);
CREATE INDEX IF NOT EXISTS idx_payments_plan_code ON payments (plan_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_razorpay_order_id ON payments (razorpay_order_id) WHERE razorpay_order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_razorpay_payment_id ON payments (razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  plan_code TEXT NOT NULL DEFAULT '',
  purchase_type TEXT NOT NULL DEFAULT 'one_time',
  access_status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'created',
  amount INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  activated_at TIMESTAMPTZ,
  access_ends_at TIMESTAMPTZ,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases (user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_institution_id ON purchases (institution_id);
CREATE INDEX IF NOT EXISTS idx_purchases_product_id ON purchases (product_id);
CREATE INDEX IF NOT EXISTS idx_purchases_subscription_id ON purchases (subscription_id);
CREATE INDEX IF NOT EXISTS idx_purchases_payment_id ON purchases (payment_id);
CREATE INDEX IF NOT EXISTS idx_purchases_plan_code ON purchases (plan_code);
CREATE INDEX IF NOT EXISTS idx_purchases_access_status ON purchases (access_status);
CREATE INDEX IF NOT EXISTS idx_purchases_payment_status ON purchases (payment_status);

CREATE TABLE IF NOT EXISTS lead_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_events_payment_id ON lead_events (payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lead_events_lead_type ON lead_events (lead_type);
CREATE INDEX IF NOT EXISTS idx_lead_events_source ON lead_events (source);
CREATE INDEX IF NOT EXISTS idx_lead_events_email ON lead_events (email);
CREATE INDEX IF NOT EXISTS idx_lead_events_sync_status ON lead_events (sync_status);

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

CREATE TABLE IF NOT EXISTS contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft',
  source_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contents_type ON contents (type);

CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  domain TEXT NOT NULL DEFAULT 'General',
  subdomain TEXT,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  level TEXT NOT NULL DEFAULT 'beginner',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'Videos',
  status TEXT NOT NULL DEFAULT 'draft',
  source_url TEXT,
  content_url TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE TABLE IF NOT EXISTS ai_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  provider VARCHAR(100) NOT NULL,
  model VARCHAR(150) NOT NULL,
  prompt_version VARCHAR(50) NOT NULL DEFAULT 'v1',
  status VARCHAR(50) NOT NULL DEFAULT 'success',
  failure_code VARCHAR(100) NOT NULL DEFAULT '',
  failure_category VARCHAR(100) NOT NULL DEFAULT '',
  source_type VARCHAR(50) NOT NULL,
  source_url TEXT,
  requested_title TEXT NOT NULL DEFAULT '',
  error_message TEXT NOT NULL DEFAULT '',
  request_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  response_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_user_id ON ai_generation_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_course_id ON ai_generation_logs (course_id);
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_module_id ON ai_generation_logs (module_id);
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_lesson_id ON ai_generation_logs (lesson_id);
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_status ON ai_generation_logs (status);
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_failure_code ON ai_generation_logs (failure_code);
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_failure_category ON ai_generation_logs (failure_category);
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_created_at ON ai_generation_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  progress_percent INTEGER NOT NULL DEFAULT 0,
  last_position_seconds INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) NOT NULL UNIQUE,
  value TEXT NOT NULL DEFAULT '',
  label VARCHAR(200) NOT NULL DEFAULT '',
  "group" VARCHAR(100) NOT NULL DEFAULT '',
  is_secret BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT NOT NULL DEFAULT '',
  details TEXT NOT NULL DEFAULT '',
  ip_address TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);

CREATE TABLE IF NOT EXISTS consent_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  version TEXT NOT NULL,
  ip_address TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_histories_user_id ON consent_histories (user_id);

INSERT INTO roles (name) VALUES
  ('student'),
  ('instructor'),
  ('institution_admin'),
  ('content_manager'),
  ('subscription_manager'),
  ('super_admin')
ON CONFLICT (name) DO NOTHING;
