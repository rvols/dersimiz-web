'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type Stats = {
  total_users: number;
  total_tutors: number;
  total_students: number;
  pending_approvals: number;
  revenue_cents: number;
} | null;

const cardColors: Record<string, string> = {
  primary: 'text-primary',
  'tutor-teal': 'text-tutor-teal',
  'student-orange': 'text-student-orange',
  'tutor-gold': 'text-tutor-gold',
};

export default function AdminDashboardPage() {
  const t = useTranslations('admin_panel');
  const [stats, setStats] = useState<Stats>(null);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    fetch(`${API_URL}/api/v1/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.data) setStats(data.data);
      })
      .catch(console.error);
  }, []);

  if (stats === null) {
    return <p className="text-neutral-slate">{t('loading')}</p>;
  }

  const cards = [
    { labelKey: 'stats_total_users' as const, value: stats.total_users, color: 'primary' },
    { labelKey: 'stats_tutors' as const, value: stats.total_tutors, color: 'tutor-teal' },
    { labelKey: 'stats_students' as const, value: stats.total_students, color: 'student-orange' },
    { labelKey: 'stats_pending' as const, value: stats.pending_approvals, color: 'tutor-gold' },
    { labelKey: 'stats_revenue' as const, value: (stats.revenue_cents / 100).toFixed(2), color: 'primary' },
  ];

  return (
    <div>
      <h1 className="font-display font-bold text-2xl text-neutral-carbon mb-8">
        {t('dashboard')}
      </h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
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
