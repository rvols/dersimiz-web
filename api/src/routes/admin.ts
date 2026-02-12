import express, { Router } from 'express';
import { query } from '../db/pool.js';
import { success, error } from '../utils/response.js';
import { requireAdmin, AdminAuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(requireAdmin);

// Helper to safely parse count from query result
function parseCount(rows: { count?: string }[], fallback = 0): number {
  const val = rows[0]?.count;
  if (val === undefined || val === null) return fallback;
  const n = parseInt(String(val), 10);
  return Number.isNaN(n) ? fallback : n;
}

// Helper to safely parse sum from query result
function parseSum(rows: { sum?: string | null }[], fallback = 0): number {
  const val = rows[0]?.sum;
  if (val === undefined || val === null) return fallback;
  const n = parseInt(String(val), 10);
  return Number.isNaN(n) ? fallback : n;
}

// GET /api/v1/admin/stats
router.get('/stats', async (_req, res) => {
  try {
    const [
      users,
      tutors,
      students,
      approvedStudents,
      approvedTutors,
      usersWithoutAdmin,
      pending,
      tutorsWithSub,
      rejected,
      supportAwaiting,
    ] = await Promise.all([
      query<{ count: string }>('SELECT COUNT(*) as count FROM profiles WHERE deleted_at IS NULL'),
      query<{ count: string }>("SELECT COUNT(*) as count FROM profiles WHERE role = 'tutor' AND deleted_at IS NULL"),
      query<{ count: string }>("SELECT COUNT(*) as count FROM profiles WHERE role = 'student' AND deleted_at IS NULL"),
      query<{ count: string }>(
        "SELECT COUNT(*) as count FROM profiles WHERE role = 'student' AND is_approved = true AND deleted_at IS NULL"
      ),
      query<{ count: string }>(
        "SELECT COUNT(*) as count FROM profiles WHERE role = 'tutor' AND is_approved = true AND deleted_at IS NULL"
      ),
      query<{ count: string }>(
        "SELECT COUNT(*) as count FROM profiles WHERE deleted_at IS NULL AND (role IS NULL OR role IN ('tutor', 'student'))"
      ),
      query<{ count: string }>(
        'SELECT COUNT(*) as count FROM profiles WHERE is_approved = false AND COALESCE(is_rejected, false) = false AND role IS NOT NULL AND deleted_at IS NULL'
      ),
      query<{ count: string }>(
        `SELECT COUNT(DISTINCT us.user_id) as count
         FROM user_subscriptions us
         JOIN profiles p ON p.id = us.user_id AND p.role = 'tutor' AND p.deleted_at IS NULL
         WHERE us.is_active = true AND COALESCE(us.is_cancelled, false) = false
           AND (us.end_date IS NULL OR us.end_date >= NOW())`
      ),
      query<{ count: string }>(
        'SELECT COUNT(*) as count FROM profiles WHERE COALESCE(is_rejected, false) = true AND deleted_at IS NULL'
      ),
      query<{ count: string }>(
        `SELECT COUNT(DISTINCT st.id) as count
         FROM support_tickets st
         INNER JOIN support_messages sm ON sm.ticket_id = st.id AND sm.is_admin = false
         WHERE sm.created_at > GREATEST(
           COALESCE(st.admin_read_at, '1970-01-01'::timestamptz),
           COALESCE(
             (SELECT MAX(created_at) FROM support_messages WHERE ticket_id = st.id AND is_admin = true),
             '1970-01-01'::timestamptz
           )
         )`
      ),
    ]);
    const revenue = await query<{ sum: string | null }>(
      `SELECT COALESCE(SUM(amount_cents), 0) as sum FROM transactions WHERE status = 'completed'`
    );
    const totalTutors = parseCount(tutors.rows);
    const tutorsWithSubCount = parseCount(tutorsWithSub.rows);
    const tutorsSubRate = totalTutors > 0 ? Math.round((tutorsWithSubCount / totalTutors) * 100) : 0;
    return success(res, {
      total_users: parseCount(users.rows),
      total_tutors: totalTutors,
      total_students: parseCount(students.rows),
      approved_students: parseCount(approvedStudents.rows),
      approved_tutors: parseCount(approvedTutors.rows),
      total_users_without_admin: parseCount(usersWithoutAdmin.rows),
      pending_approvals: parseCount(pending.rows),
      rejected_users: parseCount(rejected.rows),
      support_tickets_awaiting_reply: parseCount(supportAwaiting.rows),
      tutors_with_subscription: tutorsWithSubCount,
      tutors_subscription_rate: tutorsSubRate,
      revenue_cents: parseSum(revenue.rows),
    });
  } catch (err) {
    console.error('[admin/stats]', err);
    return success(res, {
      total_users: 0,
      total_tutors: 0,
      total_students: 0,
      approved_students: 0,
      approved_tutors: 0,
      total_users_without_admin: 0,
      pending_approvals: 0,
      rejected_users: 0,
      support_tickets_awaiting_reply: 0,
      tutors_with_subscription: 0,
      tutors_subscription_rate: 0,
      revenue_cents: 0,
      error: 'Stats temporarily unavailable',
    });
  }
});

// GET /api/v1/admin/users
router.get('/users', async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
  const offset = (page - 1) * limit;
  const role = req.query.role as string | undefined;
  const status = req.query.status as string | undefined; // approved, pending, banned
  const search = (req.query.search as string)?.trim() || (req.query.q as string)?.trim() || '';

  let where = 'deleted_at IS NULL';
  const params: unknown[] = [];
  let i = 1;
  if (role === 'tutor' || role === 'student') {
    where += ` AND role = $${i++}`;
    params.push(role);
  }
  if (status === 'pending') {
    where += ' AND is_approved = false AND COALESCE(is_rejected, false) = false AND role IS NOT NULL';
  } else if (status === 'approved') {
    where += ' AND is_approved = true';
  } else if (status === 'rejected') {
    where += ' AND COALESCE(is_rejected, false) = true';
  } else if (status === 'banned') {
    where += ' AND is_banned = true';
  }
  if (search.length > 0) {
    where += ` AND (full_name ILIKE $${i} OR phone_number ILIKE $${i})`;
    params.push(`%${search}%`);
    i += 1;
  }

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM profiles WHERE ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0]?.count || '0', 10);

  const result = await query<{
    id: string;
    phone_number: string;
    full_name: string | null;
    role: string | null;
    is_approved: boolean;
    is_banned: boolean;
    onboarding_completed: boolean;
    created_at: Date;
  }>(
    `SELECT id, phone_number, full_name, role, is_approved, is_banned, COALESCE(is_rejected, false) as is_rejected, onboarding_completed, created_at
     FROM profiles WHERE ${where} ORDER BY created_at DESC LIMIT $${i} OFFSET $${i + 1}`,
    [...params, limit, offset]
  );

  return success(res, {
    users: result.rows,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  });
});

// GET /api/v1/admin/users/:id/profile - full profile for admin view
router.get('/users/:id/profile', async (req, res) => {
  const { id } = req.params;
  const profileResult = await query<{
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
    'SELECT id, phone_number, country_code, role, full_name, school_name, grade_id, avatar_url, is_approved, is_banned, COALESCE(is_rejected, false) as is_rejected, onboarding_completed, created_at, updated_at FROM profiles WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  if (profileResult.rows.length === 0) {
    return error(res, 'USER_NOT_FOUND', 'User not found', 404);
  }
  const profile = profileResult.rows[0];
  const userId = profile.id;

  const [
    tutorSchools,
    tutorGrades,
    tutorLessons,
    tutorAvailability,
    subscription,
    boosters,
    transactions,
    userAgreements,
    onboardingData,
  ] = await Promise.all([
    profile.role === 'tutor'
      ? query<{ id: string; school_name: string }>(
          'SELECT id, school_name FROM tutor_schools WHERE tutor_id = $1 ORDER BY created_at',
          [userId]
        )
      : Promise.resolve({ rows: [] }),
    profile.role === 'tutor'
      ? query<{ grade_id: string }>(
          'SELECT grade_id FROM tutor_grades WHERE tutor_id = $1 ORDER BY created_at',
          [userId]
        )
      : Promise.resolve({ rows: [] }),
    profile.role === 'tutor'
      ? query<{
          id: string;
          lesson_type_id: string;
          price_per_hour_cents: number;
          currency: string;
        }>(
          `SELECT tl.id, tl.lesson_type_id, tl.price_per_hour_cents, tl.currency
           FROM tutor_lessons tl WHERE tl.tutor_id = $1`,
          [userId]
        )
      : Promise.resolve({ rows: [] }),
    profile.role === 'tutor'
      ? query<{ slots: unknown }>('SELECT slots FROM tutor_availability WHERE tutor_id = $1', [userId])
      : Promise.resolve({ rows: [] }),
    query<{
      id: string;
      plan_id: string;
      start_date: Date;
      end_date: Date | null;
      is_active: boolean;
      plan_slug: string;
      plan_name: unknown;
    }>(
      `SELECT us.id, us.plan_id, us.start_date, us.end_date, us.is_active, sp.slug as plan_slug, sp.display_name as plan_name
       FROM user_subscriptions us
       LEFT JOIN subscription_plans sp ON sp.id = us.plan_id
       WHERE us.user_id = $1 ORDER BY us.start_date DESC LIMIT 1`,
      [userId]
    ),
    query<{
      id: string;
      booster_id: string;
      activated_at: Date;
      expires_at: Date;
      is_active: boolean;
      display_name: unknown;
    }>(
      `SELECT ub.id, ub.booster_id, ub.activated_at, ub.expires_at, ub.is_active, b.display_name
       FROM user_boosters ub
       LEFT JOIN boosters b ON b.id = ub.booster_id
       WHERE ub.user_id = $1 ORDER BY ub.activated_at DESC`,
      [userId]
    ),
    query<{
      id: string;
      type: string;
      amount_cents: number;
      currency: string;
      status: string;
      created_at: Date;
    }>(
      'SELECT id, type, amount_cents, currency, status, created_at FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [userId]
    ),
    query<{
      legal_document_id: string;
      accepted_at: Date;
      ip_address: string;
      type: string;
      title: string;
    }>(
      `SELECT ua.legal_document_id, ua.accepted_at, ua.ip_address, ld.type, ld.title
       FROM user_agreements ua
       JOIN legal_documents ld ON ld.id = ua.legal_document_id
       WHERE ua.user_id = $1 ORDER BY ua.accepted_at DESC`,
      [userId]
    ),
    query<{ data: unknown }>('SELECT data FROM onboarding_progress WHERE user_id = $1', [userId]),
  ]);

  const gradesWithNames = await Promise.all(
    tutorGrades.rows.map(async (r) => {
      const g = await query<{
        id: string;
        name: unknown;
        school_type_id: string;
        school_type_name: unknown;
      }>(
        `SELECT g.id, g.name, g.school_type_id, st.name as school_type_name
         FROM grades g
         LEFT JOIN school_types st ON st.id = g.school_type_id
         WHERE g.id = $1 AND g.deleted_at IS NULL`,
        [r.grade_id]
      );
      return g.rows[0] ? { ...g.rows[0], grade_id: r.grade_id } : null;
    })
  );

  const lessonsWithNames = await Promise.all(
    tutorLessons.rows.map(async (l) => {
      const lt = await query<{ name: unknown; slug: string }>(
        'SELECT name, slug FROM lesson_types WHERE id = $1 AND deleted_at IS NULL',
        [l.lesson_type_id]
      );
      return {
        id: l.id,
        lesson_type_id: l.lesson_type_id,
        lesson_type_name: lt.rows[0]?.name,
        lesson_type_slug: lt.rows[0]?.slug,
        price_per_hour_cents: l.price_per_hour_cents,
        currency: l.currency,
      };
    })
  );

  const gradeId = profile.grade_id;
  let studentGradeName: unknown = null;
  if (gradeId) {
    const g = await query<{ name: unknown }>('SELECT name FROM grades WHERE id = $1 AND deleted_at IS NULL', [gradeId]);
    studentGradeName = g.rows[0]?.name;
  }

  const rawOnboarding = onboardingData.rows[0]?.data ?? {};
  const onboardingDataObj = rawOnboarding as Record<string, unknown>;
  const locationId = onboardingDataObj?.location_id as string | undefined;
  let locationPath: string | null = null;
  if (typeof locationId === 'string' && locationId) {
    const locale = (res as express.Response & { locals: { locale?: 'tr' | 'en' } }).locals?.locale ?? 'tr';
    const pathResult = await query<{ location_path: string | null }>(
      `WITH RECURSIVE path AS (
        SELECT id, parent_id, name, 1 as depth
        FROM locations
        WHERE id = $1::uuid AND deleted_at IS NULL
        UNION ALL
        SELECT l.id, l.parent_id, l.name, p.depth + 1
        FROM locations l
        JOIN path p ON p.parent_id = l.id
        WHERE l.deleted_at IS NULL
      )
      SELECT string_agg(
        COALESCE(name->>$2, name->>'tr', name->>'en', ''),
        ' > ' ORDER BY depth DESC
      ) as location_path
      FROM path`,
      [locationId, locale]
    );
    locationPath = pathResult.rows[0]?.location_path ?? null;
  }
  const onboarding_data = { ...onboardingDataObj, location_path: locationPath };

  // Rewrite avatar URLs to use request host — stored URL may have different host (e.g. mobile uploaded to 192.168.x.x)
  const apiBase = process.env.BASE_URL || (req.protocol + '://' + (req.get('host') || `localhost:${process.env.PORT || 3000}`));
  let avatar_url = profile.avatar_url;
  let avatar_path: string | null = null;
  if (profile.avatar_url) {
    const path = profile.avatar_url.startsWith('http') ? new URL(profile.avatar_url).pathname : profile.avatar_url.startsWith('/') ? profile.avatar_url : `/${profile.avatar_url}`;
    avatar_path = path;
    avatar_url = `${apiBase.replace(/\/$/, '')}${path}`;
  }

  return success(res, {
    profile: {
      ...profile,
      avatar_url,
      avatar_path,
      student_grade_name: studentGradeName,
    },
    schools: tutorSchools.rows,
    grades: gradesWithNames.filter(Boolean),
    lessons: lessonsWithNames,
    availability: tutorAvailability.rows[0]?.slots ?? [],
    subscription: subscription.rows[0] || null,
    boosters: boosters.rows,
    transactions: transactions.rows,
    legal_docs: userAgreements.rows,
    onboarding_data,
  });
});

const APPROVAL_REJECTION_SUBJECT = 'Approval process';

// POST /api/v1/admin/users/:id/approve
router.post('/users/:id/approve', async (req, res) => {
  const { id } = req.params;
  await query(
    'UPDATE profiles SET is_approved = true, is_rejected = false, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  const r = await query('SELECT id FROM profiles WHERE id = $1', [id]);
  if (r.rows.length === 0) {
    return error(res, 'NOT_FOUND', 'User not found', 404);
  }
  const pref = await query<{ approval_status: boolean }>(
    'SELECT approval_status FROM notification_preferences WHERE user_id = $1',
    [id]
  );
  const shouldNotify = pref.rows.length === 0 || pref.rows[0].approval_status;
  if (shouldNotify) {
    await query(
      `INSERT INTO notifications_log (user_id, type, title, body, data) VALUES ($1, 'approval_status', $2, $3, $4)`,
      [id, 'Approval status', 'Your profile has been approved. You can now appear in search.', JSON.stringify({ status: 'approved' })]
    );
  }
  return success(res, { message: 'User approved' });
});

// POST /api/v1/admin/users/:id/reject - requires reason, creates support ticket with reason
router.post('/users/:id/reject', async (req: AdminAuthRequest, res) => {
  const { id } = req.params;
  const { reason } = req.body || {};
  const reasonTrimmed = typeof reason === 'string' ? reason.trim() : '';
  if (!reasonTrimmed) {
    return error(res, 'VALIDATION_ERROR', 'reason is required', 400);
  }
  const profileCheck = await query<{ id: string }>('SELECT id FROM profiles WHERE id = $1 AND deleted_at IS NULL', [id]);
  if (profileCheck.rows.length === 0) {
    return error(res, 'NOT_FOUND', 'User not found', 404);
  }
  await query(
    'UPDATE profiles SET is_approved = false, is_rejected = true, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  const ins = await query<{ id: string }>(
    'INSERT INTO support_tickets (user_id, status, subject) VALUES ($1, $2, $3) RETURNING id',
    [id, 'open', APPROVAL_REJECTION_SUBJECT]
  );
  const ticketId = ins.rows[0].id;
  await query(
    'INSERT INTO support_messages (ticket_id, is_admin, admin_user_id, body) VALUES ($1, true, $2, $3)',
    [ticketId, req.adminId, reasonTrimmed]
  );
  const pref = await query<{ support_reply: boolean; approval_status: boolean }>(
    'SELECT support_reply, approval_status FROM notification_preferences WHERE user_id = $1',
    [id]
  );
  const prefs = pref.rows[0];
  const shouldSupportNotify = !prefs || prefs.support_reply;
  const shouldApprovalNotify = !prefs || prefs.approval_status;
  if (shouldSupportNotify) {
    await query(
      `INSERT INTO notifications_log (user_id, type, title, body, data) VALUES ($1, 'support_reply', $2, $3, $4)`,
      [id, 'Approval process', reasonTrimmed.slice(0, 200), JSON.stringify({ ticket_id: ticketId })]
    );
  }
  if (shouldApprovalNotify) {
    await query(
      `INSERT INTO notifications_log (user_id, type, title, body, data) VALUES ($1, 'approval_status', $2, $3, $4)`,
      [id, 'Approval status', 'Your profile has been rejected. View the reason in Support.', JSON.stringify({ status: 'rejected', ticket_id: ticketId })]
    );
  }
  return success(res, { message: 'User rejected', ticket_id: ticketId });
});

// POST /api/v1/admin/users/:id/ban
router.post('/users/:id/ban', async (req, res) => {
  const { id } = req.params;
  await query(
    'UPDATE profiles SET is_banned = true, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  return success(res, { message: 'User banned' });
});

// POST /api/v1/admin/users/:id/reset-onboarding
router.post('/users/:id/reset-onboarding', async (req, res) => {
  const { id } = req.params;
  await query(
    'UPDATE profiles SET onboarding_completed = false, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  const r = await query('SELECT id FROM profiles WHERE id = $1', [id]);
  if (r.rows.length === 0) {
    return error(res, 'NOT_FOUND', 'User not found', 404);
  }
  return success(res, { message: 'Onboarding reset' });
});

// PUT /api/v1/admin/users/:id/profile - edit profile (full_name, role, school_name, grade_id, onboarding_completed, location_id)
router.put('/users/:id/profile', async (req, res) => {
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

// PUT /api/v1/admin/users/:id/availability - tutor availability slots
router.put('/users/:id/availability', async (req, res) => {
  const { id } = req.params;
  const { slots } = req.body || {};
  const profile = await query<{ role: string | null }>('SELECT role FROM profiles WHERE id = $1 AND deleted_at IS NULL', [id]);
  if (profile.rows.length === 0) return error(res, 'USER_NOT_FOUND', 'User not found', 404);
  if (profile.rows[0].role !== 'tutor') return error(res, 'VALIDATION_ERROR', 'User is not a tutor', 400);
  const payload = Array.isArray(slots) ? slots : [];
  await query(
    `INSERT INTO tutor_availability (tutor_id, slots, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (tutor_id) DO UPDATE SET slots = $2, updated_at = NOW()`,
    [id, JSON.stringify(payload)]
  );
  return success(res, { slots: payload });
});

// PUT /api/v1/admin/users/:id/schools - tutor schools and grades
router.put('/users/:id/schools', async (req, res) => {
  const { id } = req.params;
  const { schools, grade_ids } = req.body || {};
  const profile = await query<{ role: string | null }>('SELECT role FROM profiles WHERE id = $1 AND deleted_at IS NULL', [id]);
  if (profile.rows.length === 0) return error(res, 'USER_NOT_FOUND', 'User not found', 404);
  if (profile.rows[0].role !== 'tutor') return error(res, 'VALIDATION_ERROR', 'User is not a tutor', 400);
  if (Array.isArray(schools)) {
    await query('DELETE FROM tutor_schools WHERE tutor_id = $1', [id]);
    for (const sn of schools) {
      const name = typeof sn === 'string' ? sn.trim() : String(sn || '').trim();
      if (name) {
        await query('INSERT INTO tutor_schools (tutor_id, school_name) VALUES ($1, $2)', [id, name]);
      }
    }
  }
  if (Array.isArray(grade_ids)) {
    await query('DELETE FROM tutor_grades WHERE tutor_id = $1', [id]);
    for (const gid of grade_ids) {
      if (typeof gid === 'string' && gid) {
        await query(
          'INSERT INTO tutor_grades (tutor_id, grade_id) VALUES ($1, $2) ON CONFLICT (tutor_id, grade_id) DO NOTHING',
          [id, gid]
        );
      }
    }
  }
  return success(res, { message: 'Schools and grades updated' });
});

// PUT /api/v1/admin/users/:id/lessons - tutor lessons (replace all)
router.put('/users/:id/lessons', async (req, res) => {
  const { id } = req.params;
  const { lessons } = req.body || {};
  const profile = await query<{ role: string | null }>('SELECT role FROM profiles WHERE id = $1 AND deleted_at IS NULL', [id]);
  if (profile.rows.length === 0) return error(res, 'USER_NOT_FOUND', 'User not found', 404);
  if (profile.rows[0].role !== 'tutor') return error(res, 'VALIDATION_ERROR', 'User is not a tutor', 400);
  const items = Array.isArray(lessons) ? lessons : [];
  await query('DELETE FROM tutor_lessons WHERE tutor_id = $1', [id]);
  for (const l of items) {
    const ltId = l?.lesson_type_id ?? l?.lesson_type;
    const price = l?.price_per_hour_cents ?? l?.price_cents;
    const currency = l?.currency ?? 'TRY';
    if (typeof ltId === 'string' && typeof price === 'number' && price >= 0) {
      await query(
        `INSERT INTO tutor_lessons (tutor_id, lesson_type_id, price_per_hour_cents, currency)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (tutor_id, lesson_type_id) DO UPDATE SET price_per_hour_cents = $3, currency = $4, updated_at = NOW()`,
        [id, ltId, price, currency]
      );
    }
  }
  return success(res, { message: 'Lessons updated' });
});

// GET /api/v1/admin/support-tickets/count - tickets with unread user messages (needs admin attention)
router.get('/support-tickets/count', async (_req, res) => {
  const r = await query<{ count: string }>(`
    SELECT COUNT(DISTINCT st.id) as count
    FROM support_tickets st
    INNER JOIN support_messages sm ON sm.ticket_id = st.id AND sm.is_admin = false
    WHERE sm.created_at > GREATEST(
      COALESCE(st.admin_read_at, '1970-01-01'::timestamptz),
      COALESCE(
        (SELECT MAX(created_at) FROM support_messages WHERE ticket_id = st.id AND is_admin = true),
        '1970-01-01'::timestamptz
      )
    )
  `);
  return success(res, { count: parseInt(r.rows[0]?.count || '0', 10) });
});

// GET /api/v1/admin/support-tickets/:id - single ticket with messages and unread count
router.get('/support-tickets/:id', async (req, res) => {
  const { id } = req.params;
  const ticketResult = await query<{
    id: string;
    user_id: string;
    status: string;
    subject: string | null;
    created_at: Date;
    updated_at: Date;
  }>('SELECT id, user_id, status, subject, created_at, updated_at FROM support_tickets WHERE id = $1', [id]);
  if (ticketResult.rows.length === 0) {
    return error(res, 'NOT_FOUND', 'Ticket not found', 404);
  }
  const ticket = ticketResult.rows[0];
  await query('UPDATE support_tickets SET admin_read_at = NOW(), updated_at = NOW() WHERE id = $1', [id]);
  const userResult = await query<{ full_name: string | null; phone_number: string }>(
    'SELECT full_name, phone_number FROM profiles WHERE id = $1',
    [ticket.user_id]
  );
  const messagesResult = await query<{
    id: string;
    ticket_id: string;
    sender_id: string | null;
    is_admin: boolean;
    body: string;
    created_at: Date;
  }>(
    'SELECT id, ticket_id, sender_id, is_admin, body, created_at FROM support_messages WHERE ticket_id = $1 ORDER BY created_at ASC',
    [id]
  );
  const unreadFromUser = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM support_messages sm
     WHERE sm.ticket_id = $1 AND sm.is_admin = false
     AND sm.created_at > GREATEST(
       COALESCE((SELECT admin_read_at FROM support_tickets WHERE id = $1), '1970-01-01'::timestamptz),
       COALESCE(
         (SELECT MAX(created_at) FROM support_messages WHERE ticket_id = $1 AND is_admin = true),
         '1970-01-01'::timestamptz
       )
     )`,
    [id]
  );
  const unread_count = parseInt(unreadFromUser.rows[0]?.count || '0', 10);
  return success(res, {
    ticket: {
      ...ticket,
      user: userResult.rows[0] || null,
      unread_count,
    },
    messages: messagesResult.rows,
  });
});

// GET /api/v1/admin/support-tickets - with pagination, filters
router.get('/support-tickets', async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
  const offset = (page - 1) * limit;
  const status = req.query.status as string | undefined;
  const search = (req.query.search as string)?.trim() || (req.query.q as string)?.trim() || '';

  let where = '1=1';
  const params: unknown[] = [];
  let i = 1;
  if (status === 'open' || status === 'replied' || status === 'closed') {
    where += ` AND st.status = $${i++}`;
    params.push(status);
  }
  if (search.length > 0) {
    where += ` AND (p.full_name ILIKE $${i} OR p.phone_number ILIKE $${i} OR st.subject ILIKE $${i})`;
    params.push(`%${search}%`);
    i += 1;
  }

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM support_tickets st
     JOIN profiles p ON p.id = st.user_id AND p.deleted_at IS NULL
     WHERE ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0]?.count || '0', 10);

  params.push(limit, offset);
  const result = await query<{
    id: string;
    user_id: string;
    status: string;
    subject: string | null;
    created_at: Date;
    updated_at: Date;
    full_name: string | null;
    phone_number: string;
  }>(
    `SELECT st.id, st.user_id, st.status, st.subject, st.created_at, st.updated_at, p.full_name, p.phone_number
     FROM support_tickets st
     JOIN profiles p ON p.id = st.user_id AND p.deleted_at IS NULL
     WHERE ${where}
     ORDER BY st.updated_at DESC
     LIMIT $${i} OFFSET $${i + 1}`,
    params
  );

  const tickets = await Promise.all(
    result.rows.map(async (t) => {
      const unread = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM support_messages sm
         WHERE sm.ticket_id = $1 AND sm.is_admin = false
         AND sm.created_at > GREATEST(
           COALESCE((SELECT admin_read_at FROM support_tickets WHERE id = $1), '1970-01-01'::timestamptz),
           COALESCE(
             (SELECT MAX(created_at) FROM support_messages WHERE ticket_id = $1 AND is_admin = true),
             '1970-01-01'::timestamptz
           )
         )`,
        [t.id]
      );
      return {
        id: t.id,
        user_id: t.user_id,
        status: t.status,
        subject: t.subject,
        created_at: t.created_at,
        updated_at: t.updated_at,
        user: { full_name: t.full_name, phone_number: t.phone_number },
        unread_count: parseInt(unread.rows[0]?.count || '0', 10),
      };
    })
  );

  return success(res, {
    tickets,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
  });
});

// POST /api/v1/admin/support-tickets - create ticket for user
router.post('/support-tickets', async (req: AdminAuthRequest, res) => {
  const { user_id, subject, body } = req.body || {};
  if (!user_id) return error(res, 'VALIDATION_ERROR', 'user_id is required', 400);
  const sub = typeof subject === 'string' ? subject.trim() : '';
  if (!sub) return error(res, 'VALIDATION_ERROR', 'subject is required', 400);
  const userCheck = await query<{ id: string }>('SELECT id FROM profiles WHERE id = $1 AND deleted_at IS NULL', [
    user_id,
  ]);
  if (userCheck.rows.length === 0) return error(res, 'NOT_FOUND', 'User not found', 404);
  const ins = await query<{ id: string }>(
    'INSERT INTO support_tickets (user_id, status, subject) VALUES ($1, $2, $3) RETURNING id',
    [user_id, 'open', sub]
  );
  const ticketId = ins.rows[0].id;
  const bodyTrimmed = body && typeof body === 'string' ? body.trim() : '';
  if (bodyTrimmed) {
    await query(
      'INSERT INTO support_messages (ticket_id, is_admin, admin_user_id, body) VALUES ($1, true, $2, $3)',
      [ticketId, req.adminId, bodyTrimmed]
    );
  }
  const pref = await query<{ support_reply: boolean }>(
    'SELECT support_reply FROM notification_preferences WHERE user_id = $1',
    [user_id]
  );
  const shouldNotify = pref.rows.length === 0 || pref.rows[0].support_reply;
  if (shouldNotify) {
    const title = bodyTrimmed ? 'Support message' : 'Support created a ticket';
    const notifBody = bodyTrimmed ? bodyTrimmed.slice(0, 200) : `Subject: ${sub}`;
    await query(
      `INSERT INTO notifications_log (user_id, type, title, body, data) VALUES ($1, 'support_reply', $2, $3, $4)`,
      [user_id, title, notifBody, JSON.stringify({ ticket_id: ticketId })]
    );
  }
  const t = await query<{ id: string; user_id: string; status: string; subject: string; created_at: Date }>(
    'SELECT id, user_id, status, subject, created_at FROM support_tickets WHERE id = $1',
    [ticketId]
  );
  return success(res, { ticket: t.rows[0] });
});

// PUT /api/v1/admin/support-tickets/:id/status - update ticket status
router.put('/support-tickets/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};
  if (!['open', 'replied', 'closed'].includes(status)) {
    return error(res, 'VALIDATION_ERROR', 'Invalid status', 400);
  }
  const ticketResult = await query<{ id: string }>('SELECT id FROM support_tickets WHERE id = $1', [id]);
  if (ticketResult.rows.length === 0) return error(res, 'NOT_FOUND', 'Ticket not found', 404);
  await query('UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);
  return success(res, { status });
});

// POST /api/v1/admin/support-tickets/:id/reply
router.post('/support-tickets/:id/reply', async (req: AdminAuthRequest, res) => {
  const { id } = req.params;
  const { body } = req.body || {};
  if (!body || typeof body !== 'string') {
    return error(res, 'VALIDATION_ERROR', 'body is required', 400);
  }
  const ticketResult = await query<{ id: string; user_id: string }>(
    'SELECT id, user_id FROM support_tickets WHERE id = $1',
    [id]
  );
  if (ticketResult.rows.length === 0) {
    return error(res, 'NOT_FOUND', 'Ticket not found', 404);
  }
  const userId = ticketResult.rows[0].user_id;
  await query(
    'INSERT INTO support_messages (ticket_id, is_admin, admin_user_id, body) VALUES ($1, true, $2, $3)',
    [id, req.adminId, body]
  );
  await query('UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2', [
    'replied',
    id,
  ]);
  const pref = await query<{ support_reply: boolean }>(
    'SELECT support_reply FROM notification_preferences WHERE user_id = $1',
    [userId]
  );
  const shouldNotify = pref.rows.length === 0 || pref.rows[0].support_reply;
  if (shouldNotify) {
    await query(
      `INSERT INTO notifications_log (user_id, type, title, body, data) VALUES ($1, 'support_reply', $2, $3, $4)`,
      [userId, 'Support replied', body.slice(0, 200), JSON.stringify({ ticket_id: id })]
    );
  }
  return success(res, { message: 'Reply sent' });
});

// GET /api/v1/admin/subscription-plans
router.get('/subscription-plans', async (_req, res) => {
  const result = await query(
    'SELECT * FROM subscription_plans ORDER BY sort_order ASC'
  );
  return success(res, { plans: result.rows });
});

// GET /api/v1/admin/boosters
router.get('/boosters', async (_req, res) => {
  const result = await query('SELECT * FROM boosters ORDER BY sort_order ASC');
  return success(res, { boosters: result.rows });
});

// PUT /api/v1/admin/boosters/:id
router.put('/boosters/:id', async (req, res) => {
  const { id } = req.params;
  const body = req.body;
  await query(
    `UPDATE boosters SET slug = COALESCE($2, slug), display_name = COALESCE($3, display_name),
      description = COALESCE($4, description), price_cents = COALESCE($5, price_cents),
      duration_days = COALESCE($6, duration_days), search_ranking_boost = COALESCE($7, search_ranking_boost),
      is_active = COALESCE($8, is_active), sort_order = COALESCE($9, sort_order),
      apple_product_id = COALESCE($10, apple_product_id), google_product_id = COALESCE($11, google_product_id),
      icon = COALESCE($12, icon), updated_at = NOW()
     WHERE id = $1`,
    [
      id,
      body.slug,
      body.display_name ? JSON.stringify(body.display_name) : null,
      body.description ? JSON.stringify(body.description) : null,
      body.price_cents,
      body.duration_days,
      body.search_ranking_boost,
      body.is_active,
      body.sort_order,
      body.apple_product_id,
      body.google_product_id,
      body.icon,
    ]
  );
  return success(res, { message: 'Booster updated' });
});

// POST /api/v1/admin/subscription-plans
router.post('/subscription-plans', async (req, res) => {
  const body = req.body;
  await query(
    `INSERT INTO subscription_plans (slug, display_name, description, monthly_price_cents, yearly_price_cents,
      apple_product_id_monthly, apple_product_id_yearly, google_product_id_monthly, google_product_id_yearly,
      features, max_students, search_visibility_boost, profile_badge, is_active, is_default, sort_order, icon)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
    [
      body.slug,
      JSON.stringify(body.display_name || {}),
      JSON.stringify(body.description || {}),
      body.monthly_price_cents ?? 0,
      body.yearly_price_cents ?? 0,
      body.apple_product_id_monthly ?? null,
      body.apple_product_id_yearly ?? null,
      body.google_product_id_monthly ?? null,
      body.google_product_id_yearly ?? null,
      JSON.stringify(body.features || []),
      body.max_students ?? null,
      body.search_visibility_boost ?? 0,
      body.profile_badge ?? null,
      body.is_active !== false,
      body.is_default === true,
      body.sort_order ?? 0,
      body.icon ?? null,
    ]
  );
  return success(res, { message: 'Plan created' });
});

// PUT /api/v1/admin/subscription-plans/:id
router.put('/subscription-plans/:id', async (req, res) => {
  const { id } = req.params;
  const body = req.body;
  await query(
    `UPDATE subscription_plans SET slug = COALESCE($2, slug), display_name = COALESCE($3, display_name),
      description = COALESCE($4, description), monthly_price_cents = COALESCE($5, monthly_price_cents),
      yearly_price_cents = COALESCE($6, yearly_price_cents), features = COALESCE($7, features),
      max_students = COALESCE($8, max_students), search_visibility_boost = COALESCE($9, search_visibility_boost),
      profile_badge = COALESCE($10, profile_badge), is_active = COALESCE($11, is_active),
      sort_order = COALESCE($12, sort_order), icon = COALESCE($13, icon), updated_at = NOW()
     WHERE id = $1`,
    [
      id,
      body.slug,
      body.display_name ? JSON.stringify(body.display_name) : null,
      body.description ? JSON.stringify(body.description) : null,
      body.monthly_price_cents,
      body.yearly_price_cents,
      body.features ? JSON.stringify(body.features) : null,
      body.max_students,
      body.search_visibility_boost,
      body.profile_badge,
      body.is_active,
      body.sort_order,
      body.icon,
    ]
  );
  return success(res, { message: 'Plan updated' });
});

// GET /api/v1/admin/subscriptions
router.get('/subscriptions', async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const limit = Math.min(50, parseInt(String(req.query.limit), 10) || 20);
  const offset = (page - 1) * limit;
  const status = req.query.status as string | undefined;
  let where = '1=1';
  if (status === 'active') where += " AND us.is_active = true AND (us.end_date IS NULL OR us.end_date >= NOW())";
  const count = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM user_subscriptions us WHERE ${where}`
  );
  const result = await query(
    `SELECT us.*, p.full_name, p.phone_number, sp.slug as plan_slug, sp.display_name as plan_name
     FROM user_subscriptions us
     JOIN profiles p ON p.id = us.user_id AND p.deleted_at IS NULL
     JOIN subscription_plans sp ON sp.id = us.plan_id
     WHERE ${where} ORDER BY us.created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return success(res, {
    subscriptions: result.rows,
    pagination: { total: parseInt(count.rows[0]?.count || '0', 10), page, limit, pages: Math.ceil(parseInt(count.rows[0]?.count || '0', 10) / limit) },
  });
});

// GET /api/v1/admin/transactions
router.get('/transactions', async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const limit = Math.min(50, parseInt(String(req.query.limit), 10) || 20);
  const offset = (page - 1) * limit;
  const type = req.query.type as string | undefined;
  const status = req.query.status as string | undefined;
  let where = '1=1';
  const params: unknown[] = [];
  let i = 1;
  if (type) { where += ` AND t.type = $${i++}`; params.push(type); }
  if (status) { where += ` AND t.status = $${i++}`; params.push(status); }
  const count = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM transactions t WHERE ${where}`,
    params
  );
  const limitIdx = i;
  const offsetIdx = i + 1;
  params.push(limit, offset);
  const result = await query(
    `SELECT t.*, p.full_name, p.phone_number FROM transactions t
     JOIN profiles p ON p.id = t.user_id AND p.deleted_at IS NULL
     WHERE ${where} ORDER BY t.created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params
  );
  return success(res, {
    transactions: result.rows,
    pagination: { total: parseInt(count.rows[0]?.count || '0', 10), page, limit, pages: Math.ceil(parseInt(count.rows[0]?.count || '0', 10) / limit) },
  });
});

// POST /api/v1/admin/transactions/simulate-purchase - simulate successful Apple/Google purchase (for testing without IAP)
router.post('/transactions/simulate-purchase', async (req, res) => {
  const { user_id, plan_id, billing_interval = 'monthly' } = req.body || {};
  if (!user_id || !plan_id) return error(res, 'VALIDATION_ERROR', 'user_id and plan_id required', 400);
  if (billing_interval !== 'monthly' && billing_interval !== 'yearly') {
    return error(res, 'VALIDATION_ERROR', 'billing_interval must be monthly or yearly', 400);
  }

  const userCheck = await query<{ id: string }>('SELECT id FROM profiles WHERE id = $1 AND deleted_at IS NULL', [user_id]);
  if (userCheck.rows.length === 0) return error(res, 'NOT_FOUND', 'User not found', 404);

  const planResult = await query<{ id: string; slug: string; monthly_price_cents: number; yearly_price_cents: number }>(
    'SELECT id, slug, monthly_price_cents, yearly_price_cents FROM subscription_plans WHERE id = $1 AND is_active = true',
    [plan_id]
  );
  if (planResult.rows.length === 0) return error(res, 'NOT_FOUND', 'Plan not found', 404);

  const plan = planResult.rows[0];
  const isYearly = billing_interval === 'yearly';
  const amountCents = isYearly ? plan.yearly_price_cents : plan.monthly_price_cents;
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + (isYearly ? 12 : 1));

  const txId = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const subResult = await query(
    `INSERT INTO user_subscriptions (user_id, plan_id, start_date, end_date, is_active, is_renewing, is_cancelled, is_trial, billing_interval, billing_provider, provider_transaction_id, provider_receipt)
     VALUES ($1, $2, NOW(), $3, true, true, false, false, $4, 'simulated', $5, $6)
     RETURNING id`,
    [user_id, plan_id, endDate, billing_interval, txId, JSON.stringify({ simulated: true })]
  );
  const subId = (subResult.rows[0] as { id: string }).id;

  await query(
    `INSERT INTO transactions (user_id, type, amount_cents, currency, status, billing_provider, provider_transaction_id, provider_receipt, subscription_id)
     VALUES ($1, 'subscription', $2, 'TRY', 'completed', 'simulated', $3, $4, $5)`,
    [user_id, amountCents, txId, JSON.stringify({ simulated: true }), subId]
  );

  return success(res, {
    message: 'Simulated purchase completed',
    subscription_id: subId,
    plan_slug: plan.slug,
    amount_cents: amountCents,
    billing_interval: billing_interval,
  });
});

// POST /api/v1/admin/transactions/:id/refund - simulate Apple/Google refund: mark transaction refunded, cancel linked subscription
router.post('/transactions/:id/refund', async (req, res) => {
  const { id } = req.params;
  const txResult = await query<{ id: string; status: string; subscription_id: string | null; user_id: string }>(
    'SELECT id, status, subscription_id, user_id FROM transactions WHERE id = $1',
    [id]
  );
  if (txResult.rows.length === 0) {
    return error(res, 'NOT_FOUND', 'Transaction not found', 404);
  }
  const tx = txResult.rows[0];
  if (tx.status === 'refunded' || tx.status === 'cancelled') {
    return error(res, 'VALIDATION_ERROR', 'Transaction already refunded or cancelled', 400);
  }
  await query(
    "UPDATE transactions SET status = 'refunded', updated_at = NOW() WHERE id = $1",
    [id]
  );
  if (tx.subscription_id) {
    await query(
      `UPDATE user_subscriptions SET is_active = false, is_renewing = false, is_cancelled = true, cancelled_at = NOW(), cancellation_reason = 'refund', updated_at = NOW() WHERE id = $1`,
      [tx.subscription_id]
    );
  }
  return success(res, { message: 'Transaction refunded; subscription cancelled if any' });
});

// GET /api/v1/admin/legal
router.get('/legal', async (_req, res) => {
  const result = await query(
    `SELECT ld.id, ld.type, ld.version, ld.title, ld.published_at, ld.created_at,
            au.id AS created_by_id, au.full_name AS created_by_name, au.email AS created_by_email
     FROM legal_documents ld
     LEFT JOIN admin_users au ON au.id = ld.created_by
     ORDER BY ld.type, ld.version DESC`
  );
  const byType: Record<string, { latest: unknown; all_versions: unknown[] }> = {};
  type Row = {
    type: string;
    version: number;
    id: string;
    title: string;
    published_at: string;
    created_at: string;
    created_by_id: string | null;
    created_by_name: string | null;
    created_by_email: string | null;
  };
  for (const row of result.rows as Row[]) {
    if (!byType[row.type]) byType[row.type] = { latest: null, all_versions: [] };
    const summary = {
      id: row.id,
      version: row.version,
      title: row.title,
      published_at: row.published_at,
      created_at: row.created_at,
      ...(row.created_by_id && {
        created_by: {
          id: row.created_by_id,
          name: row.created_by_name ?? undefined,
          email: row.created_by_email ?? undefined,
        },
      }),
    };
    (byType[row.type].all_versions as unknown[]).push(summary);
  }
  for (const t of Object.keys(byType)) {
    const versions = byType[t].all_versions as { version: number }[];
    const latestVer = Math.max(...versions.map((v) => v.version));
    byType[t].latest = versions.find((v) => v.version === latestVer) ?? null;
  }
  return success(res, byType);
});

// POST /api/v1/admin/legal
router.post('/legal', async (req: AdminAuthRequest, res) => {
  const { type, title, body_markdown } = req.body;
  if (!['terms_and_conditions', 'privacy_notice', 'cookie_policy', 'acceptable_usage_policy'].includes(type)) {
    return error(res, 'VALIDATION_ERROR', 'Invalid type', 400);
  }
  if (!title || !body_markdown) return error(res, 'VALIDATION_ERROR', 'title and body_markdown required', 400);
  const maxVer = await query<{ max: string | null }>(
    'SELECT MAX(version) as max FROM legal_documents WHERE type = $1',
    [type]
  );
  const version = (parseInt(maxVer.rows[0]?.max || '0', 10)) + 1;
  const ins = await query(
    'INSERT INTO legal_documents (type, version, title, body_markdown, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id, type, version, title, published_at',
    [type, version, title, body_markdown, req.adminId]
  );
  return success(res, ins.rows[0]);
});

// GET /api/v1/admin/legal/:id
router.get('/legal/:id', async (req, res) => {
  const doc = await query<{
    id: string;
    type: string;
    version: number;
    title: string;
    body_markdown: string;
    published_at: string;
    created_at: string;
    created_by: string | null;
  }>(
    'SELECT id, type, version, title, body_markdown, published_at, created_at, created_by FROM legal_documents WHERE id = $1',
    [req.params.id]
  );
  if (doc.rows.length === 0) return error(res, 'NOT_FOUND', 'Document not found', 404);
  const admin = await query<{ id: string; full_name: string | null; email: string }>(
    'SELECT id, full_name, email FROM admin_users WHERE id = $1',
    [doc.rows[0].created_by]
  ).catch(() => ({ rows: [] }));
  const document = {
    ...doc.rows[0],
    created_by:
      admin.rows[0] ?
        { id: admin.rows[0].id, name: admin.rows[0].full_name ?? undefined, email: admin.rows[0].email }
      : undefined,
  };
  const acceptancesRaw = await query<{
    user_id: string;
    accepted_at: string;
    ip_address: string;
    phone_number: string;
    full_name: string | null;
    role: string | null;
  }>(
    `SELECT ua.user_id, ua.accepted_at, ua.ip_address, p.phone_number, p.full_name, p.role
     FROM user_agreements ua
     JOIN profiles p ON p.id = ua.user_id
     WHERE ua.legal_document_id = $1
     ORDER BY ua.accepted_at DESC
     LIMIT 100`,
    [req.params.id]
  );
  const totalCount = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM user_agreements WHERE legal_document_id = $1',
    [req.params.id]
  );
  const acceptances = acceptancesRaw.rows.map((row) => ({
    user: {
      id: row.user_id,
      full_name: row.full_name ?? undefined,
      email: row.phone_number,
      role: row.role ?? undefined,
    },
    accepted_at: row.accepted_at,
    ip_address: row.ip_address,
  }));
  return success(res, {
    document,
    acceptances,
    total_acceptances: parseInt(totalCount.rows[0]?.count || '0', 10),
  });
});

// Content: lesson types
router.get('/lesson-types', async (_req, res) => {
  const result = await query('SELECT * FROM lesson_types WHERE deleted_at IS NULL ORDER BY sort_order ASC');
  return success(res, { lesson_types: result.rows });
});
router.post('/lesson-types', async (req, res) => {
  const { slug, name, sort_order, is_active } = req.body;
  await query(
    'INSERT INTO lesson_types (slug, name, sort_order, is_active) VALUES ($1, $2, $3, $4)',
    [slug, JSON.stringify(name || {}), sort_order ?? 0, is_active !== false]
  );
  return success(res, { message: 'Lesson type created' });
});
router.put('/lesson-types/:id', async (req, res) => {
  const { id } = req.params;
  const { slug, name, sort_order, is_active } = req.body;
  await query(
    'UPDATE lesson_types SET slug = COALESCE($2, slug), name = COALESCE($3, name), sort_order = COALESCE($4, sort_order), is_active = COALESCE($5, is_active), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
    [id, slug, name ? JSON.stringify(name) : null, sort_order, is_active]
  );
  return success(res, { message: 'Lesson type updated' });
});
router.delete('/lesson-types/:id', async (req, res) => {
  await query('UPDATE lesson_types SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1', [req.params.id]);
  return success(res, { message: 'Lesson type deleted' });
});

// Content: locations
router.get('/locations', async (_req, res) => {
  const result = await query('SELECT * FROM locations WHERE deleted_at IS NULL ORDER BY type, sort_order');
  return success(res, { locations: result.rows });
});
router.post('/locations', async (req, res) => {
  const { parent_id, type, name, code, sort_order } = req.body;
  await query(
    'INSERT INTO locations (parent_id, type, name, code, sort_order) VALUES ($1, $2, $3, $4, $5)',
    [parent_id || null, type, JSON.stringify(name || {}), code || null, sort_order ?? 0]
  );
  return success(res, { message: 'Location created' });
});
router.put('/locations/:id', async (req, res) => {
  const { id } = req.params;
  const { parent_id, type, name, code, sort_order } = req.body;
  await query(
    'UPDATE locations SET parent_id = COALESCE($2, parent_id), type = COALESCE($3, type), name = COALESCE($4, name), code = COALESCE($5, code), sort_order = COALESCE($6, sort_order) WHERE id = $1 AND deleted_at IS NULL',
    [id, parent_id, type, name ? JSON.stringify(name) : null, code, sort_order]
  );
  return success(res, { message: 'Location updated' });
});
router.delete('/locations/:id', async (req, res) => {
  await query('UPDATE locations SET deleted_at = NOW() WHERE id = $1', [req.params.id]);
  return success(res, { message: 'Location deleted' });
});

// Content: school types (schools table removed; profile has school_name text)
router.get('/school-types', async (_req, res) => {
  const result = await query('SELECT * FROM school_types WHERE deleted_at IS NULL ORDER BY sort_order');
  return success(res, { school_types: result.rows });
});
router.post('/school-types', async (req, res) => {
  const { name, sort_order } = req.body;
  await query('INSERT INTO school_types (name, sort_order) VALUES ($1, $2)', [JSON.stringify(name || {}), sort_order ?? 0]);
  return success(res, { message: 'School type created' });
});
router.put('/school-types/:id', async (req, res) => {
  const { id } = req.params;
  const { name, sort_order } = req.body;
  await query(
    'UPDATE school_types SET name = COALESCE($2, name), sort_order = COALESCE($3, sort_order) WHERE id = $1 AND deleted_at IS NULL',
    [id, name ? JSON.stringify(name) : null, sort_order]
  );
  return success(res, { message: 'School type updated' });
});
router.delete('/school-types/:id', async (req, res) => {
  await query('UPDATE school_types SET deleted_at = NOW() WHERE id = $1', [req.params.id]);
  return success(res, { message: 'School type deleted' });
});

// Content: grades (bound to school types)
router.get('/grades', async (_req, res) => {
  const result = await query(
    `SELECT g.id, g.school_type_id, g.name, g.sort_order, st.name as school_type_name
     FROM grades g
     JOIN school_types st ON st.id = g.school_type_id AND st.deleted_at IS NULL
     WHERE g.deleted_at IS NULL
     ORDER BY st.sort_order, g.sort_order`
  );
  return success(res, { grades: result.rows });
});
router.post('/grades', async (req, res) => {
  const { school_type_id, name, sort_order } = req.body;
  await query(
    'INSERT INTO grades (school_type_id, name, sort_order) VALUES ($1, $2, $3)',
    [school_type_id, JSON.stringify(name || {}), sort_order ?? 0]
  );
  return success(res, { message: 'Grade created' });
});
router.put('/grades/:id', async (req, res) => {
  const { id } = req.params;
  const { school_type_id, name, sort_order } = req.body;
  await query(
    'UPDATE grades SET school_type_id = COALESCE($2, school_type_id), name = COALESCE($3, name), sort_order = COALESCE($4, sort_order) WHERE id = $1 AND deleted_at IS NULL',
    [id, school_type_id, name ? JSON.stringify(name) : null, sort_order]
  );
  return success(res, { message: 'Grade updated' });
});
router.delete('/grades/:id', async (req, res) => {
  await query('UPDATE grades SET deleted_at = NOW() WHERE id = $1', [req.params.id]);
  return success(res, { message: 'Grade deleted' });
});

export default router;
