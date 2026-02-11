import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import { success, error } from '../utils/response.js';
import { requireAdmin, signAdminToken, AdminAuthRequest } from '../middleware/auth.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/v1/admin/login
router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, 'VALIDATION_ERROR', 'Invalid email or password', 400);
  }
  const { email, password } = parsed.data;

  const result = await query<{ id: string; email: string; password_hash: string; full_name: string | null }>(
    'SELECT id, email, password_hash, full_name FROM admin_users WHERE email = $1',
    [email.toLowerCase()]
  );
  const admin = result.rows[0];
  if (!admin) {
    return error(res, 'UNAUTHORIZED', 'Invalid email or password', 401);
  }
  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) {
    return error(res, 'UNAUTHORIZED', 'Invalid email or password', 401);
  }

  await query('UPDATE admin_users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1', [
    admin.id,
  ]);

  const token = signAdminToken(admin.id, admin.email);
  return success(res, {
    access_token: token,
    admin: {
      id: admin.id,
      email: admin.email,
      full_name: admin.full_name,
    },
  });
});

// GET /api/v1/admin/me (verify admin token)
router.get('/me', requireAdmin, async (req: AdminAuthRequest, res) => {
  const result = await query<{ id: string; email: string; full_name: string | null }>(
    'SELECT id, email, full_name FROM admin_users WHERE id = $1',
    [req.adminId]
  );
  const admin = result.rows[0];
  if (!admin) {
    return error(res, 'NOT_FOUND', 'Admin not found', 404);
  }
  return success(res, { admin });
});

export default router;
