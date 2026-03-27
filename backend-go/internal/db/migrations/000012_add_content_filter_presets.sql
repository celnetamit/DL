CREATE TABLE IF NOT EXISTS content_filter_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  filter_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, category, name)
);

CREATE INDEX IF NOT EXISTS idx_content_filter_presets_user_id ON content_filter_presets (user_id);
CREATE INDEX IF NOT EXISTS idx_content_filter_presets_category ON content_filter_presets (category);
