-- When admin views a ticket, mark it as read so badge count decreases
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS admin_read_at TIMESTAMPTZ NULL;
COMMENT ON COLUMN support_tickets.admin_read_at IS 'Set when admin views the ticket; used for unread badge count';
