-- Soft delete for master data: only mark as deleted, exclude from all reads
ALTER TABLE locations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;
ALTER TABLE school_types ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;
ALTER TABLE lesson_types ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;
