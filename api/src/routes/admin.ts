import { Router } from 'express';
import { query } from '../db/pool.js';
import { success, error } from '../utils/response.js';
import { requireAdmin, AdminAuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(requireAdmin);

// GET /api/v1/admin/stats
router.get('/stats', async (_req, res) => {
  const [users, tutors, students, pending] = await Promise.all([
    query<{ count: string }>('SELECT COUNT(*) as count FROM profiles WHERE deleted_at IS NULL'),
    query<{ count: string }>("SELECT COUNT(*) as count FROM profiles WHERE role = 'tutor' AND deleted_at IS NULL"),
    query<{ count: string }>("SELECT COUNT(*) as count FROM profiles WHERE role = 'student' AND deleted_at IS NULL"),
    query<{ count: string }>('SELECT COUNT(*) as count FROM profiles WHERE is_approved = false AND role IS NOT NULL AND deleted_at IS NULL'),
  ]);
  const revenue = await query<{ sum: string | null }>(
    `SELECT COALESCE(SUM(amount_cents), 0) as sum FROM transactions WHERE status = 'completed'`
  );
  return success(res, {
    total_users: parseInt(users.rows[0]?.count || '0', 10),
    total_tutors: parseInt(tutors.rows[0]?.count || '0', 10),
    total_students: parseInt(students.rows[0]?.count || '0', 10),
    pending_approvals: parseInt(pending.rows[0]?.count || '0', 10),
    revenue_cents: parseInt(revenue.rows[0]?.sum || '0', 10),
  });
});

// GET /api/v1/admin/users
router.get('/users', async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
  const offset = (page - 1) * limit;
  const role = req.query.role as string | undefined;
  const status = req.query.status as string | undefined; // approved, pending, banned

  let where = 'deleted_at IS NULL';
  const params: unknown[] = [];
  let i = 1;
  if (role === 'tutor' || role === 'student') {
    where += ` AND role = $${i++}`;
    params.push(role);
  }
  if (status === 'pending') {
    where += ' AND is_approved = false AND role IS NOT NULL';
  } else if (status === 'approved') {
    where += ' AND is_approved = true';
  } else if (status === 'banned') {
    where += ' AND is_banned = true';
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
    `SELECT id, phone_number, full_name, role, is_approved, is_banned, onboarding_completed, created_at
     FROM profiles WHERE ${where} ORDER BY created_at DESC LIMIT $${i} OFFSET $${i + 1}`,
    [...params, limit, offset]
  );

  return success(res, {
    users: result.rows,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  });
});

// POST /api/v1/admin/users/:id/approve
router.post('/users/:id/approve', async (req, res) => {
  const { id } = req.params;
  await query(
    'UPDATE profiles SET is_approved = true, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  const r = await query('SELECT id FROM profiles WHERE id = $1', [id]);
  if (r.rows.length === 0) {
    return error(res, 'NOT_FOUND', 'User not found', 404);
  }
  return success(res, { message: 'User approved' });
});

// POST /api/v1/admin/users/:id/reject
router.post('/users/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body || {};
  await query(
    'UPDATE profiles SET is_approved = false, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  return success(res, { message: 'User rejected', reason: reason || null });
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

// GET /api/v1/admin/support-tickets
router.get('/support-tickets', async (req, res) => {
  const result = await query<{
    id: string;
    user_id: string;
    status: string;
    subject: string | null;
    created_at: Date;
  }>(
    `SELECT st.id, st.user_id, st.status, st.subject, st.created_at
     FROM support_tickets st ORDER BY st.updated_at DESC LIMIT 100`
  );
  const tickets = result.rows;
  const withUsers = await Promise.all(
    tickets.map(async (t) => {
      const u = await query<{ full_name: string | null; phone_number: string }>(
        'SELECT full_name, phone_number FROM profiles WHERE id = $1',
        [t.user_id]
      );
      return { ...t, user: u.rows[0] || null };
    })
  );
  return success(res, { tickets: withUsers });
});

// POST /api/v1/admin/support-tickets/:id/reply
router.post('/support-tickets/:id/reply', async (req: AdminAuthRequest, res) => {
  const { id } = req.params;
  const { body } = req.body || {};
  if (!body || typeof body !== 'string') {
    return error(res, 'VALIDATION_ERROR', 'body is required', 400);
  }
  const ticketResult = await query<{ id: string }>('SELECT id FROM support_tickets WHERE id = $1', [id]);
  if (ticketResult.rows.length === 0) {
    return error(res, 'NOT_FOUND', 'Ticket not found', 404);
  }
  await query(
    'INSERT INTO support_messages (ticket_id, is_admin, admin_user_id, body) VALUES ($1, true, $2, $3)',
    [id, req.adminId, body]
  );
  await query('UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2', [
    'replied',
    id,
  ]);
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
