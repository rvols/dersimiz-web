'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { UserProfileModal } from '@/components/admin/UserProfileModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type SupportMessage = {
  id: string;
  body: string;
  is_admin: boolean;
  created_at: string;
};

type TicketData = {
  ticket: { id: string; status: string; subject: string | null; user: { full_name: string | null; phone_number: string } | null; user_id: string };
  messages: SupportMessage[];
};

export default function AdminSupportTicketPage() {
  const t = useTranslations('admin_panel');
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [data, setData] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  const fetchTicket = useCallback(async () => {
    const token = localStorage.getItem('admin_token');
    if (!token || !id) return null;
    const res = await fetch(`${API_URL}/api/v1/admin/support-tickets/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!json?.success || !json?.data) return null;
    const msgs = Array.isArray(json.data.messages) ? json.data.messages : [];
    return { ticket: json.data.ticket, messages: msgs };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchTicket()
      .then((d) => {
        if (d) {
          setData(d);
          window.dispatchEvent(new Event('admin:support-badge-refresh'));
        } else router.replace('/admin/support');
      })
      .finally(() => setLoading(false));
  }, [id, fetchTicket, router]);

  useEffect(() => {
    if (!id || !data) return;
    const interval = setInterval(async () => {
      const d = await fetchTicket();
      if (d) setData(d);
    }, 3000);
    return () => clearInterval(interval);
  }, [id, data, fetchTicket]);

  async function sendReply() {
    if (!data || !replyBody.trim() || sending) return;
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    setSending(true);
    const res = await fetch(`${API_URL}/api/v1/admin/support-tickets/${id}/reply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: replyBody.trim() }),
    });
    const json = await res.json();
    if (json?.success) {
      setReplyBody('');
      const d = await fetchTicket();
      if (d) setData(d);
      window.dispatchEvent(new Event('admin:support-badge-refresh'));
    }
    setSending(false);
  }

  async function updateStatus(status: string) {
    if (!data) return;
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    setStatusUpdating(true);
    const res = await fetch(`${API_URL}/api/v1/admin/support-tickets/${id}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    if (json?.data) {
      setData((prev) => (prev ? { ...prev, ticket: { ...prev.ticket, status } } : null));
      window.dispatchEvent(new Event('admin:support-badge-refresh'));
    }
    setStatusUpdating(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-neutral-slate">{t('loading')}</p>
      </div>
    );
  }

  if (!data) return null;

  const { ticket, messages } = data;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/admin/support"
          className="text-neutral-slate hover:text-neutral-carbon flex items-center gap-1"
        >
          ← {t('prev')}
        </Link>
      </div>
      <div className="bg-neutral-white rounded-card border border-neutral-outline shadow-card overflow-hidden">
        <div className="p-6 border-b border-neutral-outline flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h1 className="font-display font-bold text-2xl text-neutral-carbon mb-1">
              {ticket.subject || '—'}
            </h1>
            <p className="text-neutral-slate">
              {ticket.user?.full_name || ticket.user?.phone_number || '—'} ({ticket.user?.phone_number})
            </p>
            <span className="inline-block mt-2 px-2 py-0.5 rounded text-sm font-medium
              bg-neutral-mist text-neutral-carbon">
              {ticket.status}
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              value={ticket.status}
              onChange={(e) => updateStatus(e.target.value)}
              disabled={statusUpdating}
              className="rounded-button border border-neutral-outline px-4 py-2 bg-white"
            >
              <option value="open">Open</option>
              <option value="replied">Replied</option>
              <option value="closed">Closed</option>
            </select>
            <button
              onClick={() => setProfileUserId(ticket.user_id)}
              className="btn-secondary"
            >
              {t('btn_view_profile')}
            </button>
          </div>
        </div>
        <div className="p-6 min-h-[300px] max-h-[50vh] overflow-auto space-y-4">
          {messages.length === 0 ? (
            <p className="text-neutral-slate py-8">{t('no_messages') || 'No messages yet.'}</p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`p-4 rounded-button max-w-[85%] ${
                  m.is_admin ? 'ml-auto bg-primary/10 border border-primary/20' : 'mr-auto bg-neutral-mist'
                }`}
              >
                <p className="text-neutral-carbon">{m.body}</p>
                <p className="text-xs text-neutral-slate mt-2">
                  {new Date(m.created_at).toLocaleString()}
                  {m.is_admin && ` • ${t('support_label')}`}
                </p>
              </div>
            ))
          )}
        </div>
        {ticket.status !== 'closed' && (
          <div className="p-6 border-t border-neutral-outline">
            <div className="flex gap-3">
              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder={t('reply_placeholder')}
                className="flex-1 rounded-button border border-neutral-outline px-4 py-3 min-h-[100px] resize-y"
                rows={3}
              />
              <button
                onClick={sendReply}
                disabled={!replyBody.trim() || sending}
                className="btn-primary self-end px-6 py-3"
              >
                {sending ? t('loading') : t('btn_send_reply')}
              </button>
            </div>
          </div>
        )}
      </div>
      {profileUserId && (
        <UserProfileModal
          userId={profileUserId}
          onClose={() => setProfileUserId(null)}
          onCreateSupportTicket={(uid) => { setProfileUserId(null); router.push(`/admin/support?create=${uid}`); }}
        />
      )}
    </div>
  );
}
