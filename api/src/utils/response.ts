import type { Response } from 'express';
import type { ApiLocale } from '../i18n/messages.js';
import { getMessageOrFallback } from '../i18n/messages.js';

type ResWithLocals = Response & { locals: { locale?: ApiLocale } };

export function success<T>(res: Response, data: T, status = 200): Response {
  return res.status(status).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      request_id: (res as unknown as { requestId?: string }).requestId,
    },
  });
}

export function error(
  res: Response,
  code: string,
  message: string,
  status = 400,
  details?: unknown
): Response {
  const locale = (res as ResWithLocals).locals?.locale ?? 'en';
  const translated = getMessageOrFallback(code, locale, message);
  const err: { code: string; message: string; details?: unknown } = { code, message: translated };
  if (details !== undefined && details !== null) err.details = details;
  return res.status(status).json({
    success: false,
    error: err,
    meta: {
      timestamp: new Date().toISOString(),
      request_id: (res as unknown as { requestId?: string }).requestId,
    },
  });
}
