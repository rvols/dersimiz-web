'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const LIMIT_OPTIONS = [10, 20, 50];

type Plan = { id: string; slug: string; monthly_price_cents: number; yearly_price_cents: number };
type UserOption = { id: string; full_name: string | null; phone_number: string };

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
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, pages: 0 });
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [simulateModal, setSimulateModal] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [simUserSearch, setSimUserSearch] = useState('');
  const [simUserResults, setSimUserResults] = useState<UserOption[]>([]);
  const [simSelectedUser, setSimSelectedUser] = useState<UserOption | null>(null);
  const [simPlanId, setSimPlanId] = useState('');
  const [simInterval, setSimInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [simLoading, setSimLoading] = useState(false);

  const load = useCallback(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams({
      page: String(pagination.page),
      limit: String(pagination.limit),
    });
    if (status === 'active') params.set('status', 'active');
    fetch(`${API_URL}/api/v1/admin/subscriptions?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.data?.subscriptions) setSubscriptions(data.data.subscriptions);
        if (data?.data?.pagination) setPagination((p) => ({ ...p, ...data.data.pagination }));
      })
      .finally(() => setLoading(false));
  }, [pagination.page, pagination.limit, status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    fetch(`${API_URL}/api/v1/admin/subscription-plans`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => d?.data?.plans && setPlans(d.data.plans));
  }, []);

  useEffect(() => {
    if (!simulateModal || !simUserSearch.trim()) {
      setSimUserResults([]);
      return;
    }
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    fetch(`${API_URL}/api/v1/admin/users?limit=20&search=${encodeURIComponent(simUserSearch.trim())}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => d?.data?.users && setSimUserResults(d.data.users))
      .catch(() => setSimUserResults([]));
  }, [simulateModal, simUserSearch]);

  async function handleSimulatePurchase() {
    if (!simSelectedUser || !simPlanId) return;
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    setSimLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/admin/transactions/simulate-purchase`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: simSelectedUser.id, plan_id: simPlanId, billing_interval: simInterval }),
      });
      const data = await res.json();
      if (data?.success) {
        setSimulateModal(false);
        setSimSelectedUser(null);
        setSimPlanId('');
        setSimUserSearch('');
        load();
      } else {
        alert(data?.error?.message || 'Failed');
      }
    } finally {
      setSimLoading(false);
    }
  }

  if (loading && subscriptions.length === 0) return <p className="text-neutral-slate">{t('loading')}</p>;

  const planName = (pn: unknown) => (typeof pn === 'object' && pn && 'tr' in pn ? (pn as { tr: string }).tr : String(pn ?? '—'));

  return (
    <div>
      <h1 className="font-display font-bold text-2xl text-neutral-carbon mb-6">
        {t('subscriptions')}
      </h1>
      <div className="mb-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4 items-center">
          <button onClick={() => setSimulateModal(true)} className="btn-primary">
            Simulate purchase (IAP test)
          </button>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
            className="rounded-button border border-neutral-outline px-4 py-2 bg-white"
          >
            <option value="">{t('filter_all')}</option>
            <option value="active">{t('filter_active_only')}</option>
          </select>
          <select
          value={pagination.limit}
          onChange={(e) => setPagination((p) => ({ ...p, limit: Number(e.target.value), page: 1 }))}
          className="rounded-button border border-neutral-outline px-4 py-2 bg-white"
        >
          {LIMIT_OPTIONS.map((n) => (
            <option key={n} value={n}>{n} per page</option>
          ))}
        </select>
        </div>
      </div>

      {simulateModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-card max-w-md w-full p-6 shadow-xl">
            <h2 className="font-display font-bold text-lg text-neutral-carbon mb-4">Simulate IAP purchase</h2>
            <div className="space-y-3 mb-4">
              <label className="block text-sm font-medium">{t('col_user')}</label>
              <input
                type="text"
                value={simSelectedUser ? `${simSelectedUser.full_name || '—'} — ${simSelectedUser.phone_number}` : simUserSearch}
                onChange={(e) => { if (simSelectedUser) setSimSelectedUser(null); setSimUserSearch(e.target.value); }}
                placeholder={t('search_placeholder')}
                className="w-full rounded-button border border-neutral-outline px-4 py-2"
              />
              {!simSelectedUser && simUserResults.length > 0 && (
                <div className="border rounded-button max-h-32 overflow-auto">
                  {simUserResults.map((u) => (
                    <button key={u.id} type="button" onClick={() => { setSimSelectedUser(u); setSimUserSearch(''); setSimUserResults([]); }}
                      className="w-full text-left px-4 py-2 hover:bg-neutral-mist text-sm">
                      {u.full_name || '—'} — {u.phone_number}
                    </button>
                  ))}
                </div>
              )}
              <label className="block text-sm font-medium">{t('col_plan')}</label>
              <select value={simPlanId} onChange={(e) => setSimPlanId(e.target.value)} className="w-full rounded-button border border-neutral-outline px-4 py-2 bg-white">
                <option value="">Select plan</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.slug} — {(p.monthly_price_cents / 100).toFixed(0)}/mo, {(p.yearly_price_cents / 100).toFixed(0)}/yr
                  </option>
                ))}
              </select>
              <label className="block text-sm font-medium">Billing</label>
              <select value={simInterval} onChange={(e) => setSimInterval(e.target.value as 'monthly' | 'yearly')} className="w-full rounded-button border border-neutral-outline px-4 py-2 bg-white">
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setSimulateModal(false); setSimSelectedUser(null); setSimPlanId(''); setSimUserSearch(''); }} className="btn-secondary">{t('cancel')}</button>
              <button onClick={handleSimulatePurchase} disabled={!simSelectedUser || !simPlanId || simLoading} className="btn-primary">
                {simLoading ? t('loading') : 'Simulate'}
              </button>
            </div>
          </div>
        </div>
      )}

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
      <div className="mt-4 flex flex-wrap gap-4 items-center justify-between text-sm text-neutral-slate">
        <span>
          {t('total')}: {pagination.total}
          {pagination.pages > 0 && ` · ${t('page')} ${pagination.page} / ${pagination.pages}`}
        </span>
        {pagination.pages > 1 && (
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
              disabled={pagination.page <= 1}
              className="rounded-button border border-neutral-outline px-3 py-1.5 disabled:opacity-50 hover:bg-neutral-mist"
            >
              {t('prev')}
            </button>
            <span>{pagination.page} / {pagination.pages}</span>
            <button
              onClick={() => setPagination((p) => ({ ...p, page: Math.min(p.pages, p.page + 1) }))}
              disabled={pagination.page >= pagination.pages}
              className="rounded-button border border-neutral-outline px-3 py-1.5 disabled:opacity-50 hover:bg-neutral-mist"
            >
              {t('next')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
