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

// POST /api/v1/onboarding/complete - finish onboarding, sync tutor_grades, set onboarding_completed
router.post('/complete', requireAuth, async (req: AuthRequest, res) => {
  const body = (req.body || {}) as Record<string, unknown>;
  const profile = await query<{ role: string | null }>(
    'SELECT role FROM profiles WHERE id = $1 AND deleted_at IS NULL',
    [req.userId]
  );
  const role = profile.rows[0]?.role;

  // Merge into onboarding_progress
  const dataToSave = { ...body };
  delete dataToSave.onboarding_completed;
  if (Object.keys(dataToSave).length > 0) {
    await query(
      `INSERT INTO onboarding_progress (user_id, current_step, data, updated_at)
       VALUES ($1, 999, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE SET data = onboarding_progress.data || $2::jsonb, updated_at = NOW()`,
      [req.userId, JSON.stringify(dataToSave)]
    );
  }

  // For tutors: sync tutor_grades from grades_by_school_type
  if (role === 'tutor') {
    const gradesBySchoolType = body.grades_by_school_type as Record<string, string[]> | undefined;
    if (gradesBySchoolType && typeof gradesBySchoolType === 'object') {
      const allGradeIds = Object.values(gradesBySchoolType).flat().filter((id): id is string => typeof id === 'string');
      await query('DELETE FROM tutor_grades WHERE tutor_id = $1', [req.userId]);
      for (const gradeId of allGradeIds) {
        await query(
          'INSERT INTO tutor_grades (tutor_id, grade_id) VALUES ($1, $2) ON CONFLICT (tutor_id, grade_id) DO NOTHING',
          [req.userId, gradeId]
        );
      }
    }
  }

  // For students: sync profile school_type_id, grade_id, school_name
  if (role === 'student') {
    const gradeId = typeof body.grade_id === 'string' ? body.grade_id : null;
    const schoolName = typeof body.school_name === 'string' ? body.school_name : null;
    await query(
      'UPDATE profiles SET grade_id = COALESCE($2, grade_id), school_name = COALESCE($3, school_name), updated_at = NOW() WHERE id = $1',
      [req.userId, gradeId, schoolName]
    );
  }

  // Sync full_name from onboarding to profiles when present (name set during onboarding)
  const fullName = typeof body.full_name === 'string' ? body.full_name.trim() || null : null;
  if (fullName !== null) {
    await query(
      'UPDATE profiles SET full_name = $1, is_approved = false, is_rejected = false, updated_at = NOW() WHERE id = $2',
      [fullName, req.userId]
    );
  }

  await query(
    'UPDATE profiles SET onboarding_completed = true, updated_at = NOW() WHERE id = $1',
    [req.userId]
  );

  return success(res, { message: 'Onboarding completed' });
});

export default router;
