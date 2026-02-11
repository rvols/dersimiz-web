'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type User = {
  id: string;
  phone_number: string;
  full_name: string | null;
  role: string | null;
  is_approved: boolean;
  is_banned: boolean;
  onboarding_completed: boolean;
  created_at: string;
};

export default function AdminUsersPage() {
  const t = useTranslations('admin_panel');
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [role, setRole] = useState<string>('');
  const [loading, setLoading] = useState(true);

  function load() {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    const params = new URLSearchParams({ page: String(pagination.page), limit: String(pagination.limit) });
    if (role) params.set('role', role);
    fetch(`${API_URL}/api/v1/admin/users?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.data?.users) setUsers(data.data.users);
        if (data?.data?.pagination) setPagination((p) => ({ ...p, ...data.data.pagination }));
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setLoading(true);
    load();
  }, [pagination.page, role]);

  function approve(id: string) {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    fetch(`${API_URL}/api/v1/admin/users/${id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(() => load());
  }

  function ban(id: string) {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    fetch(`${API_URL}/api/v1/admin/users/${id}/ban`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(() => load());
  }

  if (loading && users.length === 0) {
    return <p className="text-neutral-slate">{t('loading')}</p>;
  }

  return (
    <div>
      <h1 className="font-display font-bold text-2xl text-neutral-carbon mb-6">
        {t('users')}
      </h1>
      <div className="mb-4 flex gap-4 items-center">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-button border border-neutral-outline px-4 py-2 bg-white"
        >
          <option value="">{t('filter_all')}</option>
          <option value="tutor">{t('role_tutor')}</option>
          <option value="student">{t('role_student')}</option>
        </select>
      </div>
      <div className="bg-neutral-white rounded-card border border-neutral-outline shadow-card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-neutral-mist border-b border-neutral-outline">
            <tr>
              <th className="px-4 py-3 text-sm font-medium text-neutral-carbon">{t('col_phone')}</th>
              <th className="px-4 py-3 text-sm font-medium text-neutral-carbon">{t('col_name')}</th>
              <th className="px-4 py-3 text-sm font-medium text-neutral-carbon">{t('col_role')}</th>
              <th className="px-4 py-3 text-sm font-medium text-neutral-carbon">{t('col_approval')}</th>
              <th className="px-4 py-3 text-sm font-medium text-neutral-carbon">{t('col_created')}</th>
              <th className="px-4 py-3 text-sm font-medium text-neutral-carbon">{t('col_actions')}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-neutral-outline last:border-0">
                <td className="px-4 py-3 text-sm">{u.phone_number}</td>
                <td className="px-4 py-3 text-sm">{u.full_name || '—'}</td>
                <td className="px-4 py-3 text-sm">{u.role || '—'}</td>
                <td className="px-4 py-3 text-sm">
                  {u.is_approved ? (
                    <span className="text-tutor-teal">{t('status_approved')}</span>
                  ) : (
                    <span className="text-tutor-gold">{t('status_pending')}</span>
                  )}
                  {u.is_banned && <span className="ml-2 text-student-coral">{t('status_banned')}</span>}
                </td>
                <td className="px-4 py-3 text-sm text-neutral-slate">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-sm">
                  {!u.is_approved && u.role && (
                    <button
                      onClick={() => approve(u.id)}
                      className="text-primary hover:underline mr-2"
                    >
                      {t('btn_approve')}
                    </button>
                  )}
                  {!u.is_banned && (
                    <button
                      onClick={() => ban(u.id)}
                      className="text-student-coral hover:underline"
                    >
                      {t('btn_ban')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex gap-4 items-center text-sm text-neutral-slate">
        <span>{t('total')}: {pagination.total}</span>
        {pagination.pages > 1 && (
          <div className="flex gap-2">
            <button
              onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
              disabled={pagination.page <= 1}
              className="disabled:opacity-50"
            >
              {t('prev')}
            </button>
            <span>
              {pagination.page} / {pagination.pages}
            </span>
            <button
              onClick={() => setPagination((p) => ({ ...p, page: Math.min(p.pages, p.page + 1) }))}
              disabled={pagination.page >= pagination.pages}
              className="disabled:opacity-50"
            >
              {t('next')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
