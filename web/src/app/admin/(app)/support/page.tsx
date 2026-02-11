'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type Ticket = {
  id: string;
  user_id: string;
  status: string;
  subject: string | null;
  created_at: string;
  user: { full_name: string | null; phone_number: string } | null;
};

export default function AdminSupportPage() {
  const t = useTranslations('admin_panel');
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    fetch(`${API_URL}/api/v1/admin/support-tickets`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.data?.tickets) setTickets(data.data.tickets);
      })
      .catch(console.error);
  }, []);

  return (
    <div>
      <h1 className="font-display font-bold text-2xl text-neutral-carbon mb-6">
        {t('support_tickets_title')}
      </h1>
      <div className="bg-neutral-white rounded-card border border-neutral-outline shadow-card overflow-hidden">
        {tickets.length === 0 ? (
          <p className="p-8 text-neutral-slate">{t('no_tickets')}</p>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-neutral-mist border-b border-neutral-outline">
              <tr>
                <th className="px-4 py-3 text-sm font-medium text-neutral-carbon">{t('col_user')}</th>
                <th className="px-4 py-3 text-sm font-medium text-neutral-carbon">{t('col_subject')}</th>
                <th className="px-4 py-3 text-sm font-medium text-neutral-carbon">{t('col_status')}</th>
                <th className="px-4 py-3 text-sm font-medium text-neutral-carbon">{t('col_date')}</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} className="border-b border-neutral-outline last:border-0">
                  <td className="px-4 py-3 text-sm">
                    {t.user?.full_name || '—'} ({t.user?.phone_number})
                  </td>
                  <td className="px-4 py-3 text-sm">{t.subject || '—'}</td>
                  <td className="px-4 py-3 text-sm">{t.status}</td>
                  <td className="px-4 py-3 text-sm text-neutral-slate">
                    {new Date(t.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
