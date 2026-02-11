import { Router } from 'express';
import { query } from '../db/pool.js';
import { success } from '../utils/response.js';

const router = Router();

// GET /api/v1/subscription-plans (no auth - for mobile app)
router.get('/subscription-plans', async (_req, res) => {
  const result = await query<{
    id: string;
    slug: string;
    display_name: unknown;
    description: unknown;
    monthly_price_cents: number;
    yearly_price_cents: number;
    apple_product_id_monthly: string | null;
    apple_product_id_yearly: string | null;
    google_product_id_monthly: string | null;
    google_product_id_yearly: string | null;
    features: unknown;
    max_students: number | null;
    search_visibility_boost: number;
    profile_badge: string | null;
    is_default: boolean;
    icon: string | null;
  }>(
    `SELECT id, slug, display_name, description, monthly_price_cents, yearly_price_cents,
            apple_product_id_monthly, apple_product_id_yearly,
            google_product_id_monthly, google_product_id_yearly,
            features, max_students, search_visibility_boost, profile_badge, is_default, icon
     FROM subscription_plans WHERE is_active = true ORDER BY sort_order ASC`
  );
  return success(res, { plans: result.rows });
});

// GET /api/v1/boosters (no auth)
router.get('/boosters', async (_req, res) => {
  const result = await query<{
    id: string;
    slug: string;
    display_name: unknown;
    description: unknown;
    price_cents: number;
    duration_days: number;
    search_ranking_boost: number;
    apple_product_id: string | null;
    google_product_id: string | null;
    badge_text: unknown;
    icon: string | null;
  }>(
    `SELECT id, slug, display_name, description, price_cents, duration_days, search_ranking_boost,
            apple_product_id, google_product_id, badge_text, icon
     FROM boosters WHERE is_active = true ORDER BY sort_order ASC`
  );
  return success(res, { boosters: result.rows });
});

// GET /api/v1/locations - hierarchical: ?parent_id=<uuid> for children, no parent_id for roots (no auth)
router.get('/locations', async (req, res) => {
  const parentId = (req.query.parent_id as string)?.trim() || null;
  const typeOrder = "CASE type WHEN 'country' THEN 1 WHEN 'state' THEN 2 WHEN 'city' THEN 3 WHEN 'district' THEN 4 END";
  if (parentId) {
    const result = await query<{ id: string; parent_id: string | null; type: string; name: unknown; code: string | null }>(
      `SELECT id, parent_id, type, name, code FROM locations WHERE parent_id = $1 AND deleted_at IS NULL ORDER BY ${typeOrder}, sort_order`,
      [parentId]
    );
    return success(res, { locations: result.rows });
  }
  const result = await query<{ id: string; parent_id: string | null; type: string; name: unknown; code: string | null }>(
    `SELECT id, parent_id, type, name, code FROM locations WHERE parent_id IS NULL AND deleted_at IS NULL ORDER BY ${typeOrder}, sort_order`
  );
  return success(res, { locations: result.rows });
});

// GET /api/v1/onboarding/data - locations, school_types, grades, lesson types (no auth or optional auth)
router.get('/onboarding/data', async (_req, res) => {
  const [locations, schoolTypes, grades, lessonTypes] = await Promise.all([
    query<{ id: string; parent_id: string | null; type: string; name: unknown; code: string | null }>(
      'SELECT id, parent_id, type, name, code FROM locations WHERE deleted_at IS NULL ORDER BY type, sort_order'
    ),
    query<{ id: string; name: unknown }>('SELECT id, name FROM school_types WHERE deleted_at IS NULL ORDER BY sort_order'),
    query<{ id: string; school_type_id: string; name: unknown }>(
      'SELECT id, school_type_id, name FROM grades WHERE deleted_at IS NULL ORDER BY school_type_id, sort_order'
    ),
    query<{ id: string; slug: string; name: unknown }>(
      'SELECT id, slug, name FROM lesson_types WHERE is_active = true AND deleted_at IS NULL ORDER BY sort_order'
    ),
  ]);
  return success(res, {
    locations: locations.rows,
    school_types: schoolTypes.rows,
    grades: grades.rows,
    lesson_types: lessonTypes.rows,
  });
});

export default router;
