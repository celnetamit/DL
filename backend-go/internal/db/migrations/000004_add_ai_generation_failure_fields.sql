ALTER TABLE ai_generation_logs
  ADD COLUMN IF NOT EXISTS failure_code VARCHAR(100) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS failure_category VARCHAR(100) NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_failure_code
  ON ai_generation_logs (failure_code);

CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_failure_category
  ON ai_generation_logs (failure_category);
