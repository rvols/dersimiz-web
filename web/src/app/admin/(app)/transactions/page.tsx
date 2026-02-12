'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const LIMIT_OPTIONS = [10, 20, 50];

type Tx = {
  id: string;
  user_id: string;
  full_name: string | null;
  phone_number: string;
  type: string;
  amount_cents: number;
  currency: string;
  status: string;
  billing_provider: string;
  created_at: string;
};

function formatAmount(cents: number, currency: string): string {
  if (currency === 'TRY') return `${(cents / 100).toFixed(2)} ₺`;
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

export default function AdminTransactionsPage() {
  const t = useTranslations('admin_panel');
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, pages: 0 });
  const [type, setType] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refundingId, setRefundingId] = useState<string | null>(null);

  const load = useCallback(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams({
      page: String(pagination.page),
      limit: String(pagination.limit),
    });
    if (type) params.set('type', type);
    if (status) params.set('status', status);
    fetch(`${API_URL}/api/v1/admin/transactions?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.data?.transactions) setTransactions(data.data.transactions);
        if (data?.data?.pagination) setPagination((p) => ({ ...p, ...data.data.pagination }));
      })
      .finally(() => setLoading(false));
  }, [pagination.page, pagination.limit, type, status]);

  useEffect(() => {
    load();
  }, [load]);

  function handleRefund(tx: Tx) {
    if (tx.status === 'refunded' || tx.status === 'cancelled') return;
    if (!confirm(t('refund_confirm'))) return;
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    setRefundingId(tx.id);
    fetch(`${API_URL}/api/v1/admin/transactions/${tx.id}/refund`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.success) load();
      })
      .finally(() => setRefundingId(null));
  }

  if (loading && transactions.length === 0) return <p className="text-neutral-slate">{t('loading')}</p>;

  return (
    <div>
      <h1 className="font-display font-bold text-2xl text-neutral-carbon mb-6">
        {t('transactions')}
      </h1>
      <div className="mb-4 flex flex-wrap gap-4 items-center">
        <select
          value={type}
          onChange={(e) => { setType(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
          className="rounded-button border border-neutral-outline px-4 py-2 bg-white"
        >
          <option value="">{t('filter_all_types')}</option>
          <option value="subscription">Subscription</option>
          <option value="booster">Booster</option>
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
          className="rounded-button border border-neutral-outline px-4 py-2 bg-white"
        >
          <option value="">{t('filter_all_status')}</option>
          <option value="completed">Completed</option>
          <option value="refunded">Refunded</option>
          <option value="cancelled">Cancelled</option>
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
      <div className="bg-neutral-white rounded-card border border-neutral-outline shadow-card overflow-hidden">
        {transactions.length === 0 ? (
          <p className="p-8 text-neutral-slate">{t('no_transactions')}</p>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-neutral-mist border-b border-neutral-outline">
              <tr>
                <th className="px-4 py-3 text-sm font-medium text-neutral-carbon">{t('col_user')}</th>
                <th className="px-4 py-3 text-sm font-medium text-neutral-carbon">{t('col_type')}</th>
                <th className="px-4 py-3 text-sm font-medium text-neutral-carbon">{t('col_amount')}</th>
                <th className="px-4 py-3 text-sm font-medium text-neutral-carbon">{t('col_status')}</th>
                <th className="px-4 py-3 text-sm font-medium text-neutral-carbon">{t('col_date')}</th>
                <th className="px-4 py-3 text-sm font-medium text-neutral-carbon">{t('col_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-neutral-outline last:border-0">
                  <td className="px-4 py-3 text-sm">{tx.full_name || '—'} ({tx.phone_number})</td>
                  <td className="px-4 py-3 text-sm">{tx.type} ({tx.billing_provider})</td>
                  <td className="px-4 py-3 text-sm">{formatAmount(tx.amount_cents, tx.currency)}</td>
                  <td className="px-4 py-3 text-sm">{tx.status}</td>
                  <td className="px-4 py-3 text-sm text-neutral-slate">{new Date(tx.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm">
                    {(tx.status !== 'refunded' && tx.status !== 'cancelled') ? (
                      <button
                        type="button"
                        onClick={() => handleRefund(tx)}
                        disabled={!!refundingId}
                        className="text-alert-coral hover:underline disabled:opacity-50"
                      >
                        {refundingId === tx.id ? '...' : t('btn_refund')}
                      </button>
                    ) : '—'}
                  </td>
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
