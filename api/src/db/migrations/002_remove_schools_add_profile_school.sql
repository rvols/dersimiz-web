-- Add optional school name (free text) on profile; remove schools table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS school_name TEXT;
DROP TABLE IF EXISTS schools;
