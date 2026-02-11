'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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

export default function AdminTransactionsPage() {
  const t = useTranslations('admin_panel');
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    fetch(`${API_URL}/api/v1/admin/transactions?page=1&limit=20`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.data?.transactions) setTransactions(data.data.transactions);
        if (data?.data?.pagination) setPagination(data.data.pagination);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-neutral-slate">{t('loading')}</p>;

  return (
    <div>
      <h1 className="font-display font-bold text-2xl text-neutral-carbon mb-6">
        {t('transactions')}
      </h1>
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
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-b border-neutral-outline last:border-0">
                  <td className="px-4 py-3 text-sm">{t.full_name || '—'} ({t.phone_number})</td>
                  <td className="px-4 py-3 text-sm">{t.type} ({t.billing_provider})</td>
                  <td className="px-4 py-3 text-sm">{(t.amount_cents / 100).toFixed(2)} {t.currency}</td>
                  <td className="px-4 py-3 text-sm">{t.status}</td>
                  <td className="px-4 py-3 text-sm text-neutral-slate">{new Date(t.created_at).toLocaleString()}</td>
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
