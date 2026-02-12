import { Router } from 'express';
import { query } from '../db/pool.js';
import { success, error } from '../utils/response.js';

const router = Router({ mergeParams: true });

// PUT /api/v1/admin/users/:id/profile - edit profile (full_name, role, school_name, grade_id, onboarding_completed, location_id)
router.put('/:id/profile', async (req, res) => {
  const { id } = req.params;
  const { full_name, role, school_name, grade_id, onboarding_completed, location_id } = req.body || {};
  const profile = await query<{ id: string; role: string | null }>(
    'SELECT id, role FROM profiles WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  if (profile.rows.length === 0) {
    return error(res, 'USER_NOT_FOUND', 'User not found', 404);
  }
  const updates: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (typeof full_name === 'string') {
    updates.push(`full_name = $${i++}`);
    values.push(full_name.trim() || null);
  }
  if (role === 'tutor' || role === 'student') {
    updates.push(`role = $${i++}`);
    values.push(role);
  }
  if (school_name !== undefined) {
    updates.push(`school_name = $${i++}`);
    values.push(typeof school_name === 'string' ? school_name.trim() || null : null);
  }
  if (grade_id !== undefined) {
    updates.push(`grade_id = $${i++}`);
    values.push(typeof grade_id === 'string' ? grade_id : null);
  }
  if (typeof onboarding_completed === 'boolean') {
    updates.push(`onboarding_completed = $${i++}`);
    values.push(onboarding_completed);
  }
  if (updates.length > 0) {
    updates.push('updated_at = NOW()');
    values.push(id);
    await query(
      `UPDATE profiles SET ${updates.join(', ')} WHERE id = $${i} AND deleted_at IS NULL`,
      values
    );
  }
  if (typeof location_id === 'string' && location_id) {
    await query(
      `INSERT INTO onboarding_progress (user_id, current_step, data, updated_at)
       VALUES ($1, 0, jsonb_build_object('location_id', $2::text), NOW())
       ON CONFLICT (user_id) DO UPDATE SET data = onboarding_progress.data || jsonb_build_object('location_id', $2::text), updated_at = NOW()`,
      [id, location_id]
    );
  }
  return success(res, { message: 'Profile updated' });
});

export default router;
