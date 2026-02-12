import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/pool.js';
import { success, error } from '../utils/response.js';
import { requireAuth, signAccessToken, signRefreshToken, AuthRequest } from '../middleware/auth.js';
import { isSmsConfigured, sendOtpSms } from '../services/sms.js';
import {
  setOtpSession,
  getOtpSession,
  getSessionTokenByPhone,
  incrementOtpAttempts,
  deleteOtpSession,
  OTP_TTL_SECONDS,
  OTP_MAX_ATTEMPTS,
} from '../services/otpStore.js';
import {
  createJti,
  setAccessToken,
  setRefreshToken,
  parseExpiryToSeconds,
  DEFAULT_ACCESS_TTL_SECONDS,
  DEFAULT_REFRESH_TTL_SECONDS,
  revokeRefreshToken,
  getRefreshToken,
} from '../services/authTokenStore.js';

const router = Router();

const requestOtpSchema = z.object({
  phone_number: z.string().regex(/^\+[1-9]\d{6,14}$/, 'E.164 format required'),
  country_code: z.string().min(2).max(3),
});

const verifyOtpSchema = z.object({
  session_token: z.string().uuid().optional(),
  phone_number: z.string().regex(/^\+[1-9]\d{6,14}$/),
  otp_code: z.string().length(6),
  country_code: z.string().optional(),
});

function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// POST /api/v1/auth/request-otp
// Returns session_token; client must send it in verify-otp to secure the verification flow.
router.post('/request-otp', async (req, res) => {
  const parsed = requestOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, 'VALIDATION_ERROR', 'Invalid phone number', 400, parsed.error.flatten());
  }
  const { phone_number } = parsed.data;

  const code = isSmsConfigured() ? generateOtpCode() : '123456';
  const session_token = uuidv4();

  if (isSmsConfigured()) {
    try {
      await sendOtpSms(phone_number, code);
    } catch (err) {
      console.error('SMS send failed:', err);
      return error(res, 'SMS_SEND_FAILED', 'Could not send verification code', 503);
    }
  }

  const stored = await setOtpSession(session_token, phone_number, code);
  if (!stored) {
    return error(res, 'INTERNAL_ERROR', 'Could not store verification session', 503);
  }

  return success(res, {
    message: 'Verification code sent',
    session_token,
    expires_in: OTP_TTL_SECONDS,
    retry_after: 60,
  });
});

// POST /api/v1/auth/verify-otp
// session_token optional: if omitted, session is resolved by phone_number (one active OTP per phone).
router.post('/verify-otp', async (req, res) => {
  const parsed = verifyOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, 'VALIDATION_ERROR', 'Invalid request', 400, parsed.error.flatten());
  }
  const { session_token: bodySessionToken, phone_number, otp_code } = parsed.data;

  const session_token = bodySessionToken ?? (await getSessionTokenByPhone(phone_number));
  if (!session_token) {
    return error(res, 'EXPIRED_OTP', 'Verification session expired or invalid', 400);
  }

  const session = await getOtpSession(session_token);
  if (!session) {
    return error(res, 'EXPIRED_OTP', 'Verification session expired or invalid', 400);
  }
  if (session.phone_number !== phone_number) {
    return error(res, 'INVALID_OTP', 'Phone number does not match verification session', 400);
  }
  if (session.attempts >= OTP_MAX_ATTEMPTS) {
    await deleteOtpSession(session_token);
    return error(res, 'TOO_MANY_ATTEMPTS', 'Too many attempts', 429);
  }
  if (session.code !== otp_code) {
    const newAttempts = await incrementOtpAttempts(session_token);
    return error(res, 'INVALID_OTP', 'Invalid verification code', 400, {
      attempts_remaining: newAttempts < 0 ? 0 : Math.max(0, OTP_MAX_ATTEMPTS - newAttempts),
    });
  }

  await deleteOtpSession(session_token);

  const userResult = await query<{
    id: string;
    phone_number: string;
    full_name: string | null;
    role: string | null;
    is_approved: boolean;
    is_rejected: boolean;
    onboarding_completed: boolean;
    avatar_url: string | null;
  }>(
    'SELECT id, phone_number, full_name, role, is_approved, COALESCE(is_rejected, false) as is_rejected, onboarding_completed, avatar_url FROM profiles WHERE phone_number = $1 AND deleted_at IS NULL',
    [phone_number]
  );
  let user = userResult.rows[0];
  let isNewUser = false;

  if (!user) {
    const newId = uuidv4();
    await query(
      `INSERT INTO profiles (id, phone_number, country_code) VALUES ($1, $2, $3)`,
      [newId, phone_number, req.body.country_code || 'TR']
    );
    user = {
      id: newId,
      phone_number,
      full_name: null,
      role: null,
      is_approved: false,
      is_rejected: false,
      onboarding_completed: false,
      avatar_url: null,
    };
    isNewUser = true;
    // Create default notification preferences
    await query(
      'INSERT INTO notification_preferences (user_id) VALUES ($1) ON CONFLICT DO NOTHING',
      [newId]
    );
  }

  const jtiAccess = createJti();
  const jtiRefresh = createJti();
  const access_token = signAccessToken(user.id, user.role || undefined, jtiAccess);
  const refresh_token = signRefreshToken(user.id, jtiRefresh);
  const accessTtl = parseExpiryToSeconds(process.env.JWT_ACCESS_EXPIRY, DEFAULT_ACCESS_TTL_SECONDS);
  const refreshTtl = parseExpiryToSeconds(process.env.JWT_REFRESH_EXPIRY, DEFAULT_REFRESH_TTL_SECONDS);
  await setAccessToken(jtiAccess, user.id, accessTtl);
  await setRefreshToken(jtiRefresh, user.id, refreshTtl);

  const latestLegal = await query<{ id: string }>(
    `SELECT id FROM legal_documents ld
     WHERE (type, version) IN (
       SELECT type, MAX(version) FROM legal_documents GROUP BY type
     )`
  );
  const acceptedLegal = await query<{ legal_document_id: string }>(
    'SELECT legal_document_id FROM user_agreements WHERE user_id = $1',
    [user.id]
  );
  const acceptedSet = new Set(acceptedLegal.rows.map((r) => r.legal_document_id));
  const requires_legal_accept =
    latestLegal.rows.length > 0 &&
    latestLegal.rows.some((d) => !acceptedSet.has(d.id));

  let next_step: string;
  if (requires_legal_accept) {
    next_step = 'legal_agreements';
  } else if (isNewUser) {
    next_step = 'role_selection';
  } else if (!user.onboarding_completed) {
    next_step = 'onboarding';
  } else {
    next_step = 'dashboard';
  }

  return success(res, {
    is_new_user: isNewUser,
    access_token,
    refresh_token,
    user: {
      id: user.id,
      phone_number: user.phone_number,
      full_name: user.full_name,
      role: user.role,
      is_approved: user.is_approved,
      is_rejected: user.is_rejected ?? false,
      onboarding_completed: user.onboarding_completed,
      avatar_url: user.avatar_url,
    },
    requires_legal_accept,
    next_step,
  });
});

// POST /api/v1/auth/refresh
router.post('/refresh', async (req, res) => {
  const refreshToken = req.body.refresh_token;
  if (!refreshToken) {
    return error(res, 'VALIDATION_ERROR', 'refresh_token required', 400);
  }
  const jwt = await import('jsonwebtoken');
  const secret = process.env.JWT_SECRET || 'dev-secret';
  try {
    const decoded = jwt.verify(refreshToken, secret) as { sub: string; type: string; jti?: string };
    if (decoded.type !== 'refresh') {
      return error(res, 'INVALID_TOKEN', 'Invalid token type', 401);
    }
    if (decoded.jti) {
      const stored = await getRefreshToken(decoded.jti);
      if (stored === null) {
        return error(res, 'INVALID_TOKEN', 'Refresh token revoked or expired', 401);
      }
      await revokeRefreshToken(decoded.jti);
    }
    const result = await query<{ id: string; role: string | null }>(
      'SELECT id, role FROM profiles WHERE id = $1 AND deleted_at IS NULL',
      [decoded.sub]
    );
    if (result.rows.length === 0) {
      return error(res, 'USER_NOT_FOUND', 'User not found', 401);
    }
    const user = result.rows[0];
    const jtiAccess = createJti();
    const jtiRefresh = createJti();
    const access_token = signAccessToken(user.id, user.role || undefined, jtiAccess);
    const new_refresh_token = signRefreshToken(user.id, jtiRefresh);
    const accessTtl = parseExpiryToSeconds(process.env.JWT_ACCESS_EXPIRY, DEFAULT_ACCESS_TTL_SECONDS);
    const refreshTtl = parseExpiryToSeconds(process.env.JWT_REFRESH_EXPIRY, DEFAULT_REFRESH_TTL_SECONDS);
    await setAccessToken(jtiAccess, user.id, accessTtl);
    await setRefreshToken(jtiRefresh, user.id, refreshTtl);
    return success(res, { access_token, refresh_token: new_refresh_token });
  } catch {
    return error(res, 'INVALID_TOKEN', 'Invalid or expired refresh token', 401);
  }
});

// POST /api/v1/auth/logout - revoke current access token in Redis
router.post('/logout', requireAuth, async (req: AuthRequest, res) => {
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (token) {
    try {
      const jwt = await import('jsonwebtoken');
      const decoded = jwt.decode(token) as { jti?: string } | null;
      if (decoded?.jti) {
        const { revokeAccessToken } = await import('../services/authTokenStore.js');
        await revokeAccessToken(decoded.jti);
      }
    } catch {
      // ignore decode errors
    }
  }
  return success(res, { message: 'Logged out' });
});

export default router;
