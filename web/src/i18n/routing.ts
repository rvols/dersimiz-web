import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['tr', 'en'],
  defaultLocale: 'en',
  localePrefix: 'never',
  localeDetection: true,
  localeCookie: { name: 'NEXT_LOCALE', maxAge: 365 * 24 * 60 * 60, sameSite: 'lax' as const },
});
