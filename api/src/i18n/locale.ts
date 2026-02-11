import type { Request } from 'express';
import type { ApiLocale } from './messages.js';

const DEFAULT_LOCALE: ApiLocale = 'en';

/**
 * Parse Accept-Language and return the best matching locale (tr or en).
 */
export function getLocaleFromRequest(req: Request): ApiLocale {
  const raw = req.get('Accept-Language');
  if (!raw) return DEFAULT_LOCALE;
  const parts = raw.split(',').map((s) => {
    const [lang, q = 'q=1'] = s.trim().split(';');
    const value = (q.split('=')[1] || '1').trim();
    return { lang: lang.split('-')[0].toLowerCase(), q: parseFloat(value) || 1 };
  });
  parts.sort((a, b) => b.q - a.q);
  for (const { lang } of parts) {
    if (lang === 'tr' || lang === 'en') return lang;
  }
  return DEFAULT_LOCALE;
}
