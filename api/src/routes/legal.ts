import { Router } from 'express';
import { query } from '../db/pool.js';
import { success, error } from '../utils/response.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

const DOC_TYPES = ['terms_and_conditions', 'privacy_notice', 'cookie_policy', 'acceptable_usage_policy'] as const;

// Legal acceptance is per user per document (each version = new document id).
// When a new version is published, it is not in user_agreements, so required_documents
// and requires_legal_accept will include it until the user accepts.

// GET /api/v1/legal/required - documents user must accept (Bearer)
router.get('/required', requireAuth, async (req: AuthRequest, res) => {
  const latest = await query<{ id: string; type: string; version: number; title: string; body_markdown: string }>(
    `SELECT id, type, version, title, body_markdown FROM legal_documents ld
     WHERE (type, version) IN (
       SELECT type, MAX(version) FROM legal_documents GROUP BY type
     ) ORDER BY type`
  );
  const accepted = await query<{ legal_document_id: string }>(
    'SELECT legal_document_id FROM user_agreements WHERE user_id = $1',
    [req.userId]
  );
  const acceptedSet = new Set(accepted.rows.map((r) => r.legal_document_id));
  const required = latest.rows.filter((d) => !acceptedSet.has(d.id));
  return success(res, { required_documents: required });
});

// POST /api/v1/legal/accept
router.post('/accept', requireAuth, async (req: AuthRequest, res) => {
  const { document_ids } = req.body;
  if (!Array.isArray(document_ids) || document_ids.length === 0) {
    return error(res, 'VALIDATION_ERROR', 'document_ids array required', 400);
  }
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '0.0.0.0';
  const accepted: { id: string; type: string; version: number }[] = [];
  for (const docId of document_ids) {
    const doc = await query<{ id: string; type: string; version: number }>(
      'SELECT id, type, version FROM legal_documents WHERE id = $1',
      [docId]
    );
    if (doc.rows.length === 0) return error(res, 'VALIDATION_ERROR', 'Invalid document ID', 400);
    await query(
      'INSERT INTO user_agreements (user_id, legal_document_id, ip_address) VALUES ($1, $2, $3) ON CONFLICT (user_id, legal_document_id) DO NOTHING',
      [req.userId, docId, ip]
    );
    accepted.push(doc.rows[0]);
  }
  return success(res, { accepted_count: accepted.length, accepted_documents: accepted });
});

// GET /api/v1/legal/public - no auth
router.get('/public', async (_req, res) => {
  const result = await query<{ id: string; type: string; version: number; title: string; body_markdown: string }>(
    `SELECT id, type, version, title, body_markdown FROM legal_documents ld
     WHERE (type, version) IN (
       SELECT type, MAX(version) FROM legal_documents GROUP BY type
     ) ORDER BY type`
  );
  return success(res, { documents: result.rows });
});

export default router;
