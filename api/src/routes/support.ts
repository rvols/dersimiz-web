import { Router } from 'express';
import { query } from '../db/pool.js';
import { success, error } from '../utils/response.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/support/unread-count - unread support reply notifications for badge
router.get('/unread-count', requireAuth, async (req: AuthRequest, res) => {
  const r = await query<{ count: string }>(
    "SELECT COUNT(*) as count FROM notifications_log WHERE user_id = $1 AND type = 'support_reply' AND read = false",
    [req.userId]
  );
  return success(res, { count: parseInt(r.rows[0]?.count || '0', 10) });
});

// GET /api/v1/support/tickets - list user's tickets with subject, status
router.get('/tickets', requireAuth, async (req: AuthRequest, res) => {
  const result = await query<{
    id: string;
    status: string;
    subject: string | null;
    created_at: Date;
    updated_at: Date;
  }>(
    'SELECT id, status, subject, created_at, updated_at FROM support_tickets WHERE user_id = $1 ORDER BY updated_at DESC',
    [req.userId]
  );
  const tickets = await Promise.all(
    result.rows.map(async (t) => {
      const lastMsg = await query<{ body: string; created_at: Date }>(
        'SELECT body, created_at FROM support_messages WHERE ticket_id = $1 ORDER BY created_at DESC LIMIT 1',
        [t.id]
      );
      return {
        id: t.id,
        status: t.status,
        subject: t.subject || '(No subject)',
        created_at: t.created_at,
        updated_at: t.updated_at,
        last_message_preview: lastMsg.rows[0]?.body?.slice(0, 80) || null,
      };
    })
  );
  return success(res, { tickets });
});

// POST /api/v1/support/tickets - create ticket (subject required)
router.post('/tickets', requireAuth, async (req: AuthRequest, res) => {
  const { subject, body } = req.body || {};
  const sub = typeof subject === 'string' ? subject.trim() : '';
  if (!sub) return error(res, 'VALIDATION_ERROR', 'subject is required', 400);
  const ins = await query<{ id: string }>(
    'INSERT INTO support_tickets (user_id, status, subject) VALUES ($1, $2, $3) RETURNING id',
    [req.userId, 'open', sub]
  );
  const ticketId = ins.rows[0].id;
  if (body && typeof body === 'string' && body.trim()) {
    await query(
      'INSERT INTO support_messages (ticket_id, sender_id, is_admin, body) VALUES ($1, $2, false, $3)',
      [ticketId, req.userId, body.trim()]
    );
  }
  const t = await query<{ id: string; status: string; subject: string; created_at: Date }>(
    'SELECT id, status, subject, created_at FROM support_tickets WHERE id = $1',
    [ticketId]
  );
  return success(res, { ticket: t.rows[0] });
});

// GET /api/v1/support/tickets/:id - get ticket with messages
router.get('/tickets/:id', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const ticketResult = await query<{ id: string; status: string; subject: string | null; created_at: Date }>(
    'SELECT id, status, subject, created_at FROM support_tickets WHERE id = $1 AND user_id = $2',
    [id, req.userId]
  );
  if (ticketResult.rows.length === 0) return error(res, 'NOT_FOUND', 'Ticket not found', 404);
  const t = ticketResult.rows[0];
  const messages = await query<{ id: string; body: string; is_admin: boolean; created_at: Date }>(
    'SELECT id, body, is_admin, created_at FROM support_messages WHERE ticket_id = $1 ORDER BY created_at ASC',
    [id]
  );
  return success(res, {
    ticket: { id: t.id, status: t.status, subject: t.subject, created_at: t.created_at },
    messages: messages.rows,
  });
});

// POST /api/v1/support/tickets/:id/messages - send message
router.post('/tickets/:id/messages', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { body } = req.body || {};
  if (!body || typeof body !== 'string') return error(res, 'VALIDATION_ERROR', 'body is required', 400);
  const ticketResult = await query<{ id: string }>(
    'SELECT id FROM support_tickets WHERE id = $1 AND user_id = $2',
    [id, req.userId]
  );
  if (ticketResult.rows.length === 0) return error(res, 'NOT_FOUND', 'Ticket not found', 404);
  if (ticketResult.rows[0]) {
    const statusCheck = await query<{ status: string }>('SELECT status FROM support_tickets WHERE id = $1', [id]);
    if (statusCheck.rows[0]?.status === 'closed') {
      return error(res, 'VALIDATION_ERROR', 'Cannot send message to closed ticket', 400);
    }
  }
  await query(
    'INSERT INTO support_messages (ticket_id, sender_id, is_admin, body) VALUES ($1, $2, false, $3)',
    [id, req.userId, body.trim()]
  );
  await query('UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2', ['open', id]);
  const msg = await query<{ id: string; body: string; is_admin: boolean; created_at: Date }>(
    'SELECT id, body, is_admin, created_at FROM support_messages WHERE ticket_id = $1 ORDER BY created_at DESC LIMIT 1',
    [id]
  );
  return success(res, { message: msg.rows[0] });
});

// PUT /api/v1/support/tickets/:id/status - close ticket (user)
router.put('/tickets/:id/status', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { status } = req.body || {};
  if (!['open', 'replied', 'closed'].includes(status)) {
    return error(res, 'VALIDATION_ERROR', 'Invalid status', 400);
  }
  const ticketResult = await query<{ id: string }>(
    'SELECT id FROM support_tickets WHERE id = $1 AND user_id = $2',
    [id, req.userId]
  );
  if (ticketResult.rows.length === 0) return error(res, 'NOT_FOUND', 'Ticket not found', 404);
  await query('UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);
  return success(res, { status });
});

// Legacy: GET /conversation - redirect to first ticket for backward compat
router.get('/conversation', requireAuth, async (req: AuthRequest, res) => {
  const ticketResult = await query<{ id: string; status: string; subject: string | null; created_at: Date }>(
    'SELECT id, status, subject, created_at FROM support_tickets WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1',
    [req.userId]
  );
  if (ticketResult.rows.length === 0) {
    const ins = await query<{ id: string; status: string; subject: string | null; created_at: Date }>(
      'INSERT INTO support_tickets (user_id, status, subject) VALUES ($1, $2, $3) RETURNING id, status, subject, created_at',
      [req.userId, 'open', 'General inquiry']
    );
    ticketResult.rows.push(ins.rows[0] as { id: string; status: string; subject: string | null; created_at: Date });
  }
  const t = ticketResult.rows[0];
  const messages = await query<{ id: string; body: string; is_admin: boolean; created_at: Date }>(
    'SELECT id, body, is_admin, created_at FROM support_messages WHERE ticket_id = $1 ORDER BY created_at ASC',
    [t!.id]
  );
  return success(res, {
    ticket: { id: t!.id, status: t!.status, subject: t!.subject, created_at: t!.created_at },
    messages: messages.rows,
  });
});

// Legacy: POST /messages - for backward compat, post to first ticket
router.post('/messages', requireAuth, async (req: AuthRequest, res) => {
  const { body, subject } = req.body || {};
  if (!body || typeof body !== 'string') return error(res, 'VALIDATION_ERROR', 'body is required', 400);
  let ticketResult = await query<{ id: string }>(
    'SELECT id FROM support_tickets WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1',
    [req.userId]
  );
  if (ticketResult.rows.length === 0) {
    const sub = subject?.trim() || 'General inquiry';
    const ins = await query<{ id: string }>(
      'INSERT INTO support_tickets (user_id, status, subject) VALUES ($1, $2, $3) RETURNING id',
      [req.userId, 'open', sub]
    );
    ticketResult = ins;
  }
  const ticketId = ticketResult.rows[0].id;
  await query(
    'INSERT INTO support_messages (ticket_id, sender_id, is_admin, body) VALUES ($1, $2, false, $3)',
    [ticketId, req.userId, body.trim()]
  );
  await query('UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2', ['open', ticketId]);
  return success(res, { message: 'Message sent' });
});

// Legacy: PUT /conversation/status - deprecated, use PUT /tickets/:id/status
router.put('/conversation/status', requireAuth, async (req: AuthRequest, res) => {
  const { status } = req.body || {};
  if (!['open', 'replied', 'closed'].includes(status)) {
    return error(res, 'VALIDATION_ERROR', 'Invalid status', 400);
  }
  const ticketResult = await query<{ id: string }>(
    'SELECT id FROM support_tickets WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1',
    [req.userId]
  );
  if (ticketResult.rows.length === 0) return error(res, 'NOT_FOUND', 'No ticket found', 404);
  await query('UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2', [
    status,
    ticketResult.rows[0].id,
  ]);
  return success(res, { status });
});

// POST /api/v1/support/conversation/mark-read - mark support notifications as read
router.post('/conversation/mark-read', requireAuth, async (req: AuthRequest, res) => {
  await query(
    "UPDATE notifications_log SET read = true WHERE user_id = $1 AND type = 'support_reply'",
    [req.userId]
  );
  return success(res, { message: 'Marked as read' });
});

export default router;
