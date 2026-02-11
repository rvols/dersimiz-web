import { Router } from 'express';
import { query } from '../db/pool.js';
import { success, error } from '../utils/response.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/me/settings - combined profile + notification preferences (for settings screen)
router.get('/settings', requireAuth, async (req: AuthRequest, res) => {
  const [profileRes, prefsRes] = await Promise.all([
    query<{
      id: string;
      phone_number: string;
      country_code: string;
      role: string | null;
      full_name: string | null;
      school_name: string | null;
      grade_id: string | null;
      avatar_url: string | null;
      is_approved: boolean;
      onboarding_completed: boolean;
      created_at: Date;
    }>(
      'SELECT id, phone_number, country_code, role, full_name, school_name, grade_id, avatar_url, is_approved, onboarding_completed, created_at FROM profiles WHERE id = $1 AND deleted_at IS NULL',
      [req.userId]
    ),
    query<{
      new_message: boolean;
      approval_status: boolean;
      subscription_update: boolean;
      booster_update: boolean;
      new_student_contact: boolean;
      support_reply: boolean;
      quiet_hours_start: string | null;
      quiet_hours_end: string | null;
    }>(
      'SELECT new_message, approval_status, subscription_update, booster_update, new_student_contact, support_reply, quiet_hours_start, quiet_hours_end FROM notification_preferences WHERE user_id = $1',
      [req.userId]
    ),
  ]);
  const profile = profileRes.rows[0] as typeof profileRes.rows[0] & { schools?: { id: string; school_name: string }[]; grades?: { id: string; name: unknown; school_type_id: string }[] };
  if (!profile) return error(res, 'NOT_FOUND', 'Profile not found', 404);
  if (profile.role === 'tutor') {
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
    profile.schools = schoolsRes.rows;
    profile.grades = gradesWithNames.filter(Boolean);
  }
  let preferences = prefsRes.rows[0];
  if (!preferences) {
    await query('INSERT INTO notification_preferences (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING', [req.userId]);
    const again = await query<{
      new_message: boolean;
      approval_status: boolean;
      subscription_update: boolean;
      booster_update: boolean;
      new_student_contact: boolean;
      support_reply: boolean;
      quiet_hours_start: string | null;
      quiet_hours_end: string | null;
    }>(
      'SELECT new_message, approval_status, subscription_update, booster_update, new_student_contact, support_reply, quiet_hours_start, quiet_hours_end FROM notification_preferences WHERE user_id = $1',
      [req.userId]
    );
    preferences = again.rows[0];
  }
  return success(res, { profile, notification_preferences: preferences || {} });
});

// GET /api/v1/me/subscription
router.get('/subscription', requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const subResult = await query<{
    id: string;
    plan_id: string;
    start_date: Date;
    end_date: Date | null;
    is_active: boolean;
    is_renewing: boolean;
    is_trial: boolean;
    billing_interval: string;
    billing_provider: string;
  }>(
    `SELECT us.id, us.plan_id, us.start_date, us.end_date, us.is_active, us.is_renewing, us.is_trial, us.billing_interval, us.billing_provider
     FROM user_subscriptions us
     WHERE us.user_id = $1 AND us.is_active = true AND (us.end_date IS NULL OR us.end_date >= NOW())
     ORDER BY us.start_date DESC LIMIT 1`,
    [userId]
  );
  const subscription = subResult.rows[0];
  let current_subscription = null;
  if (subscription) {
    const planResult = await query<{
      id: string;
      slug: string;
      display_name: unknown;
      description: unknown;
      features: unknown;
      profile_badge: string | null;
    }>('SELECT id, slug, display_name, description, features, profile_badge FROM subscription_plans WHERE id = $1', [
      subscription.plan_id,
    ]);
    const plan = planResult.rows[0];
    current_subscription = {
      id: subscription.id,
      plan: plan || { id: subscription.plan_id },
      start_date: subscription.start_date,
      end_date: subscription.end_date,
      is_active: subscription.is_active,
      is_renewing: subscription.is_renewing,
      is_trial: subscription.is_trial,
      billing_interval: subscription.billing_interval,
      billing_provider: subscription.billing_provider,
    };
  }

  const boostersResult = await query<{
    id: string;
    booster_id: string;
    activated_at: Date;
    expires_at: Date;
    is_active: boolean;
  }>(
    `SELECT ub.id, ub.booster_id, ub.activated_at, ub.expires_at, ub.is_active
     FROM user_boosters ub
     WHERE ub.user_id = $1 AND ub.is_active = true AND ub.expires_at >= NOW()
     ORDER BY ub.expires_at DESC`,
    [userId]
  );
  const active_boosters = await Promise.all(
    boostersResult.rows.map(async (ub) => {
      const b = await query<{ slug: string; display_name: unknown; search_ranking_boost: number }>(
        'SELECT slug, display_name, search_ranking_boost FROM boosters WHERE id = $1',
        [ub.booster_id]
      );
      return {
        id: ub.id,
        booster: b.rows[0] || { slug: '', display_name: {}, search_ranking_boost: 0 },
        activated_at: ub.activated_at,
        expires_at: ub.expires_at,
        is_active: ub.is_active,
      };
    })
  );

  return success(res, {
    current_subscription,
    active_boosters,
  });
});

// GET /api/v1/me/transactions
router.get('/transactions', requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const result = await query<{
    id: string;
    type: string;
    amount_cents: number;
    currency: string;
    status: string;
    billing_provider: string;
    created_at: Date;
  }>(
    'SELECT id, type, amount_cents, currency, status, billing_provider, created_at FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
    [userId]
  );
  return success(res, {
    transactions: result.rows,
    total: result.rows.length,
  });
});

// GET /api/v1/me/notification-preferences
router.get('/notification-preferences', requireAuth, async (req: AuthRequest, res) => {
  const result = await query<{
    new_message: boolean;
    approval_status: boolean;
    subscription_update: boolean;
    booster_update: boolean;
    new_student_contact: boolean;
    support_reply: boolean;
    quiet_hours_start: string | null;
    quiet_hours_end: string | null;
  }>(
    'SELECT new_message, approval_status, subscription_update, booster_update, new_student_contact, support_reply, quiet_hours_start, quiet_hours_end FROM notification_preferences WHERE user_id = $1',
    [req.userId]
  );
  const prefs = result.rows[0];
  if (!prefs) {
    await query(
      'INSERT INTO notification_preferences (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
      [req.userId]
    );
    const def = await query(
      'SELECT new_message, approval_status, subscription_update, booster_update, new_student_contact, support_reply, quiet_hours_start, quiet_hours_end FROM notification_preferences WHERE user_id = $1',
      [req.userId]
    );
    return success(res, { preferences: def.rows[0] || {} });
  }
  return success(res, { preferences: prefs });
});

// PUT /api/v1/me/notification-preferences
router.put('/notification-preferences', requireAuth, async (req: AuthRequest, res) => {
  const body = req.body as Record<string, unknown>;
  const fields = [
    'new_message',
    'approval_status',
    'subscription_update',
    'booster_update',
    'new_student_contact',
    'support_reply',
    'quiet_hours_start',
    'quiet_hours_end',
  ];
  const updates: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const f of fields) {
    if (body[f] !== undefined) {
      updates.push(`${f} = $${i++}`);
      values.push(body[f]);
    }
  }
  if (updates.length === 0) return success(res, { message: 'No updates' });
  updates.push('updated_at = NOW()');
  values.push(req.userId);
  const paramIdx = values.length;
  await query(
    `INSERT INTO notification_preferences (user_id) VALUES ($${paramIdx}) ON CONFLICT (user_id) DO UPDATE SET ${updates.join(', ')}`,
    values
  );
  return success(res, { message: 'Preferences updated' });
});

// GET /api/v1/me/notifications - in-app notification list
router.get('/notifications', requireAuth, async (req: AuthRequest, res) => {
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
  const result = await query<{
    id: string;
    type: string;
    title: string;
    body: string;
    data: unknown;
    read: boolean;
    sent_at: Date;
  }>(
    'SELECT id, type, title, body, data, read, sent_at FROM notifications_log WHERE user_id = $1 ORDER BY sent_at DESC LIMIT $2',
    [req.userId, limit]
  );
  return success(res, { notifications: result.rows });
});

// PUT /api/v1/me/notifications/:id/read - mark one as read
router.put('/notifications/:id/read', requireAuth, async (req: AuthRequest, res) => {
  await query(
    'UPDATE notifications_log SET read = true WHERE user_id = $1 AND id = $2',
    [req.userId, req.params.id]
  );
  return success(res, { message: 'Marked as read' });
});

export default router;
