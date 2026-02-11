import { Router } from 'express';
import { query } from '../db/pool.js';
import { success, error } from '../utils/response.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/support/conversation
router.get('/conversation', requireAuth, async (req: AuthRequest, res) => {
  let ticketResult = await query<{ id: string; status: string; subject: string | null; created_at: Date }>(
    'SELECT id, status, subject, created_at FROM support_tickets WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
    [req.userId]
  );
  if (ticketResult.rows.length === 0) {
    const ins = await query<{ id: string; status: string; subject: string | null; created_at: Date }>(
      'INSERT INTO support_tickets (user_id, status) VALUES ($1, $2) RETURNING id, status, subject, created_at',
      [req.userId, 'open']
    );
    ticketResult = ins;
  }
  const t = ticketResult.rows[0];
  const messages = await query<{
    id: string;
    body: string;
    is_admin: boolean;
    created_at: Date;
  }>(
    'SELECT id, body, is_admin, created_at FROM support_messages WHERE ticket_id = $1 ORDER BY created_at ASC',
    [t!.id]
  );
  return success(res, {
    ticket: { id: t!.id, status: t!.status, subject: t!.subject, created_at: t!.created_at },
    messages: messages.rows,
  });
});

// POST /api/v1/support/messages
router.post('/messages', requireAuth, async (req: AuthRequest, res) => {
  const { body, subject } = req.body;
  if (!body || typeof body !== 'string') {
    return error(res, 'VALIDATION_ERROR', 'body is required', 400);
  }
  let ticketResult2 = await query<{ id: string }>('SELECT id FROM support_tickets WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [req.userId]);
  if (ticketResult2.rows.length === 0) {
    const ins = await query<{ id: string }>(
      'INSERT INTO support_tickets (user_id, status, subject) VALUES ($1, $2, $3) RETURNING id',
      [req.userId, 'open', subject || null]
    );
    ticketResult2 = ins;
  }
  const ticketId = ticketResult2.rows[0].id;
  await query(
    'INSERT INTO support_messages (ticket_id, sender_id, is_admin, body) VALUES ($1, $2, false, $3)',
    [ticketId, req.userId, body]
  );
  await query('UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2', ['open', ticketId]);
  return success(res, { message: 'Message sent' });
});

// PUT /api/v1/support/conversation/status
router.put('/conversation/status', requireAuth, async (req: AuthRequest, res) => {
  const { status } = req.body;
  if (!['open', 'replied', 'closed'].includes(status)) {
    return error(res, 'VALIDATION_ERROR', 'Invalid status', 400);
  }
  await query(
    'UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE user_id = $2',
    [status, req.userId]
  );
  return success(res, { status });
});

export default router;
