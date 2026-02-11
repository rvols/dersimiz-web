import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations('legal');
  return (
    <div className="min-h-screen bg-neutral-mist">
      <header className="border-b border-neutral-outline bg-neutral-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-neutral-slate hover:text-primary font-medium transition-colors"
          >
            <span className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-student-orange" />
            </span>
            <span className="font-display font-bold">{t('nav_title')}</span>
          </Link>
          <nav className="flex flex-wrap gap-4 text-sm">
            <Link href="/legal/terms" className="text-neutral-slate hover:text-primary">
              {t('terms')}
            </Link>
            <Link href="/legal/privacy" className="text-neutral-slate hover:text-primary">
              {t('privacy')}
            </Link>
            <Link href="/legal/cookies" className="text-neutral-slate hover:text-primary">
              {t('cookies')}
            </Link>
            <Link href="/legal/usage" className="text-neutral-slate hover:text-primary">
              {t('usage')}
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">{children}</main>
    </div>
  );
}
