'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const COOKIE_NAME = 'NEXT_LOCALE';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

function setLocaleCookie(locale: string) {
  document.cookie = `${COOKIE_NAME}=${locale}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export default function AdminLoginPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('admin_panel');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function switchLocale() {
    const next = locale === 'tr' ? 'en' : 'tr';
    setLocaleCookie(next);
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message || t('login_failed'));
        return;
      }
      if (data.data?.access_token) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('admin_token', data.data.access_token);
        }
        router.push('/admin/dashboard');
        router.refresh();
      }
    } catch (err) {
      setError(t('connection_error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-neutral-slate hover:text-primary">
            <span className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-student-orange" />
            </span>
            <span className="font-display font-bold">Dersimiz</span>
          </Link>
          <button
            type="button"
            onClick={switchLocale}
            className="text-sm font-medium text-neutral-slate hover:text-primary transition-colors"
          >
            {locale === 'tr' ? 'EN' : 'TR'}
          </button>
        </div>
        <div className="bg-neutral-white rounded-card border border-neutral-outline shadow-card p-8">
          <h1 className="font-display font-bold text-2xl text-neutral-carbon mb-2">
            {t('login_title')}
          </h1>
          <p className="text-neutral-slate text-sm mb-6">
            {t('login_subtitle')}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-carbon mb-1">
                {t('email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-button border border-neutral-outline px-4 py-3 bg-neutral-white focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-carbon mb-1">
                {t('password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-button border border-neutral-outline px-4 py-3 bg-neutral-white focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                required
                autoComplete="current-password"
              />
            </div>
            {error && (
              <p className="text-sm text-student-coral">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-60"
            >
              {loading ? t('logging_in') : t('login_button')}
            </button>
          </form>
        </div>
        <p className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-neutral-slate hover:text-primary transition-colors"
          >
            ← {t('return_to_home')}
          </Link>
        </p>
      </div>
    </div>
  );
}
