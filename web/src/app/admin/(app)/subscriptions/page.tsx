'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type Sub = {
  id: string;
  user_id: string;
  full_name: string | null;
  phone_number: string;
  plan_slug: string;
  plan_name: unknown;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  billing_interval: string;
};

export default function AdminSubscriptionsPage() {
  const t = useTranslations('admin_panel');
  const [subscriptions, setSubscriptions] = useState<Sub[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    fetch(`${API_URL}/api/v1/admin/subscriptions?page=1&limit=20`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.data?.subscriptions) setSubscriptions(data.data.subscriptions);
        if (data?.data?.pagination) setPagination(data.data.pagination);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-neutral-slate">{t('loading')}</p>;

  const planName = (pn: unknown) => (typeof pn === 'object' && pn && 'tr' in pn ? (pn as { tr: string }).tr : String(pn ?? '—'));

  return (
    <div>
      <h1 className="font-display font-bold text-2xl text-neutral-carbon mb-6">
        {t('subscriptions')}
      </h1>
      <div className="bg-neutral-white rounded-card border border-neutral-outline shadow-card overflow-hidden">
        {subscriptions.length === 0 ? (
          <p className="p-8 text-neutral-slate">{t('no_subscriptions')}</p>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-neutral-mist border-b border-neutral-outline">
              <tr>
                <th className="px-4 py-3 text-sm font-medium text-neutral-carbon">{t('col_user')}</th>
                <th className="px-4 py-3 text-sm font-medium text-neutral-carbon">{t('col_plan')}</th>
                <th className="px-4 py-3 text-sm font-medium text-neutral-carbon">{t('col_start')}</th>
                <th className="px-4 py-3 text-sm font-medium text-neutral-carbon">{t('col_end')}</th>
                <th className="px-4 py-3 text-sm font-medium text-neutral-carbon">{t('col_active')}</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((s) => (
                <tr key={s.id} className="border-b border-neutral-outline last:border-0">
                  <td className="px-4 py-3 text-sm">{s.full_name || '—'} ({s.phone_number})</td>
                  <td className="px-4 py-3 text-sm">{planName(s.plan_name)} ({s.billing_interval})</td>
                  <td className="px-4 py-3 text-sm">{new Date(s.start_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm">{s.end_date ? new Date(s.end_date).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-sm">{s.is_active ? t('yes') : t('no')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-4 text-sm text-neutral-slate">{t('total')}: {pagination.total}</p>
    </div>
  );
}
