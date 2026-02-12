'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type Stats = {
  total_users?: number;
  total_tutors?: number;
  total_students?: number;
  approved_students?: number;
  approved_tutors?: number;
  total_users_without_admin?: number;
  pending_approvals?: number;
  rejected_users?: number;
  support_tickets_awaiting_reply?: number;
  tutors_with_subscription?: number;
  tutors_subscription_rate?: number;
  revenue_cents?: number;
  error?: string;
} | null;

const cardColors: Record<string, string> = {
  primary: 'text-primary',
  'tutor-teal': 'text-tutor-teal',
  'student-orange': 'text-student-orange',
  'tutor-gold': 'text-tutor-gold',
};

function safeNum(v: number | undefined, fallback: number): number {
  return typeof v === 'number' && !Number.isNaN(v) ? v : fallback;
}

export default function AdminDashboardPage() {
  const t = useTranslations('admin_panel');
  const [stats, setStats] = useState<Stats>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      setLoadError('Unauthorized');
      setLoading(false);
      return;
    }
    setLoadError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.error?.message || data?.error || `HTTP ${res.status}`;
        setLoadError(msg);
        setStats(null);
        return;
      }
      if (data?.data) {
        setStats(data.data);
      } else {
        setLoadError(t('connection_error'));
        setStats(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('connection_error');
      setLoadError(msg);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading && stats === null) {
    return <p className="text-neutral-slate">{t('loading')}</p>;
  }

  if (loadError && stats === null) {
    return (
      <div>
        <h1 className="font-display font-bold text-2xl text-neutral-carbon mb-8">{t('dashboard')}</h1>
        <div className="bg-neutral-white rounded-card border border-neutral-outline shadow-card p-6">
          <p className="text-neutral-slate mb-4">{loadError}</p>
          <button
            type="button"
            onClick={fetchStats}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90"
          >
            {t('retry')}
          </button>
        </div>
      </div>
    );
  }

  const s = stats ?? {};
  const cards = [
    { labelKey: 'stats_total_students' as const, value: safeNum(s.total_students, 0), color: 'student-orange' },
    { labelKey: 'stats_approved_students' as const, value: safeNum(s.approved_students, 0), color: 'student-orange' },
    { labelKey: 'stats_total_tutors' as const, value: safeNum(s.total_tutors, 0), color: 'tutor-teal' },
    { labelKey: 'stats_approved_tutors' as const, value: safeNum(s.approved_tutors, 0), color: 'tutor-teal' },
    { labelKey: 'stats_total_users_without_admin' as const, value: safeNum(s.total_users_without_admin, 0), color: 'primary' },
    { labelKey: 'stats_pending' as const, value: safeNum(s.pending_approvals, 0), color: 'tutor-gold' },
    { labelKey: 'stats_rejected' as const, value: safeNum(s.rejected_users, 0), color: 'tutor-gold' },
    { labelKey: 'stats_support_awaiting' as const, value: safeNum(s.support_tickets_awaiting_reply, 0), color: 'primary' },
    { labelKey: 'stats_tutors_with_subscription' as const, value: `${safeNum(s.tutors_with_subscription, 0)} (${safeNum(s.tutors_subscription_rate, 0)}%)`, color: 'tutor-teal' },
    { labelKey: 'stats_revenue' as const, value: (safeNum(s.revenue_cents, 0) / 100).toFixed(2), color: 'primary' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display font-bold text-2xl text-neutral-carbon">{t('dashboard')}</h1>
        <button
          type="button"
          onClick={fetchStats}
          disabled={loading}
          className="text-sm px-4 py-2 text-neutral-slate hover:text-primary border border-neutral-outline rounded-lg hover:border-primary disabled:opacity-50"
        >
          {loading ? t('loading') : t('refresh')}
        </button>
      </div>
      {s.error && (
        <p className="text-amber-600 text-sm mb-4">{s.error}</p>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <div
            key={card.labelKey}
            className="bg-neutral-white rounded-card border border-neutral-outline shadow-card p-6"
          >
            <p className="text-sm text-neutral-slate mb-1">{t(card.labelKey)}</p>
            <p className={`font-display font-bold text-2xl ${cardColors[card.color] || 'text-primary'}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
