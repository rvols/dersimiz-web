import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/pool.js';
import { success, error } from '../utils/response.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();
const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `avatar-${uuidv4()}${path.extname(file.originalname) || '.jpg'}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/v1/profile
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const result = await query<{
    id: string;
    phone_number: string;
    country_code: string;
    role: string | null;
    full_name: string | null;
    school_name: string | null;
    grade_id: string | null;
    avatar_url: string | null;
    is_approved: boolean;
    is_banned: boolean;
    onboarding_completed: boolean;
    created_at: Date;
    updated_at: Date;
  }>(
    'SELECT id, phone_number, country_code, role, full_name, school_name, grade_id, avatar_url, is_approved, is_banned, onboarding_completed, created_at, updated_at FROM profiles WHERE id = $1 AND deleted_at IS NULL',
    [req.userId]
  );
  const user = result.rows[0];
  if (!user) {
    return error(res, 'NOT_FOUND', 'Profile not found', 404);
  }
  if (user.role === 'tutor') {
    const [schoolsRes, gradesRes] = await Promise.all([
      query<{ id: string; school_name: string }>('SELECT id, school_name FROM tutor_schools WHERE tutor_id = $1 ORDER BY created_at', [req.userId]),
      query<{ grade_id: string }>('SELECT grade_id FROM tutor_grades WHERE tutor_id = $1 ORDER BY created_at', [req.userId]),
    ]);
    const gradesWithNames = await Promise.all(
      gradesRes.rows.map(async (r) => {
        const g = await query<{ id: string; name: unknown; school_type_id: string }>('SELECT id, name, school_type_id FROM grades WHERE id = $1 AND deleted_at IS NULL', [r.grade_id]);
        return g.rows[0] ? { id: g.rows[0].id, name: g.rows[0].name, school_type_id: g.rows[0].school_type_id } : null;
      })
    );
    (user as Record<string, unknown>).schools = schoolsRes.rows;
    (user as Record<string, unknown>).grades = gradesWithNames.filter(Boolean);
  }
  return success(res, { user });
});

// PUT /api/v1/profile
router.put('/', requireAuth, async (req: AuthRequest, res) => {
  const { full_name, school_name, grade_id, role } = req.body;
  const updates: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (typeof full_name === 'string') {
    updates.push(`full_name = $${i++}`);
    values.push(full_name);
  }
  if (school_name !== undefined) {
    updates.push(`school_name = $${i++}`);
    values.push(typeof school_name === 'string' ? school_name : null);
  }
  if (grade_id !== undefined) {
    updates.push(`grade_id = $${i++}`);
    values.push(typeof grade_id === 'string' ? grade_id : null);
  }
  if (role === 'tutor' || role === 'student') {
    updates.push(`role = $${i++}`);
    values.push(role);
  }
  if (updates.length === 0) {
    return success(res, { message: 'No updates' });
  }
  updates.push(`updated_at = NOW()`);
  values.push(req.userId);
  await query(
    `UPDATE profiles SET ${updates.join(', ')} WHERE id = $${i} AND deleted_at IS NULL`,
    values
  );
  return success(res, { message: 'Profile updated' });
});

// POST /api/v1/profile/avatar
router.post('/avatar', requireAuth, upload.single('avatar'), async (req: AuthRequest, res) => {
  const file = req.file;
  if (!file) return error(res, 'VALIDATION_ERROR', 'avatar file required', 400);
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const avatar_url = `${baseUrl}/uploads/${file.filename}`;
  await query('UPDATE profiles SET avatar_url = $1, updated_at = NOW() WHERE id = $2', [avatar_url, req.userId]);
  return success(res, { avatar_url });
});

// DELETE /api/v1/profile - soft delete
router.delete('/', requireAuth, async (req: AuthRequest, res) => {
  await query('UPDATE profiles SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1', [req.userId]);
  return success(res, { message: 'Account deleted' });
});

// GET /api/v1/profile/completeness - tutor profile completeness (0-100)
router.get('/completeness', requireAuth, async (req: AuthRequest, res) => {
  const p = await query<{
    full_name: string | null;
    avatar_url: string | null;
    role: string | null;
  }>('SELECT full_name, avatar_url, role FROM profiles WHERE id = $1', [req.userId]);
  const row = p.rows[0];
  if (!row || row.role !== 'tutor') {
    return success(res, { completeness: 0, details: {} });
  }
  const lessons = await query<{ count: string }>('SELECT COUNT(*) as count FROM tutor_lessons WHERE tutor_id = $1', [req.userId]);
  const availability = await query<{ slots: unknown }>('SELECT slots FROM tutor_availability WHERE tutor_id = $1', [req.userId]);
  const hasSlots = availability.rows[0]?.slots && Array.isArray(availability.rows[0].slots) && (availability.rows[0].slots as unknown[]).length > 0;
  let score = 0;
  const details: Record<string, boolean> = {};
  if (row.full_name) { score += 25; details.name = true; } else details.name = false;
  if (row.avatar_url) { score += 25; details.avatar = true; } else details.avatar = false;
  if (parseInt(lessons.rows[0]?.count ?? '0', 10) > 0) { score += 25; details.lessons = true; } else details.lessons = false;
  if (hasSlots) { score += 25; details.availability = true; } else details.availability = false;
  return success(res, { completeness: score, details });
});

export default router;
