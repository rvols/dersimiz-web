-- Student: stored multiple lesson type preferences
CREATE TABLE IF NOT EXISTS student_lesson_preferences (
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_type_id UUID NOT NULL REFERENCES lesson_types(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, lesson_type_id)
);
CREATE INDEX IF NOT EXISTS idx_student_lesson_preferences_student ON student_lesson_preferences(student_id);

-- Tutor: multiple schools (free text) and multiple grades
CREATE TABLE IF NOT EXISTS tutor_schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tutor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  school_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tutor_schools_tutor ON tutor_schools(tutor_id);

CREATE TABLE IF NOT EXISTS tutor_grades (
  tutor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  grade_id UUID NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tutor_id, grade_id)
);
CREATE INDEX IF NOT EXISTS idx_tutor_grades_tutor ON tutor_grades(tutor_id);
