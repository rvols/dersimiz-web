-- Add is_rejected to profiles for approval rejection flow
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_rejected BOOLEAN DEFAULT false;
COMMENT ON COLUMN profiles.is_rejected IS 'Set when admin rejects user; reason is in support ticket with subject Approval process';
