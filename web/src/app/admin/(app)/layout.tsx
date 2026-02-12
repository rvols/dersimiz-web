'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function useSupportBadge() {
  const [count, setCount] = useState(0);
  const pathname = usePathname();
  const fetchCount = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    if (!token) return;
    fetch(`${API_URL}/api/v1/admin/support-tickets/count`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (typeof data?.data?.count === 'number') setCount(data.data.count);
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, pathname?.startsWith('/admin/support') ? 10000 : 30000);
    return () => clearInterval(interval);
  }, [fetchCount, pathname]);
  useEffect(() => {
    const onRefresh = () => fetchCount();
    window.addEventListener('admin:support-badge-refresh', onRefresh);
    return () => window.removeEventListener('admin:support-badge-refresh', onRefresh);
  }, [fetchCount]);
  return count;
}
const COOKIE_NAME = 'NEXT_LOCALE';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

function setLocaleCookie(locale: string) {
  document.cookie = `${COOKIE_NAME}=${locale}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export default function AdminAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations('admin_panel');
  const [admin, setAdmin] = useState<{ email: string; full_name: string | null } | null>(null);
  const supportBadge = useSupportBadge();

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    if (!token) {
      router.replace('/admin/login');
      return;
    }
    fetch(`${API_URL}/api/v1/admin/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.data?.admin) setAdmin(data.data.admin);
        else router.replace('/admin/login');
      })
      .catch(() => router.replace('/admin/login'));
  }, [router]);

  function logout() {
    localStorage.removeItem('admin_token');
    router.replace('/admin/login');
  }

  function switchLocale() {
    const next = locale === 'tr' ? 'en' : 'tr';
    setLocaleCookie(next);
    router.refresh();
  }

  if (admin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-slate">{t('loading')}</p>
      </div>
    );
  }

  const nav = [
    { href: '/admin/dashboard', labelKey: 'dashboard' as const },
    { href: '/admin/users', labelKey: 'users' as const },
    { href: '/admin/support', labelKey: 'support' as const },
    { href: '/admin/subscriptions', labelKey: 'subscriptions' as const },
    { href: '/admin/transactions', labelKey: 'transactions' as const },
    { href: '/admin/plans', labelKey: 'plans' as const },
    { href: '/admin/boosters', labelKey: 'boosters' as const },
    { href: '/admin/legal', labelKey: 'legal' as const },
    { href: '/admin/content', labelKey: 'content' as const },
    { href: '/admin/lesson-types', labelKey: 'lesson_types' as const },
    { href: '/admin/locations', labelKey: 'locations' as const },
    { href: '/admin/school-types', labelKey: 'school_types' as const },
    { href: '/admin/grades', labelKey: 'grades' as const },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 bg-neutral-white border-r border-neutral-outline flex flex-col">
        <div className="p-4 border-b border-neutral-outline">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-student-orange" />
            </span>
            <span className="font-display font-bold text-neutral-carbon">{t('brand_title')}</span>
          </Link>
        </div>
        <nav className="p-2 flex-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`relative block px-4 py-3 rounded-button font-medium transition-colors ${
                pathname === item.href
                  ? 'bg-primary/10 text-primary'
                  : 'text-neutral-slate hover:bg-neutral-mist hover:text-neutral-carbon'
              }`}
            >
              {t(item.labelKey)}
              {item.href === '/admin/support' && supportBadge > 0 && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center rounded-full bg-student-coral text-white text-xs font-bold">
                  {supportBadge > 99 ? '99+' : supportBadge}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-neutral-outline space-y-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={switchLocale}
              className="text-sm font-medium text-neutral-slate hover:text-primary transition-colors"
            >
              {locale === 'tr' ? 'EN' : 'TR'}
            </button>
          </div>
          <p className="text-sm text-neutral-slate truncate">{admin.email}</p>
          <button
            onClick={logout}
            className="mt-2 text-sm text-neutral-slate hover:text-student-coral"
          >
            {t('logout')}
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
