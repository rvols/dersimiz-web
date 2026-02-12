-- Index for efficient message fetching by ticket
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_messages(ticket_id, created_at ASC);

-- Index for ticket list ordering
CREATE INDEX IF NOT EXISTS idx_support_tickets_updated ON support_tickets(updated_at DESC);
