-- Grades bound to school types; profile can store user's grade
CREATE TABLE IF NOT EXISTS grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_type_id UUID NOT NULL REFERENCES school_types(id) ON DELETE CASCADE,
  name JSONB NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_grades_school_type ON grades(school_type_id);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS grade_id UUID REFERENCES grades(id);
