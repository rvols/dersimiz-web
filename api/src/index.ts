import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';

import { createRedisRateLimitStore } from './middleware/rateLimitStore.js';
import { getLocaleFromRequest } from './i18n/locale.js';
import { getMessageOrFallback } from './i18n/messages.js';
import authRoutes from './routes/auth.js';
import adminAuthRoutes from './routes/adminAuth.js';
import publicRoutes from './routes/public.js';
import profileRoutes from './routes/profile.js';
import meRoutes from './routes/me.js';
import onboardingRoutes from './routes/onboarding.js';
import tutorRoutes from './routes/tutor.js';
import studentRoutes from './routes/student.js';
import chatRoutes from './routes/chat.js';
import supportRoutes from './routes/support.js';
import iapRoutes from './routes/iap.js';
import legalRoutes from './routes/legal.js';
import adminRoutes from './routes/admin.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
try { fs.mkdirSync(uploadDir, { recursive: true }); } catch (_) {}
app.use('/uploads', express.static(uploadDir));

app.use((req, _res, next) => {
  (req as unknown as { requestId?: string }).requestId = uuidv4();
  next();
});

app.use((req, res, next) => {
  (res as express.Response & { locals: { locale?: 'tr' | 'en' } }).locals = {
    locale: getLocaleFromRequest(req),
  };
  next();
});

const rateLimitWindowMs = 60 * 60 * 1000;
const rateLimitMax = 1000;
const redisUrl = process.env.REDIS_URL;

const apiLimiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: rateLimitMax,
  standardHeaders: true,
  ...(redisUrl
    ? {
        store: createRedisRateLimitStore(redisUrl),
        passOnStoreError: true,
      }
    : {}),
  handler: (req, res) => {
    const locale = (res as express.Response & { locals: { locale?: 'tr' | 'en' } }).locals?.locale ?? 'en';
    const message = getMessageOrFallback('RATE_LIMIT', locale, 'Too many requests');
    res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMIT', message },
      meta: { timestamp: new Date().toISOString() },
    });
  },
});

app.use('/api/v1', apiLimiter);

// Public and auth routes (no auth required)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin/auth', adminAuthRoutes);
app.use('/api/v1', publicRoutes);

// Protected mobile/user routes
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/me', meRoutes);
app.use('/api/v1/onboarding', onboardingRoutes);
app.use('/api/v1/tutor', tutorRoutes);
app.use('/api/v1/student', studentRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/support', supportRoutes);
app.use('/api/v1/iap', iapRoutes);
app.use('/api/v1/legal', legalRoutes);

// Admin routes (require admin JWT)
app.use('/api/v1/admin', adminRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((_req, res) => {
  const locale = (res as express.Response & { locals: { locale?: 'tr' | 'en' } }).locals?.locale ?? 'en';
  const message = getMessageOrFallback('NOT_FOUND', locale, 'Not found');
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message },
    meta: { timestamp: new Date().toISOString() },
  });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  const locale = (res as express.Response & { locals: { locale?: 'tr' | 'en' } }).locals?.locale ?? 'en';
  const message = getMessageOrFallback('INTERNAL_ERROR', locale, 'Internal server error');
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message },
    meta: { timestamp: new Date().toISOString() },
  });
});

app.listen(PORT, () => {
  console.log(`Dersimiz API listening on port ${PORT}`);
});
