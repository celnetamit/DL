CREATE TABLE IF NOT EXISTS course_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  badge_slug TEXT NOT NULL DEFAULT 'course-complete',
  badge_label TEXT NOT NULL DEFAULT 'Course Complete',
  certificate_code TEXT NOT NULL UNIQUE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_course_awards_user_id ON course_awards (user_id);
CREATE INDEX IF NOT EXISTS idx_course_awards_course_id ON course_awards (course_id);
