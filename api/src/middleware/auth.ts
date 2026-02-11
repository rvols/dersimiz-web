import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db/pool.js';
import { getAccessToken, getAuthStoreRedisClient } from '../services/authTokenStore.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'admin-dev-secret';

export interface JwtPayload {
  sub: string;
  role?: string;
  type: 'access' | 'refresh';
  jti?: string;
}

export interface AdminJwtPayload {
  sub: string;
  email: string;
  type: 'admin';
}

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export interface AdminAuthRequest extends Request {
  adminId?: string;
  adminEmail?: string;
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' },
    });
    return;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    if (decoded.type !== 'access') {
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid token type' },
      });
      return;
    }
    if (decoded.jti && (await getAuthStoreRedisClient())) {
      const stored = await getAccessToken(decoded.jti);
      if (stored === null) {
        res.status(401).json({
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'Token revoked or expired' },
        });
        return;
      }
    }
    const result = await query<{ id: string; role: string | null }>(
      'SELECT id, role FROM profiles WHERE id = $1 AND deleted_at IS NULL',
      [decoded.sub]
    );
    if (result.rows.length === 0) {
      res.status(401).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      });
      return;
    }
    req.userId = decoded.sub;
    req.userRole = result.rows[0].role ?? decoded.role ?? undefined;
    next();
  } catch {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' },
    });
  }
}

export async function requireAdmin(
  req: AdminAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' },
    });
    return;
  }
  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET) as AdminJwtPayload;
    if (decoded.type !== 'admin') {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Admin access required' },
      });
      return;
    }
    req.adminId = decoded.sub;
    req.adminEmail = decoded.email;
    next();
  } catch {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' },
    });
  }
}

export function signAccessToken(userId: string, role?: string, jti?: string): string {
  const secret = JWT_SECRET || 'dev-secret';
  const payload: Record<string, unknown> = { sub: userId, role, type: 'access' };
  if (jti) payload.jti = jti;
  return jwt.sign(
    payload,
    secret,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '1h' } as jwt.SignOptions
  );
}

export function signRefreshToken(userId: string, jti?: string): string {
  const secret = JWT_SECRET || 'dev-secret';
  const payload: Record<string, unknown> = { sub: userId, type: 'refresh' };
  if (jti) payload.jti = jti;
  return jwt.sign(
    payload,
    secret,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '30d' } as jwt.SignOptions
  );
}

export function signAdminToken(adminId: string, email: string): string {
  const secret = ADMIN_JWT_SECRET || 'admin-dev-secret';
  return jwt.sign(
    { sub: adminId, email, type: 'admin' },
    secret,
    { expiresIn: process.env.ADMIN_JWT_EXPIRY || '8h' } as jwt.SignOptions
  );
}
