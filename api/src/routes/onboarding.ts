import { Router } from 'express';
import { query } from '../db/pool.js';
import { success, error } from '../utils/response.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/onboarding/status
router.get('/status', requireAuth, async (req: AuthRequest, res) => {
  const result = await query<{ current_step: number; data: unknown }>(
    'SELECT current_step, data FROM onboarding_progress WHERE user_id = $1',
    [req.userId]
  );
  const progress = result.rows[0];
  const profile = await query<{ onboarding_completed: boolean }>(
    'SELECT onboarding_completed FROM profiles WHERE id = $1',
    [req.userId]
  );
  return success(res, {
    current_step: progress?.current_step ?? 0,
    data: progress?.data ?? {},
    onboarding_completed: profile.rows[0]?.onboarding_completed ?? false,
  });
});

// POST /api/v1/onboarding/step
router.post('/step', requireAuth, async (req: AuthRequest, res) => {
  const { step, data: stepData } = req.body as { step?: number; data?: Record<string, unknown> };
  if (typeof step !== 'number' || step < 0) {
    return error(res, 'VALIDATION_ERROR', 'Invalid step', 400);
  }
  const data = stepData && typeof stepData === 'object' ? stepData : {};
  await query(
    `INSERT INTO onboarding_progress (user_id, current_step, data, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id) DO UPDATE SET current_step = $2, data = onboarding_progress.data || $3::jsonb, updated_at = NOW()`,
    [req.userId, step, JSON.stringify(data)]
  );
  if (req.body.completed) {
    await query(
      'UPDATE profiles SET onboarding_completed = true, updated_at = NOW() WHERE id = $1',
      [req.userId]
    );
  }
  return success(res, { step, message: 'Progress saved' });
});

export default router;
