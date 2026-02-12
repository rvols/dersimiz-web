'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams, useRouter } from 'next/navigation';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { ActionsDropdown, type ActionItem } from '@/components/admin/ActionsDropdown';
import { IconView, IconChat } from '@/components/admin/icons';
import { UserProfileModal } from '@/components/admin/UserProfileModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const LIMIT_OPTIONS = [10, 20, 50];

type Ticket = {
  id: string;
  user_id: string;
  status: string;
  subject: string | null;
  created_at: string;
  updated_at: string;
  user: { full_name: string | null; phone_number: string } | null;
  unread_count?: number;
};

export default function AdminSupportPage() {
  const t = useTranslations('admin_panel');
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [createModal, setCreateModal] = useState(false);
  const [createUserId, setCreateUserId] = useState('');
  const [createUserDisplay, setCreateUserDisplay] = useState('');
  const [createUserSearch, setCreateUserSearch] = useState('');
  const [createUserResults, setCreateUserResults] = useState<{ id: string; full_name: string | null; phone_number: string }[]>([]);
  const [createUserSearching, setCreateUserSearching] = useState(false);
  const [createSubject, setCreateSubject] = useState('');
  const [createBody, setCreateBody] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const loadTickets = useCallback(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams({
      page: String(pagination.page),
      limit: String(pagination.limit),
    });
    if (statusFilter) params.set('status', statusFilter);
    if (search.trim()) params.set('search', search.trim());
    fetch(`${API_URL}/api/v1/admin/support-tickets?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.data?.tickets) setTickets(data.data.tickets);
        if (data?.data?.pagination) setPagination((p) => ({ ...p, ...data.data.pagination }));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [pagination.page, pagination.limit, statusFilter, search]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    const uid = searchParams.get('create');
    if (uid) {
      setCreateUserId(uid);
      setCreateUserDisplay(uid);
      setCreateModal(true);
      setCreateSubject('');
      setCreateBody('');
      setCreateUserSearch('');
      setCreateUserResults([]);
      window.history.replaceState({}, '', '/admin/support');
      const token = localStorage.getItem('admin_token');
      if (token) {
        fetch(`${API_URL}/api/v1/admin/users/${uid}/profile`, { headers: { Authorization: `Bearer ${token}` } })
          .then((r) => r.json())
          .then((d) => {
            if (d?.data?.profile) {
              const p = d.data.profile;
              setCreateUserDisplay(`${p.full_name || '—'} — ${p.phone_number}`);
            }
          })
          .catch(() => {});
      }
    }
  }, [searchParams]);

  useEffect(() => {
    setPagination((p) => ({ ...p, page: 1 }));
  }, [statusFilter, search]);

  useEffect(() => {
    if (!createModal || !createUserSearch.trim()) {
      setCreateUserResults([]);
      return;
    }
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    const q = createUserSearch.trim();
    setCreateUserSearching(true);
    fetch(`${API_URL}/api/v1/admin/users?limit=20&search=${encodeURIComponent(q)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.data?.users) setCreateUserResults(data.data.users);
        else setCreateUserResults([]);
      })
      .catch(() => setCreateUserResults([]))
      .finally(() => setCreateUserSearching(false));
  }, [createModal, createUserSearch]);

  function openTicket(ticket: Ticket) {
    router.push(`/admin/support/${ticket.id}`);
  }

  async function createTicket() {
    const token = localStorage.getItem('admin_token');
    if (!token || !createSubject.trim()) return;
    setCreateLoading(true);
    const res = await fetch(`${API_URL}/api/v1/admin/support-tickets`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: createUserId.trim(),
        subject: createSubject.trim(),
        body: createBody.trim() || undefined,
      }),
    });
    const data = await res.json();
    if (data?.data?.ticket) {
      setCreateModal(false);
      setCreateUserId('');
      setCreateUserDisplay('');
      setCreateUserSearch('');
      setCreateUserResults([]);
      setCreateSubject('');
      setCreateBody('');
      loadTickets();
      router.push(`/admin/support/${data.data.ticket.id}`);
      window.dispatchEvent(new Event('admin:support-badge-refresh'));
    } else if (data?.error?.message) {
      alert(data.error.message);
    }
    setCreateLoading(false);
  }

  const ticketColumns: Column<Ticket>[] = [
    {
      key: 'user',
      header: t('col_user'),
      render: (ticket) => (
        <span>
          {ticket.user?.full_name || '—'} ({ticket.user?.phone_number})
          {ticket.unread_count && ticket.unread_count > 0 && (
            <span className="ml-2 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-student-coral text-white text-xs font-bold">
              {ticket.unread_count}
            </span>
          )}
        </span>
      ),
    },
    { key: 'subject', header: t('col_subject'), render: (ticket) => ticket.subject || '—' },
    { key: 'status', header: t('col_status'), render: (ticket) => ticket.status },
    {
      key: 'date',
      header: t('col_date'),
      render: (ticket) => <span className="text-neutral-slate">{new Date(ticket.created_at).toLocaleString()}</span>,
    },
  ];

  function getActions(ticket: Ticket): ActionItem[] {
    return [
      { key: 'view', label: t('btn_view_ticket'), icon: <IconChat />, onClick: () => openTicket(ticket) },
      { key: 'profile', label: t('btn_view_profile'), icon: <IconView />, onClick: () => setProfileUserId(ticket.user_id) },
    ];
  }

  if (loading && tickets.length === 0) {
    return <p className="text-neutral-slate">{t('loading')}</p>;
  }

  return (
    <div>
      <h1 className="font-display font-bold text-2xl text-neutral-carbon mb-6">
        {t('support_tickets_title')}
      </h1>
      <div className="mb-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4 items-center">
          <button
            type="button"
            onClick={() => setCreateModal(true)}
            className="btn-primary"
          >
            {t('btn_create_ticket')}
          </button>
          <input
            type="search"
            placeholder={t('search_placeholder_support')}
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
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
            className="rounded-button border border-neutral-outline px-4 py-2 bg-white"
          >
            <option value="">{t('filter_all_status')}</option>
            <option value="open">Open</option>
            <option value="replied">Replied</option>
            <option value="closed">Closed</option>
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
      <DataTable<Ticket>
        columns={ticketColumns}
        data={tickets}
        keyExtractor={(t) => t.id}
        emptyMessage={t('no_tickets')}
        onRowClick={openTicket}
        rowActions={(ticket) => (
          <ActionsDropdown actions={getActions(ticket)} aria-label={`Actions for ticket ${ticket.id}`} />
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

      {createModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-card max-w-md w-full p-6 shadow-xl max-h-[90vh] overflow-auto">
            <h2 className="font-display font-bold text-lg text-neutral-carbon mb-4">{t('btn_create_ticket')}</h2>
            <div className="space-y-3 mb-4">
              <label className="block text-sm font-medium text-neutral-carbon">{t('col_user')}</label>
              <input
                type="text"
                value={createUserId ? createUserDisplay : createUserSearch}
                onChange={(e) => {
                  if (createUserId) { setCreateUserId(''); setCreateUserDisplay(''); }
                  setCreateUserSearch(e.target.value);
                }}
                placeholder={t('search_placeholder')}
                className="w-full rounded-button border border-neutral-outline px-4 py-2"
              />
              {createUserSearching && <p className="text-sm text-neutral-slate">{t('loading')}</p>}
              {!createUserId && createUserResults.length > 0 && (
                <div className="border border-neutral-outline rounded-button max-h-48 overflow-auto">
                  {createUserResults.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setCreateUserId(u.id);
                        setCreateUserDisplay(`${u.full_name || '—'} — ${u.phone_number}`);
                        setCreateUserSearch('');
                        setCreateUserResults([]);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-neutral-mist text-sm border-b border-neutral-outline last:border-0"
                    >
                      {u.full_name || '—'} — {u.phone_number}
                    </button>
                  ))}
                </div>
              )}
              <label className="block text-sm font-medium text-neutral-carbon">{t('col_subject')}</label>
              <input
                type="text"
                value={createSubject}
                onChange={(e) => setCreateSubject(e.target.value)}
                placeholder={t('subject_required')}
                className="w-full rounded-button border border-neutral-outline px-4 py-2"
              />
              <label className="block text-sm font-medium text-neutral-carbon">{t('reply_placeholder')}</label>
              <textarea
                value={createBody}
                onChange={(e) => setCreateBody(e.target.value)}
                placeholder={t('reply_placeholder')}
                className="w-full rounded-button border border-neutral-outline px-4 py-2 min-h-[80px]"
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setCreateModal(false)} className="btn-secondary">
                {t('cancel')}
              </button>
              <button
                onClick={createTicket}
                disabled={!createSubject.trim() || !createUserId.trim() || createLoading}
                className="btn-primary"
              >
                {createLoading ? t('loading') : t('btn_create_ticket')}
              </button>
            </div>
          </div>
        </div>
      )}

      {profileUserId && (
        <UserProfileModal
          userId={profileUserId}
          onClose={() => setProfileUserId(null)}
          onCreateSupportTicket={(uid) => { setProfileUserId(null); setCreateUserId(uid); setCreateModal(true); setCreateSubject(''); setCreateBody(''); }}
        />
      )}
    </div>
  );
}
