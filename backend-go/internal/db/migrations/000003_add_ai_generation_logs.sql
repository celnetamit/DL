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
  source_type VARCHAR(50) NOT NULL,
  source_url TEXT,
  requested_title TEXT NOT NULL DEFAULT '',
  error_message TEXT NOT NULL DEFAULT '',
  request_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  response_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_user_id
  ON ai_generation_logs (user_id);

CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_course_id
  ON ai_generation_logs (course_id);

CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_module_id
  ON ai_generation_logs (module_id);

CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_lesson_id
  ON ai_generation_logs (lesson_id);

CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_status
  ON ai_generation_logs (status);

CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_created_at
  ON ai_generation_logs (created_at DESC);
