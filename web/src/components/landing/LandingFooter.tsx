'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';

export function LandingFooter() {
  const t = useTranslations('landing.footer');

  return (
    <footer className="bg-neutral-carbon text-neutral-mist py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-student-orange" />
            </span>
            <span className="font-display font-bold text-lg">{t('brand')}</span>
          </div>
          <p className="text-neutral-slate text-sm">{t('tagline')}</p>
          <div className="flex gap-6 text-sm">
            <Link href="/legal/terms" className="hover:text-white transition-colors">
              {t('terms')}
            </Link>
            <Link href="/legal/privacy" className="hover:text-white transition-colors">
              {t('privacy')}
            </Link>
            <a href="#contact" className="hover:text-white transition-colors">
              {t('contact')}
            </a>
          </div>
        </div>
        <p className="text-center text-neutral-slate/80 text-xs mt-8">
          {t('copyright', { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}
