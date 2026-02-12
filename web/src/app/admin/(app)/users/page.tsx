'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { ActionsDropdown, type ActionItem } from '@/components/admin/ActionsDropdown';
import { IconView, IconApprove, IconBan, IconChat, IconReject } from '@/components/admin/icons';
import { toast } from 'sonner';
import { UserProfileModal } from '@/components/admin/UserProfileModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const LIMIT_OPTIONS = [10, 20, 50];

type User = {
  id: string;
  phone_number: string;
  full_name: string | null;
  role: string | null;
  is_approved: boolean;
  is_banned: boolean;
  is_rejected?: boolean;
  onboarding_completed: boolean;
  created_at: string;
};

export default function AdminUsersPage() {
  const t = useTranslations('admin_panel');
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [role, setRole] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [rejectUserId, setRejectUserId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  const load = useCallback(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams({
      page: String(pagination.page),
      limit: String(pagination.limit),
    });
    if (role) params.set('role', role);
    if (status) params.set('status', status);
    if (search.trim()) params.set('search', search.trim());
    fetch(`${API_URL}/api/v1/admin/users?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.data?.users) setUsers(data.data.users);
        if (data?.data?.pagination) setPagination((p) => ({ ...p, ...data.data.pagination }));
      })
      .finally(() => setLoading(false));
  }, [pagination.page, pagination.limit, role, status, search]);

  useEffect(() => {
    load();
  }, [load]);

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

  const userColumns: Column<User>[] = [
    { key: 'phone', header: t('col_phone'), render: (u) => u.phone_number },
    { key: 'name', header: t('col_name'), render: (u) => u.full_name || '—' },
    { key: 'role', header: t('col_role'), render: (u) => u.role || '—' },
    {
      key: 'approval',
      header: t('col_approval'),
      render: (u) => (
        <>
          {u.is_approved ? (
            <span className="text-tutor-teal">{t('status_approved')}</span>
          ) : u.is_rejected ? (
            <span className="text-student-coral">{t('status_rejected')}</span>
          ) : (
            <span className="text-tutor-gold">{t('status_pending')}</span>
          )}
          {u.is_banned && <span className="ml-2 text-student-coral">{t('status_banned')}</span>}
        </>
      ),
    },
    {
      key: 'created',
      header: t('col_created'),
      render: (u) => <span className="text-neutral-slate">{new Date(u.created_at).toLocaleDateString()}</span>,
    },
  ];

  function getActions(u: User): ActionItem[] {
    const items: ActionItem[] = [
      { key: 'view', label: t('btn_view_profile'), icon: <IconView />, onClick: () => setProfileUserId(u.id) },
      { key: 'support', label: t('btn_create_ticket'), icon: <IconChat />, onClick: () => router.push(`/admin/support?create=${u.id}`) },
    ];
    if (!u.is_approved && u.role) {
      items.push({ key: 'approve', label: t('btn_approve'), icon: <IconApprove />, onClick: () => approve(u.id) });
    }
    if (u.role && !u.is_banned && !u.is_rejected) {
      items.push({ key: 'reject', label: t('btn_reject'), icon: <IconReject />, onClick: () => setRejectUserId(u.id), danger: true });
    }
    if (!u.is_banned) {
      items.push({ key: 'ban', label: t('btn_ban'), icon: <IconBan />, onClick: () => ban(u.id), danger: true });
    }
    return items;
  }

  async function submitReject() {
    if (!rejectUserId || !rejectReason.trim()) return;
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    setRejectLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/admin/users/${rejectUserId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (json?.success !== false) {
        toast.success('User rejected');
        setRejectUserId(null);
        setRejectReason('');
        load();
      } else {
        toast.error(json?.error?.message || 'Failed');
      }
    } catch {
      toast.error('Request failed');
    }
    setRejectLoading(false);
  }

  if (loading && users.length === 0) {
    return <p className="text-neutral-slate">{t('loading')}</p>;
  }

  return (
    <div>
      <h1 className="font-display font-bold text-2xl text-neutral-carbon mb-6">
        {t('users')}
      </h1>
      <div className="mb-4 flex flex-wrap gap-4 items-center">
        <input
          type="search"
          placeholder={t('search_placeholder')}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setSearch(searchInput)}
          className="rounded-button border border-neutral-outline px-4 py-2 min-w-[200px]"
        />
        <button
          type="button"
          onClick={() => { setSearch(searchInput); setPagination((p) => ({ ...p, page: 1 })); }}
          className="btn-secondary"
        >
          {t('search')}
        </button>
        <select
          value={role}
          onChange={(e) => { setRole(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
          className="rounded-button border border-neutral-outline px-4 py-2 bg-white"
        >
          <option value="">{t('filter_all_roles')}</option>
          <option value="tutor">{t('role_tutor')}</option>
          <option value="student">{t('role_student')}</option>
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
          className="rounded-button border border-neutral-outline px-4 py-2 bg-white"
        >
          <option value="">{t('filter_all_status')}</option>
          <option value="pending">{t('status_pending')}</option>
          <option value="approved">{t('status_approved')}</option>
          <option value="rejected">{t('status_rejected')}</option>
          <option value="banned">{t('status_banned')}</option>
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
      <DataTable<User>
        columns={userColumns}
        data={users}
        keyExtractor={(u) => u.id}
        emptyMessage="No users found"
        rowActions={(u) => (
          <ActionsDropdown actions={getActions(u)} aria-label={`Actions for ${u.full_name || u.phone_number}`} />
        )}
        actionsHeader={t('col_actions')}
      />
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
      {profileUserId && (
        <UserProfileModal
          userId={profileUserId}
          onClose={() => setProfileUserId(null)}
          onCreateSupportTicket={(uid) => {
            setProfileUserId(null);
            router.push(`/admin/support?create=${uid}`);
          }}
        />
      )}

      {/* Reject modal - from users list actions */}
      {rejectUserId && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)' }}
          onClick={() => setRejectUserId(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display font-bold text-lg text-neutral-carbon mb-3">{t('reject_modal_title')}</h3>
            <p className="text-sm text-neutral-slate mb-4">{t('reject_reason_placeholder')}</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t('reject_reason_placeholder')}
              className="w-full border border-neutral-outline rounded-xl p-3 text-sm min-h-[120px] resize-y mb-4"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setRejectUserId(null); setRejectReason(''); }}
                className="px-4 py-2.5 rounded-xl border border-neutral-outline text-neutral-slate hover:bg-neutral-mist/50"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                disabled={rejectLoading || !rejectReason.trim()}
                onClick={submitReject}
                className="px-4 py-2.5 rounded-xl bg-student-coral text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rejectLoading ? t('loading', { defaultValue: 'Loading...' }) : t('reject_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
