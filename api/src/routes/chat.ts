import { Router } from 'express';
import { query } from '../db/pool.js';
import { success, error } from '../utils/response.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { moderateText } from '../services/moderation.js';

const router = Router();

// POST /api/v1/chat/conversations - create conversation (student with tutor)
router.post('/conversations', requireAuth, async (req: AuthRequest, res) => {
  const { tutor_id } = req.body;
  if (!tutor_id) return error(res, 'VALIDATION_ERROR', 'tutor_id required', 400);
  const profile = await query<{ role: string | null }>('SELECT role FROM profiles WHERE id = $1 AND deleted_at IS NULL', [req.userId]);
  const tutor = await query<{ id: string }>('SELECT id FROM profiles WHERE id = $1 AND role = $2 AND deleted_at IS NULL', [tutor_id, 'tutor']);
  if (profile.rows[0]?.role !== 'student') return error(res, 'FORBIDDEN', 'Only students can start conversations', 403);
  if (tutor.rows.length === 0) return error(res, 'NOT_FOUND', 'Tutor not found', 404);
  const existing = await query<{ id: string }>(
    'SELECT id FROM conversations WHERE tutor_id = $1 AND student_id = $2',
    [tutor_id, req.userId]
  );
  if (existing.rows[0]) return success(res, { conversation: { id: existing.rows[0].id }, created: false });
  const ins = await query(
    'INSERT INTO conversations (tutor_id, student_id) VALUES ($1, $2) RETURNING id',
    [tutor_id, req.userId]
  );
  return success(res, { conversation: { id: (ins.rows[0] as { id: string }).id }, created: true });
});

// GET /api/v1/chat/conversations
router.get('/conversations', requireAuth, async (req: AuthRequest, res) => {
  const result = await query<{
    id: string;
    tutor_id: string;
    student_id: string;
    last_message_at: Date | null;
    created_at: Date;
  }>(
    `SELECT id, tutor_id, student_id, last_message_at, created_at FROM conversations
     WHERE tutor_id = $1 OR student_id = $1 ORDER BY last_message_at DESC NULLS LAST`,
    [req.userId]
  );
  const list = await Promise.all(
    result.rows.map(async (c) => {
      const otherId = c.tutor_id === req.userId ? c.student_id : c.tutor_id;
      const p = await query<{ id: string; full_name: string | null; avatar_url: string | null; role: string | null }>(
        'SELECT id, full_name, avatar_url, role FROM profiles WHERE id = $1',
        [otherId]
      );
      const lastMsg = await query<{ content: string | null; type: string; created_at: Date }>(
        'SELECT content, type, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 1',
        [c.id]
      );
      return {
        id: c.id,
        other: p.rows[0],
        last_message: lastMsg.rows[0],
        last_message_at: c.last_message_at,
      };
    })
  );
  return success(res, { conversations: list });
});

// GET /api/v1/chat/conversations/:id - single conversation details
router.get('/conversations/:id', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const conv = await query<{ id: string; tutor_id: string; student_id: string; last_message_at: Date | null; created_at: Date }>(
    'SELECT id, tutor_id, student_id, last_message_at, created_at FROM conversations WHERE id = $1',
    [id]
  );
  if (conv.rows.length === 0) return error(res, 'NOT_FOUND', 'Conversation not found', 404);
  const c = conv.rows[0];
  if (c.tutor_id !== req.userId && c.student_id !== req.userId) {
    return error(res, 'FORBIDDEN', 'Not part of this conversation', 403);
  }
  const otherId = c.tutor_id === req.userId ? c.student_id : c.tutor_id;
  const other = await query<{ id: string; full_name: string | null; avatar_url: string | null; role: string | null }>(
    'SELECT id, full_name, avatar_url, role FROM profiles WHERE id = $1',
    [otherId]
  );
  const lastMsg = await query<{ id: string; content: string | null; type: string; created_at: Date }>(
    'SELECT id, content, type, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 1',
    [id]
  );
  return success(res, {
    conversation: {
      id: c.id,
      other: other.rows[0],
      last_message: lastMsg.rows[0],
      last_message_at: c.last_message_at,
      created_at: c.created_at,
    },
  });
});

// GET /api/v1/chat/conversations/:id/messages - list messages (optional ?limit=50&before=message_id for pagination)
router.get('/conversations/:id/messages', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit), 10) || 50));
  const before = req.query.before as string | undefined;
  const conv = await query<{ tutor_id: string; student_id: string }>(
    'SELECT tutor_id, student_id FROM conversations WHERE id = $1',
    [id]
  );
  if (conv.rows.length === 0) return error(res, 'NOT_FOUND', 'Conversation not found', 404);
  const { tutor_id, student_id } = conv.rows[0];
  if (tutor_id !== req.userId && student_id !== req.userId) {
    return error(res, 'FORBIDDEN', 'Not part of this conversation', 403);
  }
  let messagesQuery =
    'SELECT id, sender_id, type, content, payload, created_at, read_at FROM messages WHERE conversation_id = $1';
  const params: unknown[] = [id];
  let paramIdx = 2;
  if (before) {
    messagesQuery += ' AND created_at < (SELECT created_at FROM messages WHERE id = $2)';
    params.push(before);
    paramIdx = 3;
  }
  params.push(limit);
  messagesQuery += ` ORDER BY created_at DESC LIMIT $${paramIdx}`;
  const messages = await query<{
    id: string;
    sender_id: string;
    type: string;
    content: string | null;
    payload: unknown;
    created_at: Date;
    read_at: Date | null;
  }>(messagesQuery, params);
  const rows = messages.rows.reverse();
  return success(res, { messages: rows, has_more: rows.length === limit });
});

// POST /api/v1/chat/conversations/:id/messages
router.post('/conversations/:id/messages', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { type = 'text', content, payload } = req.body;
  const conv = await query<{ tutor_id: string; student_id: string }>(
    'SELECT tutor_id, student_id FROM conversations WHERE id = $1',
    [id]
  );
  if (conv.rows.length === 0) return error(res, 'NOT_FOUND', 'Conversation not found', 404);
  const { tutor_id, student_id } = conv.rows[0];
  if (tutor_id !== req.userId && student_id !== req.userId) {
    return error(res, 'FORBIDDEN', 'Not part of this conversation', 403);
  }
  let moderationStatus: 'approved' | 'blocked' | 'flagged' = 'approved';
  if (type === 'text' && typeof content === 'string' && content.trim()) {
    moderationStatus = await moderateText(content.trim());
    if (moderationStatus === 'blocked') {
      return error(res, 'CONTENT_BLOCKED', 'Message was blocked by moderation.', 400);
    }
  }
  const msgResult = await query(
    `INSERT INTO messages (conversation_id, sender_id, type, content, payload, moderation_status)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, sender_id, type, content, payload, created_at`,
    [id, req.userId, type, content ?? null, payload ? JSON.stringify(payload) : null, moderationStatus]
  );
  await query(
    'UPDATE conversations SET last_message_at = NOW(), updated_at = NOW() WHERE id = $1',
    [id]
  );
  const recipientId = tutor_id === req.userId ? student_id : tutor_id;
  const pref = await query<{ new_message: boolean }>(
    'SELECT new_message FROM notification_preferences WHERE user_id = $1',
    [recipientId]
  );
  const shouldNotify = pref.rows.length === 0 || pref.rows[0].new_message;
  if (shouldNotify) {
    const preview = type === 'text' && typeof content === 'string' ? content.slice(0, 100) : type === 'contact_share' ? 'Contact shared' : type === 'demo_request' ? 'Demo request' : 'New message';
    await query(
      `INSERT INTO notifications_log (user_id, type, title, body, data) VALUES ($1, 'new_message', $2, $3, $4)`,
      [recipientId, 'New message', preview, JSON.stringify({ conversation_id: id, sender_id: req.userId, message_type: type })]
    );
  }
  return success(res, { message: msgResult.rows[0] });
});

// POST /api/v1/chat/conversations/:id/read
router.post('/conversations/:id/read', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const conv = await query('SELECT tutor_id, student_id FROM conversations WHERE id = $1', [id]);
  if (conv.rows.length === 0) return error(res, 'NOT_FOUND', 'Conversation not found', 404);
  const row = conv.rows[0] as { tutor_id: string; student_id: string };
  if (row.tutor_id !== req.userId && row.student_id !== req.userId) {
    return error(res, 'FORBIDDEN', 'Not part of this conversation', 403);
  }
  await query(
    'UPDATE messages SET read_at = NOW() WHERE conversation_id = $1 AND sender_id != $2 AND read_at IS NULL',
    [id, req.userId]
  );
  return success(res, { message: 'Marked as read' });
});

// POST /api/v1/chat/conversations/:id/share-contact - send contact_share message
router.post('/conversations/:id/share-contact', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { phone_number } = req.body;
  const conv = await query<{ tutor_id: string; student_id: string }>(
    'SELECT tutor_id, student_id FROM conversations WHERE id = $1',
    [id]
  );
  if (conv.rows.length === 0) return error(res, 'NOT_FOUND', 'Conversation not found', 404);
  const { tutor_id, student_id } = conv.rows[0];
  if (tutor_id !== req.userId && student_id !== req.userId) {
    return error(res, 'FORBIDDEN', 'Not part of this conversation', 403);
  }
  const profile = await query<{ phone_number: string }>('SELECT phone_number FROM profiles WHERE id = $1', [req.userId]);
  const phone = phone_number || profile.rows[0]?.phone_number;
  if (!phone) return error(res, 'VALIDATION_ERROR', 'phone_number required', 400);
  await query(
    `INSERT INTO messages (conversation_id, sender_id, type, payload, moderation_status)
     VALUES ($1, $2, 'contact_share', $3, 'approved')`,
    [id, req.userId, JSON.stringify({ phone_number: phone })]
  );
  await query('UPDATE conversations SET last_message_at = NOW(), updated_at = NOW() WHERE id = $1', [id]);
  return success(res, { message: 'Contact shared' });
});

// POST /api/v1/chat/conversations/:id/demo-request
router.post('/conversations/:id/demo-request', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { lesson_type_id, preferred_times } = req.body;
  const conv = await query<{ tutor_id: string; student_id: string }>(
    'SELECT tutor_id, student_id FROM conversations WHERE id = $1',
    [id]
  );
  if (conv.rows.length === 0) return error(res, 'NOT_FOUND', 'Conversation not found', 404);
  const { tutor_id, student_id } = conv.rows[0];
  if (tutor_id !== req.userId && student_id !== req.userId) {
    return error(res, 'FORBIDDEN', 'Not part of this conversation', 403);
  }
  await query(
    `INSERT INTO messages (conversation_id, sender_id, type, payload, moderation_status)
     VALUES ($1, $2, 'demo_request', $3, 'approved')`,
    [id, req.userId, JSON.stringify({ lesson_type_id, preferred_times: preferred_times || [] })]
  );
  await query('UPDATE conversations SET last_message_at = NOW(), updated_at = NOW() WHERE id = $1', [id]);
  return success(res, { message: 'Demo request sent' });
});

// Helper: get or create conversation between student and tutor
export async function getOrCreateConversation(studentId: string, tutorId: string) {
  const existing = await query<{ id: string }>(
    'SELECT id FROM conversations WHERE tutor_id = $1 AND student_id = $2',
    [tutorId, studentId]
  );
  if (existing.rows[0]) return existing.rows[0].id;
  const insert = await query(
    'INSERT INTO conversations (tutor_id, student_id) VALUES ($1, $2) RETURNING id',
    [tutorId, studentId]
  );
  return insert.rows[0].id;
}

export default router;
