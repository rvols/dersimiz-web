import { Router } from 'express';
import { query } from '../db/pool.js';
import { success, error } from '../utils/response.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// POST /api/v1/iap/verify - verify in-app purchase (Apple/Google)
router.post('/verify', requireAuth, async (req: AuthRequest, res) => {
  const { platform, receipt, transaction_id, product_id, package_name } = req.body;
  if (!platform || !receipt || !transaction_id || !product_id) {
    return error(res, 'VALIDATION_ERROR', 'platform, receipt, transaction_id, product_id required', 400);
  }
  const existing = await query<{ id: string }>(
    'SELECT id FROM transactions WHERE provider_transaction_id = $1',
    [transaction_id]
  );
  if (existing.rows.length > 0) {
    return success(res, { verified: true, already_processed: true });
  }
  const plan = await query<{ id: string; slug: string; monthly_price_cents: number; yearly_price_cents: number }>(
    `SELECT id, slug, monthly_price_cents, yearly_price_cents FROM subscription_plans
     WHERE apple_product_id_monthly = $1 OR apple_product_id_yearly = $1 OR google_product_id_monthly = $1 OR google_product_id_yearly = $1`,
    [product_id]
  );
  const booster = await query<{ id: string; duration_days: number; price_cents: number }>(
    `SELECT id, duration_days, price_cents FROM boosters WHERE apple_product_id = $1 OR google_product_id = $1`,
    [product_id]
  );
  if (plan.rows[0]) {
    const p = plan.rows[0];
    const isYearly = product_id.includes('yearly');
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + (isYearly ? 12 : 1));
    const subResult = await query(
      `INSERT INTO user_subscriptions (user_id, plan_id, start_date, end_date, is_active, is_renewing, is_cancelled, is_trial, billing_interval, billing_provider, provider_transaction_id, provider_receipt)
       VALUES ($1, $2, NOW(), $3, true, true, false, false, $4, $5, $6, $7)
       RETURNING id`,
      [req.userId, p.id, endDate, isYearly ? 'yearly' : 'monthly', platform, transaction_id, receipt]
    );
    const subId = (subResult.rows[0] as { id: string }).id;
    await query(
      `INSERT INTO transactions (user_id, type, amount_cents, currency, status, billing_provider, provider_transaction_id, provider_receipt, subscription_id)
       VALUES ($1, 'subscription', $2, 'TRY', 'completed', $3, $4, $5, $6)`,
      [req.userId, isYearly ? p.yearly_price_cents : p.monthly_price_cents, platform, transaction_id, receipt, subId]
    );
    return success(res, { verified: true, subscription: { id: subId, plan: p.slug } });
  }
  if (booster.rows[0]) {
    const b = booster.rows[0];
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + b.duration_days);
    const ubResult = await query(
      `INSERT INTO user_boosters (user_id, booster_id, activated_at, expires_at, is_active, provider_transaction_id, provider_receipt, billing_provider)
       VALUES ($1, $2, NOW(), $3, true, $4, $5, $6) RETURNING id`,
      [req.userId, b.id, expiresAt, transaction_id, receipt, platform]
    );
    const ubId = (ubResult.rows[0] as { id: string }).id;
    await query(
      `INSERT INTO transactions (user_id, type, amount_cents, currency, status, billing_provider, provider_transaction_id, provider_receipt, booster_id)
       VALUES ($1, 'booster', $2, 'TRY', 'completed', $3, $4, $5, $6)`,
      [req.userId, b.price_cents, platform, transaction_id, receipt, ubId]
    );
    return success(res, { verified: true, booster: { id: ubId, expires_at: expiresAt } });
  }
  return error(res, 'PRODUCT_NOT_FOUND', 'Product not found', 400);
});

export default router;
