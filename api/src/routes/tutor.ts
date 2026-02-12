import { Router, Response, NextFunction } from 'express';
import { query } from '../db/pool.js';
import { success, error } from '../utils/response.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

function requireTutor(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== 'tutor') {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Tutor role required' } });
  }
  next();
}

// Helper: compute total hours from weekly slots (slots are array of { day, start, end } or similar)
function totalHoursFromSlots(slots: unknown): number {
  if (!Array.isArray(slots)) return 0;
  let total = 0;
  for (const slot of slots) {
    if (slot && typeof slot === 'object' && 'start' in slot && 'end' in slot) {
      const s = String((slot as { start?: string }).start || '').trim();
      const e = String((slot as { end?: string }).end || '').trim();
      if (s && e) {
        const [sh, sm] = s.split(':').map(Number);
        const [eh, em] = e.split(':').map(Number);
        total += (eh * 60 + (isNaN(em) ? 0 : em) - (sh * 60 + (isNaN(sm) ? 0 : sm))) / 60;
      }
    }
  }
  return Math.max(0, total);
}

// GET /api/v1/tutor/dashboard - stats for dashboard (impressions, contacts, completeness, subscription, missing_fields, total_availability_hours, grade_count)
router.get('/dashboard', requireAuth, requireTutor, async (req: AuthRequest, res) => {
  const [convs, lessons, grades, profile, availability, sub] = await Promise.all([
    query<{ count: string }>('SELECT COUNT(*) as count FROM conversations WHERE tutor_id = $1', [req.userId]),
    query<{ count: string }>('SELECT COUNT(*) as count FROM tutor_lessons WHERE tutor_id = $1', [req.userId]),
    query<{ count: string }>('SELECT COUNT(*) as count FROM tutor_grades WHERE tutor_id = $1', [req.userId]),
    query<{ full_name: string | null; avatar_url: string | null }>(
      'SELECT full_name, avatar_url FROM profiles WHERE id = $1',
      [req.userId]
    ),
    query<{ slots: unknown }>('SELECT slots FROM tutor_availability WHERE tutor_id = $1', [req.userId]),
    query<{ plan_id: string }>(
      `SELECT plan_id FROM user_subscriptions WHERE user_id = $1 AND is_active = true AND (end_date IS NULL OR end_date >= NOW()) ORDER BY start_date DESC LIMIT 1`,
      [req.userId]
    ),
  ]);
  const lessonCount = parseInt(lessons.rows[0]?.count ?? '0', 10);
  const gradeCount = parseInt(grades.rows[0]?.count ?? '0', 10);
  const p = profile.rows[0];
  const slots = availability.rows[0]?.slots;
  const hasSlots = slots && Array.isArray(slots) && (slots as unknown[]).length > 0;
  const totalAvailabilityHours = totalHoursFromSlots(slots);

  // Tutor completeness: name, avatar, lessons, availability only (school/grade are student-specific)
  const missing_fields: string[] = [];
  if (!p?.full_name?.trim()) missing_fields.push('bio');
  if (!p?.avatar_url) missing_fields.push('avatar');
  if (lessonCount === 0) missing_fields.push('lessons');
  if (!hasSlots) missing_fields.push('availability');

  let completeness = 0;
  if (p?.full_name) completeness += 25;
  if (p?.avatar_url) completeness += 25;
  if (lessonCount > 0) completeness += 25;
  if (hasSlots) completeness += 25;

  let subscription_status: string | null = null;
  if (sub.rows[0]) {
    const plan = await query<{ slug: string; display_name: unknown }>(
      'SELECT slug, display_name FROM subscription_plans WHERE id = $1',
      [sub.rows[0].plan_id]
    );
    const name = plan.rows[0]?.display_name;
    subscription_status = typeof name === 'object' && name !== null && 'tr' in (name as object)
      ? String((name as { tr?: string }).tr ?? (name as { en?: string }).en ?? plan.rows[0]?.slug ?? '')
      : String(name ?? plan.rows[0]?.slug ?? '');
  }

  return success(res, {
    impressions: 0,
    contacts: parseInt(convs.rows[0]?.count ?? '0', 10),
    lesson_count: lessonCount,
    grade_count: gradeCount,
    profile_completeness: completeness,
    missing_fields,
    total_availability_hours: Math.round(totalAvailabilityHours * 10) / 10,
    subscription_status,
    profile: p,
  });
});

// GET /api/v1/tutor/students
router.get('/students', requireAuth, requireTutor, async (req: AuthRequest, res) => {
  const result = await query<{ student_id: string; last_message_at: Date | null }>(
    'SELECT student_id, last_message_at FROM conversations WHERE tutor_id = $1 ORDER BY last_message_at DESC NULLS LAST',
    [req.userId]
  );
  const students = await Promise.all(
    result.rows.map(async (r) => {
      const p = await query<{ id: string; full_name: string | null; avatar_url: string | null }>(
        'SELECT id, full_name, avatar_url FROM profiles WHERE id = $1 AND deleted_at IS NULL',
        [r.student_id]
      );
      return { ...p.rows[0], last_contact: r.last_message_at };
    })
  );
  return success(res, { students: students.filter(Boolean) });
});

// GET /api/v1/tutor/lessons
router.get('/lessons', requireAuth, requireTutor, async (req: AuthRequest, res) => {
  const result = await query<{ id: string; lesson_type_id: string; price_per_hour_cents: number; currency: string }>(
    'SELECT id, lesson_type_id, price_per_hour_cents, currency FROM tutor_lessons WHERE tutor_id = $1',
    [req.userId]
  );
  const withNames = await Promise.all(
    result.rows.map(async (row) => {
      const lt = await query<{ slug: string; name: unknown }>('SELECT slug, name FROM lesson_types WHERE id = $1 AND deleted_at IS NULL', [row.lesson_type_id]);
      return { ...row, lesson_type: lt.rows[0] };
    })
  );
  return success(res, { lessons: withNames });
});

// POST /api/v1/tutor/lessons
router.post('/lessons', requireAuth, requireTutor, async (req: AuthRequest, res) => {
  const { lesson_type_id, price_per_hour_cents, currency } = req.body;
  if (!lesson_type_id || typeof price_per_hour_cents !== 'number') {
    return error(res, 'VALIDATION_ERROR', 'lesson_type_id and price_per_hour_cents required', 400);
  }
  const ins = await query<{ id: string; lesson_type_id: string; price_per_hour_cents: number; currency: string }>(
    `INSERT INTO tutor_lessons (tutor_id, lesson_type_id, price_per_hour_cents, currency)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (tutor_id, lesson_type_id) DO UPDATE SET price_per_hour_cents = $3, currency = $4, updated_at = NOW()
     RETURNING id, lesson_type_id, price_per_hour_cents, currency`,
    [req.userId, lesson_type_id, price_per_hour_cents, currency || 'TRY']
  );
  const row = ins.rows[0];
  const lt = await query<{ slug: string; name: unknown }>('SELECT slug, name FROM lesson_types WHERE id = $1 AND deleted_at IS NULL', [row.lesson_type_id]);
  return success(res, { lesson: { ...row, lesson_type: lt.rows[0] }, message: 'Lesson added/updated' });
});

// GET /api/v1/tutor/lessons/:id - single lesson
router.get('/lessons/:id', requireAuth, requireTutor, async (req: AuthRequest, res) => {
  const result = await query<{ id: string; lesson_type_id: string; price_per_hour_cents: number; currency: string }>(
    'SELECT id, lesson_type_id, price_per_hour_cents, currency FROM tutor_lessons WHERE id = $1 AND tutor_id = $2',
    [req.params.id, req.userId]
  );
  if (result.rows.length === 0) return error(res, 'NOT_FOUND', 'Lesson not found', 404);
  const row = result.rows[0];
  const lt = await query<{ slug: string; name: unknown }>('SELECT slug, name FROM lesson_types WHERE id = $1 AND deleted_at IS NULL', [row.lesson_type_id]);
  return success(res, { lesson: { ...row, lesson_type: lt.rows[0] } });
});

// PUT /api/v1/tutor/lessons/:id
router.put('/lessons/:id', requireAuth, requireTutor, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { price_per_hour_cents, currency } = req.body;
  await query(
    'UPDATE tutor_lessons SET price_per_hour_cents = COALESCE($2, price_per_hour_cents), currency = COALESCE($3, currency), updated_at = NOW() WHERE id = $1 AND tutor_id = $4',
    [id, price_per_hour_cents, currency, req.userId]
  );
  const updated = await query<{ id: string; lesson_type_id: string; price_per_hour_cents: number; currency: string }>(
    'SELECT id, lesson_type_id, price_per_hour_cents, currency FROM tutor_lessons WHERE id = $1 AND tutor_id = $2',
    [id, req.userId]
  );
  if (updated.rows[0]) {
    const lt = await query<{ slug: string; name: unknown }>('SELECT slug, name FROM lesson_types WHERE id = $1 AND deleted_at IS NULL', [updated.rows[0].lesson_type_id]);
    return success(res, { lesson: { ...updated.rows[0], lesson_type: lt.rows[0] }, message: 'Lesson updated' });
  }
  return success(res, { message: 'Lesson updated' });
});

// DELETE /api/v1/tutor/lessons/:id
router.delete('/lessons/:id', requireAuth, requireTutor, async (req: AuthRequest, res) => {
  await query('DELETE FROM tutor_lessons WHERE id = $1 AND tutor_id = $2', [req.params.id, req.userId]);
  return success(res, { message: 'Lesson removed' });
});

// GET /api/v1/tutor/availability
router.get('/availability', requireAuth, requireTutor, async (req: AuthRequest, res) => {
  const result = await query<{ slots: unknown }>('SELECT slots FROM tutor_availability WHERE tutor_id = $1', [req.userId]);
  return success(res, { slots: result.rows[0]?.slots ?? [] });
});

// PUT /api/v1/tutor/availability
router.put('/availability', requireAuth, requireTutor, async (req: AuthRequest, res) => {
  const { slots } = req.body;
  const payload = Array.isArray(slots) ? slots : [];
  await query(
    `INSERT INTO tutor_availability (tutor_id, slots, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (tutor_id) DO UPDATE SET slots = $2, updated_at = NOW()`,
    [req.userId, JSON.stringify(payload)]
  );
  return success(res, { slots: payload });
});

// GET /api/v1/tutor/subscription - alias to me/subscription for tutor
router.get('/subscription', requireAuth, requireTutor, async (req: AuthRequest, res) => {
  const subResult = await query(
    `SELECT us.id, us.plan_id, us.start_date, us.end_date, us.is_active, us.is_renewing, us.is_trial, us.billing_interval, us.billing_provider
     FROM user_subscriptions us WHERE us.user_id = $1 AND us.is_active = true AND (us.end_date IS NULL OR us.end_date >= NOW()) ORDER BY us.start_date DESC LIMIT 1`,
    [req.userId]
  );
  const sub = subResult.rows[0];
  if (!sub) return success(res, { subscription: null });
  const plan = await query('SELECT id, slug, display_name, features, profile_badge FROM subscription_plans WHERE id = $1', [sub.plan_id]);
  return success(res, { subscription: { ...sub, plan: plan.rows[0] } });
});

// POST /api/v1/tutor/subscription - stub (IAP handled by mobile + /iap/verify)
router.post('/subscription', requireAuth, requireTutor, async (_req: AuthRequest, res) => {
  return success(res, { message: 'Use in-app purchase and POST /api/v1/iap/verify' });
});

// GET /api/v1/tutor/boosters
router.get('/boosters', requireAuth, requireTutor, async (req: AuthRequest, res) => {
  const result = await query(
    `SELECT ub.id, ub.booster_id, ub.activated_at, ub.expires_at, ub.is_active
     FROM user_boosters ub WHERE ub.user_id = $1 AND ub.is_active = true AND ub.expires_at >= NOW()`,
    [req.userId]
  );
  const withBooster = await Promise.all(
    result.rows.map(async (r) => {
      const b = await query<{ slug: string; display_name: unknown; search_ranking_boost: number }>(
        'SELECT slug, display_name, search_ranking_boost FROM boosters WHERE id = $1',
        [(r as { booster_id: string }).booster_id]
      );
      return { ...r, booster: b.rows[0] };
    })
  );
  return success(res, { boosters: withBooster });
});

// POST /api/v1/tutor/boosters - stub
router.post('/boosters', requireAuth, requireTutor, async (_req: AuthRequest, res) => {
  return success(res, { message: 'Use in-app purchase and POST /api/v1/iap/verify' });
});

// GET /api/v1/tutor/schools - tutor's schools (multiple)
router.get('/schools', requireAuth, requireTutor, async (req: AuthRequest, res) => {
  const result = await query<{ id: string; school_name: string }>(
    'SELECT id, school_name FROM tutor_schools WHERE tutor_id = $1 ORDER BY created_at',
    [req.userId]
  );
  return success(res, { schools: result.rows });
});

// POST /api/v1/tutor/schools - add a school (body: school_name)
router.post('/schools', requireAuth, requireTutor, async (req: AuthRequest, res) => {
  const { school_name } = req.body;
  if (!school_name || typeof school_name !== 'string' || !school_name.trim()) {
    return error(res, 'VALIDATION_ERROR', 'school_name required', 400);
  }
  const ins = await query<{ id: string; school_name: string }>(
    'INSERT INTO tutor_schools (tutor_id, school_name) VALUES ($1, $2) RETURNING id, school_name',
    [req.userId, school_name.trim()]
  );
  return success(res, { school: ins.rows[0], message: 'School added' });
});

// DELETE /api/v1/tutor/schools/:id
router.delete('/schools/:id', requireAuth, requireTutor, async (req: AuthRequest, res) => {
  await query('DELETE FROM tutor_schools WHERE id = $1 AND tutor_id = $2', [req.params.id, req.userId]);
  return success(res, { message: 'School removed' });
});

// GET /api/v1/tutor/grades - tutor's grades (multiple)
router.get('/grades', requireAuth, requireTutor, async (req: AuthRequest, res) => {
  const result = await query<{ grade_id: string }>(
    'SELECT grade_id FROM tutor_grades WHERE tutor_id = $1 ORDER BY created_at',
    [req.userId]
  );
  const withNames = await Promise.all(
    result.rows.map(async (r) => {
      const g = await query<{ id: string; name: unknown; school_type_id: string }>(
        'SELECT id, name, school_type_id FROM grades WHERE id = $1 AND deleted_at IS NULL',
        [r.grade_id]
      );
      return g.rows[0] ? { id: g.rows[0].id, name: g.rows[0].name, school_type_id: g.rows[0].school_type_id } : null;
    })
  );
  return success(res, { grades: withNames.filter(Boolean) });
});

// POST /api/v1/tutor/grades - add a grade (body: grade_id)
router.post('/grades', requireAuth, requireTutor, async (req: AuthRequest, res) => {
  const { grade_id } = req.body;
  if (!grade_id || typeof grade_id !== 'string') {
    return error(res, 'VALIDATION_ERROR', 'grade_id required', 400);
  }
  await query(
    'INSERT INTO tutor_grades (tutor_id, grade_id) VALUES ($1, $2) ON CONFLICT (tutor_id, grade_id) DO NOTHING',
    [req.userId, grade_id]
  );
  return success(res, { message: 'Grade added' });
});

// DELETE /api/v1/tutor/grades/:gradeId
router.delete('/grades/:gradeId', requireAuth, requireTutor, async (req: AuthRequest, res) => {
  await query('DELETE FROM tutor_grades WHERE tutor_id = $1 AND grade_id = $2', [req.userId, req.params.gradeId]);
  return success(res, { message: 'Grade removed' });
});

export default router;
