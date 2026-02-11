import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Exclude /admin so next-intl does not rewrite to /[locale]/admin (which would 404)
  matcher: ['/((?!api|_next|_vercel|admin|.*\\..*).*)'],
};
