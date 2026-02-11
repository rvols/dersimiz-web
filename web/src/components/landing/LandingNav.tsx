'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

const COOKIE_NAME = 'NEXT_LOCALE';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

function setLocaleCookie(locale: string) {
  document.cookie = `${COOKIE_NAME}=${locale}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function LandingNav() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('nav');
  const tLegal = useTranslations('legal');

  function switchLocale() {
    const next = locale === 'tr' ? 'en' : 'tr';
    setLocaleCookie(next);
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 bg-neutral-white/90 backdrop-blur-md border-b border-neutral-outline">
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-student-orange" />
          </span>
          <span className="font-display font-bold text-xl text-neutral-carbon">{tLegal('nav_title')}</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          <Link href="/#benefits" className="text-neutral-slate hover:text-primary font-medium transition-colors">
            {t('why_us')}
          </Link>
          <Link href="/#students" className="text-neutral-slate hover:text-primary font-medium transition-colors">
            {t('for_students')}
          </Link>
          <Link href="/#tutors" className="text-neutral-slate hover:text-primary font-medium transition-colors">
            {t('for_tutors')}
          </Link>
          <Link href="/#pricing" className="text-neutral-slate hover:text-primary font-medium transition-colors">
            {t('pricing')}
          </Link>
          <Link href="/#contact" className="text-neutral-slate hover:text-primary font-medium transition-colors">
            {t('contact')}
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={switchLocale}
            className="text-neutral-slate hover:text-primary text-sm font-medium"
          >
            {locale === 'tr' ? 'EN' : 'TR'}
          </button>
        </div>
      </nav>
    </header>
  );
}
