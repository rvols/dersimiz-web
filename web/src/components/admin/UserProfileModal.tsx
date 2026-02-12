'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/** Build avatar URL — use Next.js proxy (/api-uploads) for same-origin loading, else API URL. */
function getAvatarUrl(avatarPath: string | null | undefined, avatarUrl?: string | null): string | null {
  if (avatarPath) return avatarPath.replace(/^\/uploads/, '/api-uploads');
  if (!avatarUrl) return null;
  try {
    const pathname = new URL(avatarUrl).pathname;
    return pathname.replace(/^\/uploads/, '/api-uploads');
  } catch {
    return avatarUrl.startsWith('/') ? avatarUrl.replace(/^\/uploads/, '/api-uploads') : avatarUrl;
  }
}

type ProfileData = {
  profile: {
    id: string;
    phone_number: string;
    role: string | null;
    full_name: string | null;
    school_name: string | null;
    grade_id?: string | null;
    avatar_url: string | null;
    avatar_path?: string | null;
    is_approved: boolean;
    is_banned: boolean;
    is_rejected?: boolean;
    onboarding_completed: boolean;
    created_at: string;
    student_grade_name?: unknown;
  };
  schools: { id: string; school_name: string }[];
  grades: { id: string; name: unknown; school_type_name: unknown }[];
  lessons: { id: string; lesson_type_id?: string; lesson_type_name: unknown; price_per_hour_cents: number; currency: string }[];
  availability: unknown[];
  subscription: {
    plan_slug: string;
    plan_name: unknown;
    is_active: boolean;
    start_date: string;
    end_date: string | null;
  } | null;
  boosters: {
    id: string;
    display_name: unknown;
    expires_at: string;
    is_active: boolean;
  }[];
  transactions: {
    id: string;
    type: string;
    amount_cents: number;
    currency: string;
    status: string;
    created_at: string;
  }[];
  legal_docs: {
    type: string;
    title: string;
    accepted_at: string;
    ip_address: string;
  }[];
  onboarding_data: Record<string, unknown>;
};

function getLocalizedName(obj: unknown, locale = 'tr'): string {
  if (!obj || typeof obj !== 'object') return '—';
  const o = obj as Record<string, string>;
  return o[locale] || o.en || o.tr || o[''] || '—';
}

type TabKey = 'profile' | 'schools' | 'lessons' | 'availability' | 'subscription' | 'boosters' | 'transactions' | 'legal';

// day 0=Sun, 1=Mon ... 6=Sat. Display Mon-Sun.
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]; // 6am–10pm

function parseSlots(slots: unknown): { day: number; startMin: number; endMin: number }[] {
  if (!Array.isArray(slots)) return [];
  return slots
    .filter((s): s is { day?: number; start?: string; end?: string } => s && typeof s === 'object')
    .map((s) => {
      const day = typeof s.day === 'number' ? s.day : 0;
      const [sh = 0, sm = 0] = String(s.start || '').split(':').map(Number);
      const [eh = 0, em = 0] = String(s.end || '').split(':').map(Number);
      return { day, startMin: sh * 60 + sm, endMin: Math.min(eh * 60 + em, 24 * 60) };
    })
    .filter((s) => s.endMin > s.startMin);
}

function isSlotAvailable(
  parsed: { day: number; startMin: number; endMin: number }[],
  day: number,
  hour: number
): boolean {
  const hourStart = hour * 60;
  const hourEnd = (hour + 1) * 60;
  return parsed.some(
    (s) =>
      s.day === day && s.startMin < hourEnd && s.endMin > hourStart
  );
}

function formatHour(h: number): string {
  return `${h.toString().padStart(2, '0')}:00`;
}

export function UserProfileModal({
  userId,
  onClose,
  onCreateSupportTicket,
  locale = 'tr',
}: {
  userId: string;
  onClose: () => void;
  onCreateSupportTicket?: (uid: string) => void;
  locale?: string;
}) {
  const t = useTranslations('admin_panel');
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('profile');
  const [actionLoading, setActionLoading] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editAvailabilityOpen, setEditAvailabilityOpen] = useState(false);
  const [editSchoolsOpen, setEditSchoolsOpen] = useState(false);
  const [editLessonsOpen, setEditLessonsOpen] = useState(false);
  const [avatarLightboxOpen, setAvatarLightboxOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (!avatarLightboxOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setAvatarLightboxOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [avatarLightboxOpen]);

  const refreshData = () => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    fetch(`${API_URL}/api/v1/admin/users/${userId}/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res?.data && res?.success !== false) setData(res.data);
      });
  };

  useEffect(() => {
    setLoading(true);
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    fetch(`${API_URL}/api/v1/admin/users/${userId}/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res?.data && res?.success !== false) setData(res.data);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const adminFetch = async (path: string, method = 'POST', body?: unknown): Promise<{ success?: boolean; error?: { message?: string }; data?: unknown } | null> => {
    const token = localStorage.getItem('admin_token');
    if (!token) return { success: false, error: { message: 'Not authenticated' } };
    try {
      const res = await fetch(`${API_URL}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined,
      });
      let json: unknown;
      try {
        json = await res.json();
      } catch {
        return { success: false, error: { message: `Request failed (${res.status})` } };
      }
      const obj = json as { success?: boolean; error?: { message?: string }; data?: unknown };
      return obj;
    } catch (e) {
      return { success: false, error: { message: e instanceof Error ? e.message : 'Network error' } };
    }
  };

  if (loading) {
    return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)' }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-3xl p-14 max-w-xs w-full mx-4"
          style={{
            boxShadow: '0 25px 50px -12px rgba(37, 99, 235, 0.15)',
            border: '1px solid rgba(226, 232, 240, 0.8)',
          }}
        >
          <div className="flex flex-col items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-neutral-mist to-neutral-outline animate-pulse" />
            <div className="space-y-2 text-center">
              <div className="h-5 w-40 rounded-lg bg-neutral-mist animate-pulse mx-auto" />
              <div className="h-4 w-28 rounded bg-neutral-mist/70 animate-pulse mx-auto" />
            </div>
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-primary/30 animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)' }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-10 max-w-sm w-full text-center"
          style={{
            boxShadow: '0 25px 50px -12px rgba(37, 99, 235, 0.15)',
            border: '1px solid rgba(226, 232, 240, 0.8)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-16 h-16 rounded-2xl bg-student-coral/10 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-student-coral" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
            </svg>
          </div>
          <h3 className="font-display font-bold text-neutral-carbon text-xl mb-2">Profile not found</h3>
          <p className="text-sm text-neutral-slate mb-6">This user may have been deleted or the ID is invalid.</p>
          <button onClick={onClose} className="btn-secondary">
            {t('cancel')}
          </button>
        </motion.div>
      </div>
    );
  }

  const { profile, schools, grades, lessons, availability, subscription, boosters, transactions, legal_docs, onboarding_data } = data;
  const loc = (locale === 'tr' ? 'tr' : 'en') as 'tr' | 'en';
  const isTutor = profile.role === 'tutor';
  const accent = isTutor ? '#0D9488' : '#F97316';
  const accentLight = isTutor ? 'rgba(13, 148, 136, 0.12)' : 'rgba(249, 115, 22, 0.12)';
  const parsedSlots = parseSlots(availability);

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'profile', label: t('profile_tab_profile'), icon: <IconUser /> },
    { key: 'schools', label: t('profile_tab_schools'), icon: <IconSchool /> },
    { key: 'lessons', label: t('profile_tab_lessons'), icon: <IconBook /> },
    { key: 'availability', label: t('profile_tab_availability'), icon: <IconCalendar /> },
    { key: 'subscription', label: t('profile_tab_subscription'), icon: <IconCard /> },
    { key: 'boosters', label: t('profile_tab_boosters'), icon: <IconBolt /> },
    { key: 'transactions', label: t('profile_tab_transactions'), icon: <IconReceipt /> },
    { key: 'legal', label: t('profile_tab_legal'), icon: <IconDoc /> },
  ];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-auto"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex overflow-hidden"
        style={{
          boxShadow: '0 25px 50px -12px rgba(37, 99, 235, 0.2), 0 0 0 1px rgba(226, 232, 240, 0.8)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Profile sidebar */}
        <div
          className="w-64 shrink-0 flex flex-col"
          style={{
            background: `linear-gradient(180deg, ${accentLight} 0%, rgba(241, 245, 249, 0.5) 100%)`,
            borderRight: '1px solid rgba(226, 232, 240, 0.8)',
          }}
        >
          <div className="p-6 flex flex-col items-center text-center">
            <div
              className="relative w-24 h-24 rounded-2xl overflow-hidden mb-4"
              style={{
                boxShadow: `0 8px 24px rgba(37, 99, 235, 0.2)`,
                border: '3px solid white',
              }}
            >
              {(profile.avatar_path ?? profile.avatar_url) ? (
                <>
                  <img
                    src={getAvatarUrl(profile.avatar_path, profile.avatar_url) ?? ''}
                    alt=""
                    title="Click to enlarge"
                    className="w-full h-full object-cover cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onClick={() => setAvatarLightboxOpen(true)}
                    onKeyDown={(e) => e.key === 'Enter' && setAvatarLightboxOpen(true)}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement?.querySelector('[data-avatar-fallback]')?.classList.remove('hidden');
                    }}
                  />
                  <div
                    data-avatar-fallback
                    className="absolute inset-0 flex items-center justify-center font-display font-bold text-3xl hidden"
                    style={{ backgroundColor: accentLight, color: accent }}
                  >
                    {(profile.full_name || profile.phone_number).charAt(0).toUpperCase()}
                  </div>
                </>
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center font-display font-bold text-3xl"
                  style={{ backgroundColor: accentLight, color: accent }}
                >
                  {(profile.full_name || profile.phone_number).charAt(0).toUpperCase()}
                </div>
              )}
              {profile.is_approved && (
                <div
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#0D9488', boxShadow: '0 2px 8px rgba(13, 148, 136, 0.4)' }}
                >
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            <h2 className="font-display font-bold text-lg text-neutral-carbon truncate w-full">
              {profile.full_name || profile.phone_number}
            </h2>
            <p className="text-xs text-neutral-slate mt-0.5 font-mono">{profile.phone_number}</p>
            <div className="flex flex-col items-center gap-2 mt-3">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold capitalize shrink-0"
                style={{ backgroundColor: accentLight, color: accent }}
              >
                {profile.role === 'tutor' ? <IconTutor /> : <IconStudent />}
                {profile.role || '—'}
              </span>
              <div className="flex flex-wrap gap-1.5 justify-center">
              {profile.is_approved && !profile.is_banned && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-tutor-teal/15 text-tutor-teal">
                  {t('status_approved')}
                </span>
              )}
              {profile.is_banned && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-student-coral/15 text-student-coral">
                  {t('status_banned')}
                </span>
              )}
              {profile.is_rejected && !profile.is_banned && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-student-coral/15 text-student-coral">
                  {t('status_rejected')}
                </span>
              )}
              {!profile.is_approved && !profile.is_banned && !profile.is_rejected && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-tutor-gold/15 text-tutor-gold">
                  {t('status_pending')}
                </span>
              )}
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-2">
            {tabs.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-0.5 ${
                  tab === key
                    ? 'text-white'
                    : 'text-neutral-slate hover:text-neutral-carbon hover:bg-white/60'
                }`}
                style={tab === key ? { backgroundColor: accent } : {}}
              >
                <span className={tab === key ? 'text-white' : 'text-neutral-slate'}>{icon}</span>
                {label}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-neutral-outline/50 space-y-2">
            {!profile.is_banned && (
              <div className="flex gap-2">
                {profile.is_approved ? (
                  <button
                    disabled={actionLoading}
                    onClick={() => setRejectModalOpen(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm rounded-xl border border-student-coral/50 text-student-coral hover:bg-student-coral/10 transition-all duration-200 disabled:opacity-50"
                  >
                    {t('btn_reject')}
                  </button>
                ) : (
                  <>
                    <button
                      disabled={actionLoading}
                      onClick={async () => {
                        setActionLoading(true);
                        const res = await adminFetch(`/api/v1/admin/users/${userId}/approve`);
                        if (res?.success) { toast.success('User approved'); refreshData(); } else { toast.error(res?.error?.message || 'Failed'); }
                        setActionLoading(false);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm rounded-xl border border-tutor-teal/50 text-tutor-teal hover:bg-tutor-teal/10 transition-all duration-200 disabled:opacity-50"
                    >
                      {t('btn_approve')}
                    </button>
                    {!profile.is_rejected && (
                      <button
                        disabled={actionLoading}
                        onClick={() => setRejectModalOpen(true)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm rounded-xl border border-student-coral/50 text-student-coral hover:bg-student-coral/10 transition-all duration-200 disabled:opacity-50"
                      >
                        {t('btn_reject')}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
            <button
              disabled={actionLoading}
              onClick={async () => {
                if (!confirm(t('reset_onboarding_confirm'))) return;
                setActionLoading(true);
                const res = await adminFetch(`/api/v1/admin/users/${userId}/reset-onboarding`);
                if (res?.success) { toast.success('Onboarding reset'); refreshData(); } else { toast.error(res?.error?.message || 'Failed'); }
                setActionLoading(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm rounded-xl border border-tutor-gold/50 text-tutor-gold hover:bg-tutor-gold/10 transition-all duration-200 disabled:opacity-50"
            >
              {t('btn_reset_onboarding')}
            </button>
            {onCreateSupportTicket && (
              <button
                onClick={() => { onCreateSupportTicket(userId); onClose(); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm rounded-xl border border-primary/50 text-primary hover:bg-primary/10 transition-all duration-200"
              >
                <IconChat />
                {t('btn_open_ticket')}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-neutral-slate hover:text-neutral-carbon hover:bg-neutral-mist/50 rounded-xl transition-all duration-200"
            >
              <IconClose />
              Close
            </button>
          </div>
        </div>

        {/* Right: Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Quick stats strip */}
          <div className="shrink-0 grid grid-cols-4 gap-3 p-4 border-b border-neutral-outline bg-neutral-mist/20">
            <StatCard
              icon={<IconBook />}
              label="Lessons"
              value={lessons.length}
              color="#2563EB"
            />
            <StatCard
              icon={<IconCard />}
              label="Plan"
              value={subscription?.plan_slug || 'Free'}
              color={subscription?.is_active ? '#0D9488' : '#64748B'}
            />
            <StatCard
              icon={<IconBolt />}
              label="Boosters"
              value={boosters.filter((b) => b.is_active).length}
              color={boosters.some((b) => b.is_active) ? '#F59E0B' : '#64748B'}
            />
            <StatCard
              icon={<IconClock />}
              label="Member since"
              value={new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
              color="#64748B"
            />
          </div>

          <div className="flex-1 overflow-auto p-6">
            <AnimatePresence mode="wait">
              {tab === 'profile' && (
                <TabContent key="profile">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-display font-semibold text-neutral-carbon">Basic Info</h3>
                    <button
                      onClick={() => setEditProfileOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      <IconUser />
                      {t('edit_profile')}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Left: Identity & Contact — prominent block */}
                    <div
                      className="lg:col-span-2 rounded-2xl border border-neutral-outline/60 p-6 flex flex-col"
                      style={{ backgroundColor: 'white', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.06)' }}
                    >
                      <div className="flex items-center gap-2 mb-5">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accent}20` }}>
                          <span style={{ color: accent }}><IconUser /></span>
                        </div>
                        <h4 className="font-display font-semibold text-neutral-carbon">Identity & Contact</h4>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-5 flex-1">
                        <div>
                          <p className="text-xs font-medium text-neutral-slate mb-1">Role</p>
                          <p className="text-base font-semibold text-neutral-carbon capitalize">{profile.role || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-neutral-slate mb-1">Phone</p>
                          <p className="text-base font-mono font-medium text-neutral-carbon">{profile.phone_number}</p>
                        </div>
                        {!isTutor && (
                          <>
                            <div>
                              <p className="text-xs font-medium text-neutral-slate mb-1">School</p>
                              <p className="text-base font-medium text-neutral-carbon">{profile.school_name || '—'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-neutral-slate mb-1">Grade</p>
                              <p className="text-base font-medium text-neutral-carbon">{getLocalizedName(profile.student_grade_name, loc)}</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    {/* Right: Status block */}
                    <div
                      className="rounded-2xl border border-neutral-outline/60 p-6 flex flex-col"
                      style={{ backgroundColor: 'white', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.06)' }}
                    >
                      <div className="flex items-center gap-2 mb-5">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accent}20` }}>
                          <span style={{ color: accent }}><IconCheck /></span>
                        </div>
                        <h4 className="font-display font-semibold text-neutral-carbon">Status</h4>
                      </div>
                      <div className="space-y-5 flex-1">
                        <div>
                          <p className="text-xs font-medium text-neutral-slate mb-1">Onboarding</p>
                          <p className={`text-base font-semibold ${profile.onboarding_completed ? 'text-tutor-teal' : 'text-neutral-slate'}`}>
                            {profile.onboarding_completed ? t('yes') : t('no')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-neutral-slate mb-1">{t('profile_created')}</p>
                          <p className="text-base font-medium text-neutral-carbon">{new Date(profile.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                    {/* Full-width: Location — hero card */}
                    <div
                      className="lg:col-span-3 rounded-2xl border border-neutral-outline/60 p-6 flex items-center gap-5"
                      style={{
                        background: `linear-gradient(135deg, ${accentLight} 0%, rgba(241, 245, 249, 0.8) 100%)`,
                        borderColor: `${accent}30`,
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.08)',
                      }}
                    >
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${accent}25` }}>
                        <span style={{ color: accent }}><IconMapPin /></span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-neutral-slate uppercase tracking-wider mb-1">Location</p>
                        <p className="text-lg font-semibold text-neutral-carbon">
                          {(typeof onboarding_data?.location_path === 'string' ? onboarding_data.location_path : getLocalizedName(onboarding_data?.location_name, loc)) || '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                </TabContent>
              )}

              {tab === 'schools' && (
                <TabContent key="schools">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-display font-semibold text-neutral-carbon text-lg">Schools & Grades</h3>
                    {isTutor && (
                      <button
                        onClick={() => setEditSchoolsOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      >
                        <IconSchool />
                        {t('edit_schools')}
                      </button>
                    )}
                  </div>
                  <div>
                    {/* Grades by school type card */}
                    <div
                      className="rounded-2xl border border-neutral-outline p-5"
                      style={{ boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.06)' }}
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-9 h-9 rounded-xl bg-tutor-teal/10 flex items-center justify-center text-tutor-teal">
                          <IconBook />
                        </div>
                        <h4 className="font-display font-semibold text-neutral-carbon">Grades by school type</h4>
                      </div>
                      {grades.length === 0 ? (
                        <p className="text-sm text-neutral-slate italic">{t('no_grades')}</p>
                      ) : (
                        <div className="space-y-4">
                          {(() => {
                            const byType = grades.reduce<Record<string, typeof grades>>((acc, g) => {
                              const key = getLocalizedName(g.school_type_name, loc);
                              if (!acc[key]) acc[key] = [];
                              acc[key].push(g);
                              return acc;
                            }, {});
                            return Object.entries(byType)
                              .sort(([a], [b]) => a.localeCompare(b))
                              .map(([typeName, typeGrades]) => (
                              <div key={typeName} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                                <span className="text-sm font-medium text-neutral-slate sm:w-32 shrink-0">{typeName}</span>
                                <div className="flex flex-wrap gap-2">
                                  {typeGrades.map((g) => (
                                    <span
                                      key={g.id}
                                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-tutor-teal/10 text-tutor-teal border border-tutor-teal/20"
                                    >
                                      {getLocalizedName(g.name, loc)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                </TabContent>
              )}

              {tab === 'lessons' && (
                <TabContent key="lessons">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-display font-semibold text-neutral-carbon">{t('lesson_name')}</h3>
                    {isTutor && (
                      <button
                        onClick={() => setEditLessonsOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      >
                        <IconBook />
                        {t('edit_lessons')}
                      </button>
                    )}
                  </div>
                  {lessons.length === 0 ? (
                    <div
                      className="rounded-2xl border-2 border-dashed border-neutral-outline p-12 flex flex-col items-center justify-center"
                      style={{ backgroundColor: 'rgba(241, 245, 249, 0.5)' }}
                    >
                      <div className="w-16 h-16 rounded-2xl bg-neutral-mist flex items-center justify-center mb-4 text-neutral-slate">
                        <IconBook />
                      </div>
                      <p className="text-sm text-neutral-slate font-medium">{t('no_lesson_types')}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {/* Summary strip — compact */}
                      <div
                        className="lg:col-span-2 rounded-2xl border border-neutral-outline/60 px-6 py-4 flex items-center gap-4"
                        style={{
                          background: `linear-gradient(135deg, ${accentLight} 0%, rgba(241, 245, 249, 0.6) 100%)`,
                          borderColor: `${accent}25`,
                          boxShadow: '0 2px 8px rgba(37, 99, 235, 0.06)',
                        }}
                      >
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${accent}20` }}>
                          <span style={{ color: accent }}><IconBook /></span>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-neutral-slate uppercase tracking-wider">Lessons offered</p>
                          <p className="text-lg font-semibold text-neutral-carbon">{lessons.length} {lessons.length === 1 ? 'subject' : 'subjects'}</p>
                        </div>
                      </div>
                      {/* Lesson cards — price-tag style */}
                      {lessons.map((l, i) => (
                        <motion.div
                          key={l.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="group relative rounded-2xl overflow-hidden"
                          style={{
                            backgroundColor: 'white',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                            border: '1px solid rgba(226, 232, 240, 0.8)',
                          }}
                        >
                          <div className="flex items-stretch min-h-[100px]">
                            <div className="flex-1 p-5 flex flex-col justify-center">
                              <p className="text-base font-semibold text-neutral-carbon">{getLocalizedName(l.lesson_type_name, loc)}</p>
                              <p className="text-xs text-neutral-slate mt-0.5">per hour</p>
                            </div>
                            <div
                              className="w-24 flex flex-col items-center justify-center px-4 shrink-0"
                              style={{ backgroundColor: `${accent}12` }}
                            >
                              <span className="text-lg font-display font-bold" style={{ color: accent }}>{(l.price_per_hour_cents / 100).toFixed(0)}</span>
                              <span className="text-xs font-medium text-neutral-slate">{l.currency}</span>
                            </div>
                          </div>
                          <div
                            className="absolute left-0 top-0 bottom-0 w-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ backgroundColor: accent }}
                          />
                        </motion.div>
                      ))}
                    </div>
                  )}
                </TabContent>
              )}

              {tab === 'availability' && (
                <TabContent key="availability">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display font-semibold text-neutral-carbon">Weekly schedule</h3>
                    {isTutor && (
                      <button
                        onClick={() => setEditAvailabilityOpen(true)}
                        className="text-sm text-primary hover:underline"
                      >
                        {t('edit_availability')}
                      </button>
                    )}
                  </div>
                  {parsedSlots.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-neutral-slate">
                          Filled = available
                        </p>
                      </div>
                      <div
                        className="rounded-2xl border border-neutral-outline overflow-hidden"
                        style={{ boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.06)' }}
                      >
                        <div className="grid grid-cols-[56px_1fr] bg-neutral-mist/40">
                          <div className="p-2 text-xs font-medium text-neutral-slate" />
                          <div className="grid grid-cols-7 gap-px bg-neutral-outline">
                            {DAY_LABELS.map((label) => (
                              <div key={label} className="bg-neutral-mist/40 py-2 text-center text-xs font-semibold text-neutral-carbon">
                                {label}
                              </div>
                            ))}
                          </div>
                        </div>
                        {HOURS.map((hour) => (
                          <div
                            key={hour}
                            className="grid grid-cols-[56px_1fr] border-t border-neutral-outline/60 hover:bg-neutral-mist/20 transition-colors"
                          >
                            <div className="py-1.5 px-2 text-xs font-medium text-neutral-slate border-r border-neutral-outline/60">
                              {formatHour(hour)}
                            </div>
                            <div className="grid grid-cols-7 gap-px bg-neutral-outline/30">
                              {DAY_ORDER.map((dayNum) => {
                                const filled = isSlotAvailable(parsedSlots, dayNum, hour);
                                return (
                                  <div
                                    key={`${hour}-${dayNum}`}
                                    className="min-h-[28px] flex items-center justify-center"
                                    style={{
                                      backgroundColor: filled ? accentLight : 'transparent',
                                      borderLeft: filled ? `3px solid ${accent}` : undefined,
                                    }}
                                    title={filled ? `${DAY_LABELS[DAY_ORDER.indexOf(dayNum)]} ${formatHour(hour)}–${formatHour(hour + 1)} available` : undefined}
                                  >
                                    {filled && (
                                      <span
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: accent }}
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                        <div className="bg-neutral-mist/30 px-4 py-2 border-t border-neutral-outline flex items-center justify-between text-xs text-neutral-slate">
                          <span>Shown: {formatHour(HOURS[0])} – {formatHour(HOURS[HOURS.length - 1] + 1)}</span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accent }} />
                            Available
                          </span>
                        </div>
                      </div>
                      <details className="group">
                        <summary className="text-xs text-neutral-slate cursor-pointer hover:text-neutral-carbon">
                          View raw data
                        </summary>
                        <pre className="mt-2 text-xs bg-neutral-mist/50 p-4 rounded-xl overflow-auto font-mono text-neutral-slate max-h-40">
                          {JSON.stringify(availability, null, 2)}
                        </pre>
                      </details>
                    </div>
                  ) : (
                    <EmptyState icon={<IconCalendar />} text={t('no_availability')} />
                  )}
                </TabContent>
              )}

              {tab === 'subscription' && (
                <TabContent key="subscription">
                  {subscription ? (
                    <div
                      className="rounded-2xl border border-neutral-outline p-6"
                      style={{ boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.08)' }}
                    >
                      <div className="flex items-center gap-4 mb-6">
                        <div
                          className="w-14 h-14 rounded-2xl flex items-center justify-center"
                          style={{ backgroundColor: subscription.is_active ? 'rgba(13, 148, 136, 0.15)' : 'rgba(100, 116, 139, 0.15)' }}
                        >
                          <IconCard />
                        </div>
                        <div>
                          <h3 className="font-display font-bold text-lg text-neutral-carbon">{subscription.plan_slug}</h3>
                          <p className="text-sm text-neutral-slate">{getLocalizedName(subscription.plan_name, loc)}</p>
                          <span
                            className={`inline-block mt-2 px-2.5 py-0.5 rounded-lg text-xs font-medium ${
                              subscription.is_active ? 'bg-tutor-teal/15 text-tutor-teal' : 'bg-neutral-mist text-neutral-slate'
                            }`}
                          >
                            {subscription.is_active ? t('yes') : t('no')} — Active
                          </span>
                        </div>
                      </div>
                      <dl className="grid grid-cols-2 gap-3 text-sm">
                        <div><dt className="text-neutral-slate">Start</dt><dd className="font-medium">{new Date(subscription.start_date).toLocaleDateString()}</dd></div>
                        <div><dt className="text-neutral-slate">End</dt><dd className="font-medium">{subscription.end_date ? new Date(subscription.end_date).toLocaleDateString() : '—'}</dd></div>
                      </dl>
                    </div>
                  ) : (
                    <EmptyState icon={<IconCard />} text={t('no_subscriptions')} />
                  )}
                </TabContent>
              )}

              {tab === 'boosters' && (
                <TabContent key="boosters">
                  {boosters.length > 0 ? (
                    <div className="space-y-3">
                      {boosters.map((b) => (
                        <div
                          key={b.id}
                          className="flex items-center justify-between py-4 px-5 rounded-2xl border border-neutral-outline hover:border-primary/30 transition-colors"
                          style={{ boxShadow: '0 2px 4px rgba(37, 99, 235, 0.04)' }}
                        >
                          <span className="font-medium">{getLocalizedName(b.display_name, loc)}</span>
                          <div className="flex items-center gap-3">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${b.is_active ? 'bg-tutor-teal/15 text-tutor-teal' : 'bg-neutral-mist text-neutral-slate'}`}>
                              {b.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <span className="text-xs text-neutral-slate">expires {new Date(b.expires_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState icon={<IconBolt />} text={t('no_boosters')} />
                  )}
                </TabContent>
              )}

              {tab === 'transactions' && (
                <TabContent key="transactions">
                  {transactions.length > 0 ? (
                    <div className="space-y-2">
                      {transactions.map((tx, i) => (
                        <motion.div
                          key={tx.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="flex items-center justify-between py-4 px-5 rounded-2xl border border-neutral-outline bg-white hover:border-primary/20 transition-colors"
                          style={{ boxShadow: '0 2px 4px rgba(37, 99, 235, 0.04)' }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-neutral-mist flex items-center justify-center">
                              <IconReceipt />
                            </div>
                            <div>
                              <p className="font-medium text-neutral-carbon">{tx.type}</p>
                              <p className="text-xs text-neutral-slate">{new Date(tx.created_at).toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-display font-semibold text-neutral-carbon">{(tx.amount_cents / 100).toFixed(2)} {tx.currency}</p>
                            <p className={`text-xs font-medium ${tx.status === 'completed' ? 'text-tutor-teal' : 'text-neutral-slate'}`}>{tx.status}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState icon={<IconReceipt />} text={t('no_transactions')} />
                  )}
                </TabContent>
              )}

              {tab === 'legal' && (
                <TabContent key="legal">
                  {legal_docs.length > 0 ? (
                    <div className="space-y-3">
                      {legal_docs.map((d, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-4 py-4 px-5 rounded-2xl border border-neutral-outline bg-white"
                          style={{ boxShadow: '0 2px 4px rgba(37, 99, 235, 0.04)' }}
                        >
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <IconDoc />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-neutral-carbon">{d.type} — {d.title}</p>
                            <p className="text-xs text-neutral-slate mt-0.5">
                              {new Date(d.accepted_at).toLocaleString()} · IP: {d.ip_address}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState icon={<IconDoc />} text="No legal docs accepted" />
                  )}
                </TabContent>
              )}
            </AnimatePresence>
          </div>
        </div>

      </motion.div>

      {/* Avatar lightbox - click profile image to enlarge */}
      <AnimatePresence>
        {avatarLightboxOpen && (profile.avatar_path ?? profile.avatar_url) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-8 cursor-pointer"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(12px)' }}
            onClick={() => setAvatarLightboxOpen(false)}
          >
            <motion.img
              src={getAvatarUrl(profile.avatar_path, profile.avatar_url) ?? ''}
              alt="Profile"
              className="max-w-full max-h-full object-contain rounded-2xl cursor-default"
              style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject modal - reason required, creates support ticket */}
      {rejectModalOpen && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)' }}
          onClick={() => setRejectModalOpen(false)}
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
                onClick={() => { setRejectModalOpen(false); setRejectReason(''); }}
                className="px-4 py-2.5 rounded-xl border border-neutral-outline text-neutral-slate hover:bg-neutral-mist/50"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                disabled={actionLoading || !rejectReason.trim()}
                onClick={async () => {
                  setActionLoading(true);
                  const res = await adminFetch(`/api/v1/admin/users/${userId}/reject`, 'POST', { reason: rejectReason.trim() });
                  if (res?.success) {
                    toast.success('User rejected');
                    setRejectModalOpen(false);
                    setRejectReason('');
                    refreshData();
                  } else {
                    toast.error(res?.error?.message || 'Failed');
                  }
                  setActionLoading(false);
                }}
                className="px-4 py-2.5 rounded-xl bg-student-coral text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? t('loading', { defaultValue: 'Loading...' }) : t('reject_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modals - rendered outside motion.div to avoid overflow clipping, fixed positioning */}
      {editProfileOpen && (
        <EditProfileModal
          profile={profile}
          onboardingData={onboarding_data}
          locale={loc}
          API_URL={API_URL}
          onClose={() => setEditProfileOpen(false)}
          onSave={async (payload) => {
            try {
              const res = await adminFetch(`/api/v1/admin/users/${userId}/profile`, 'PUT', payload);
              if (res?.success) { toast.success('Profile updated'); refreshData(); setEditProfileOpen(false); return res; }
              toast.error(res?.error?.message || 'Save failed');
              return res;
            } catch (e) {
              toast.error(e instanceof Error ? e.message : 'Request failed');
              return null;
            }
          }}
          getLocalizedName={getLocalizedName}
          t={t}
        />
      )}
      {editAvailabilityOpen && isTutor && (
        <EditAvailabilityModal
          slots={availability}
          onClose={() => setEditAvailabilityOpen(false)}
          onSave={async (slots) => {
            try {
              const res = await adminFetch(`/api/v1/admin/users/${userId}/availability`, 'PUT', { slots });
              if (res?.success) { toast.success('Availability updated'); refreshData(); setEditAvailabilityOpen(false); return res; }
              toast.error(res?.error?.message || 'Save failed');
              return res;
            } catch (e) {
              toast.error(e instanceof Error ? e.message : 'Request failed');
              return null;
            }
          }}
          t={t}
        />
      )}
      {editSchoolsOpen && isTutor && (
        <EditSchoolsModal
          schools={schools}
          grades={grades}
          onClose={() => setEditSchoolsOpen(false)}
          onSave={async (payload) => {
            try {
              const res = await adminFetch(`/api/v1/admin/users/${userId}/schools`, 'PUT', payload);
              if (res?.success) { toast.success('Schools & grades updated'); refreshData(); setEditSchoolsOpen(false); return res; }
              toast.error(res?.error?.message || 'Save failed');
              return res;
            } catch (e) {
              toast.error(e instanceof Error ? e.message : 'Request failed');
              return null;
            }
          }}
          getLocalizedName={getLocalizedName}
          locale={loc}
          API_URL={API_URL}
          t={t}
        />
      )}
      {editLessonsOpen && isTutor && (
        <EditLessonsModal
          lessons={lessons}
          onClose={() => setEditLessonsOpen(false)}
          onSave={async (lessons) => {
            try {
              const res = await adminFetch(`/api/v1/admin/users/${userId}/lessons`, 'PUT', { lessons });
              if (res?.success) { toast.success('Lessons updated'); refreshData(); setEditLessonsOpen(false); return res; }
              toast.error(res?.error?.message || 'Save failed');
              return res;
            } catch (e) {
              toast.error(e instanceof Error ? e.message : 'Request failed');
              return null;
            }
          }}
          getLocalizedName={getLocalizedName}
          locale={loc}
          API_URL={API_URL}
          t={t}
        />
      )}
    </div>
  );
}

function IconUser() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}
function IconTutor() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
    </svg>
  );
}
function IconStudent() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}
function IconSchool() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}
function IconBook() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}
function IconCard() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}
function IconBolt() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}
function IconReceipt() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function IconDoc() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
function IconChat() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}
function IconClose() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
function IconPhone() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}
function IconMapPin() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

/* Edit Modals */
function EditProfileModal({
  profile,
  onboardingData,
  locale,
  API_URL,
  onClose,
  onSave,
  getLocalizedName,
  t,
}: {
  profile: ProfileData['profile'];
  onboardingData: Record<string, unknown>;
  locale: string;
  API_URL: string;
  onClose: () => void;
  onSave: (p: Record<string, unknown>) => Promise<unknown>;
  getLocalizedName: (o: unknown, l?: string) => string;
  t: (k: string) => string;
}) {
  const [fullName, setFullName] = useState(profile.full_name ?? '');
  const [role, setRole] = useState(profile.role ?? '');
  const [schoolName, setSchoolName] = useState(profile.school_name ?? '');
  const [gradeId, setGradeId] = useState<string>((profile as { grade_id?: string }).grade_id ?? '');
  const [onboardingCompleted, setOnboardingCompleted] = useState(profile.onboarding_completed);
  const [locationId, setLocationId] = useState<string>((onboardingData?.location_id as string) ?? '');
  const [grades, setGrades] = useState<{ id: string; name: unknown; school_type_id?: string }[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: unknown; type: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/onboarding/data`)
      .then((r) => r.json())
      .then((res) => {
        const d = res?.data ?? res;
        if (d?.grades) setGrades(d.grades);
        if (d?.locations) setLocations(d.locations);
      });
  }, [API_URL]);

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        full_name: fullName.trim() || null,
        role: role === 'tutor' || role === 'student' ? role : undefined,
        onboarding_completed: onboardingCompleted,
      };
      if (profile.role === 'student') {
        payload.school_name = schoolName.trim() || null;
        payload.grade_id = gradeId || null;
      }
      if (locationId) payload.location_id = locationId;
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/50" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display font-bold text-lg mb-4">{t('edit_profile')}</h3>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-slate mb-1">Name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-neutral-outline" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-slate mb-1">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-neutral-outline">
              <option value="">—</option>
              <option value="tutor">Tutor</option>
              <option value="student">Student</option>
            </select>
          </div>
          {profile.role === 'student' && (
            <>
              <div>
                <label className="block text-sm font-medium text-neutral-slate mb-1">School name</label>
                <input type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-neutral-outline" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-slate mb-1">Grade</label>
                <select value={gradeId} onChange={(e) => setGradeId(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-neutral-outline">
                  <option value="">—</option>
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>{getLocalizedName(g.name, locale)}</option>
                  ))}
                </select>
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-neutral-slate mb-1">Location</label>
            <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-neutral-outline">
              <option value="">—</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>{getLocalizedName(loc.name, locale)} ({loc.type})</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={onboardingCompleted} onChange={(e) => setOnboardingCompleted(e.target.checked)} />
            <span className="text-sm">Onboarding completed</span>
          </label>
          </div>
          <div className="flex gap-2 mt-6">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-neutral-outline text-neutral-slate hover:bg-neutral-mist/50">{t('cancel')}</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl btn-primary disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditAvailabilityModal({
  slots,
  onClose,
  onSave,
  t,
}: {
  slots: unknown;
  onClose: () => void;
  onSave: (slots: { day: number; start: string; end: string }[]) => Promise<unknown>;
  t: (k: string) => string;
}) {
  const parsed = parseSlots(slots);
  const [grid, setGrid] = useState<Record<string, boolean>>(() => {
    const g: Record<string, boolean> = {};
    for (const day of DAY_ORDER) {
      for (const hour of HOURS) {
        g[`${day}-${hour}`] = parsed.some((s) => s.day === day && s.startMin < (hour + 1) * 60 && s.endMin > hour * 60);
      }
    }
    return g;
  });
  const [saving, setSaving] = useState(false);

  const toggle = (day: number, hour: number) => {
    const key = `${day}-${hour}`;
    setGrid((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const gridToSlots = (): { day: number; start: string; end: string }[] => {
    const result: { day: number; start: string; end: string }[] = [];
    for (const day of DAY_ORDER) {
      let runStart: number | null = null;
      for (const hour of [...HOURS, 23]) {
        const filled = hour < 23 && grid[`${day}-${hour}`];
        if (filled && runStart === null) runStart = hour;
        if ((!filled || hour === 23) && runStart !== null) {
          result.push({
            day,
            start: `${String(runStart).padStart(2, '0')}:00`,
            end: `${String(runStart === hour - 1 ? hour : hour).padStart(2, '0')}:00`,
          });
          runStart = null;
        }
      }
    }
    return result.filter((s) => s.start !== s.end);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const out = gridToSlots();
      await onSave(out);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/50" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display font-bold text-lg mb-4">{t('edit_availability')}</h3>
        <p className="text-sm text-neutral-slate mb-4">Click cells to toggle availability</p>
        <div className="grid grid-cols-[56px_1fr] border border-neutral-outline rounded-xl overflow-hidden">
          <div className="p-2" />
          <div className="grid grid-cols-7 gap-px bg-neutral-outline">
            {DAY_LABELS.map((l) => (
              <div key={l} className="bg-neutral-mist/40 py-2 text-center text-xs font-semibold">{l}</div>
            ))}
          </div>
          {HOURS.map((hour) => (
            <React.Fragment key={hour}>
              <div className="py-1.5 px-2 text-xs border-t border-r border-neutral-outline">{formatHour(hour)}</div>
              <div className="grid grid-cols-7 gap-px bg-neutral-outline/30 border-t border-neutral-outline">
                {DAY_ORDER.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggle(day, hour)}
                    className={`min-h-[28px] ${grid[`${day}-${hour}`] ? 'bg-primary/20' : 'bg-white'}`}
                  />
                ))}
              </div>
            </React.Fragment>
          ))}
        </div>
        <div className="flex gap-2 mt-6">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-neutral-outline text-neutral-slate hover:bg-neutral-mist/50">{t('cancel')}</button>
          <button type="button" onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl btn-primary disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditSchoolsModal({
  schools,
  grades,
  onClose,
  onSave,
  getLocalizedName,
  locale,
  API_URL,
  t,
}: {
  schools: { id: string; school_name: string }[];
  grades: { id: string; name: unknown; school_type_name: unknown }[];
  onClose: () => void;
  onSave: (p: { schools?: string[]; grade_ids?: string[] }) => Promise<unknown>;
  getLocalizedName: (o: unknown, l?: string) => string;
  locale: string;
  API_URL: string;
  t: (k: string) => string;
}) {
  const [selectedSchoolTypeIds, setSelectedSchoolTypeIds] = useState<string[]>(() => {
    const stIds = [...new Set(grades.map((g) => (g as { school_type_id?: string }).school_type_id).filter(Boolean))];
    return stIds as string[];
  });
  const [selectedGradeIds, setSelectedGradeIds] = useState<string[]>(() => grades.map((g) => g.id));
  const [schoolTypes, setSchoolTypes] = useState<{ id: string; name: unknown }[]>([]);
  const [gradeOptions, setGradeOptions] = useState<{ id: string; school_type_id: string; name: unknown }[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/onboarding/data`)
      .then((r) => r.json())
      .then((res) => {
        const d = res?.data ?? res;
        if (d?.school_types) setSchoolTypes(d.school_types);
        if (d?.grades) setGradeOptions(d.grades);
      });
  }, [API_URL]);

  const toggleGrade = (id: string) => {
    setSelectedGradeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSave = async () => {
    const missingGrade = selectedSchoolTypeIds.find((stId) => {
      const gradesForType = gradeOptions.filter((g) => g.school_type_id === stId);
      const selectedForType = selectedGradeIds.filter((gid) => gradeOptions.find((g) => g.id === gid)?.school_type_id === stId);
      return gradesForType.length > 0 && selectedForType.length === 0;
    });
    if (missingGrade) {
      setSaveError('Select at least one grade for each selected school type.');
      return;
    }
    setSaveError(null);
    setSaving(true);
    try {
      await onSave({
        grade_ids: selectedGradeIds,
      });
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/50" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display font-bold text-lg mb-4">{t('edit_schools')}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-slate mb-2">School types</label>
            <p className="text-xs text-neutral-slate mb-2">Select school types, then at least one grade per type</p>
            {saveError && <p className="text-sm text-red-600 mb-2">{saveError}</p>}
            <div className="flex flex-wrap gap-2 mb-4">
              {schoolTypes.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setSelectedSchoolTypeIds((prev) => (prev.includes(st.id) ? prev.filter((x) => x !== st.id) : [...prev, st.id]))}
                  className={`px-4 py-2 rounded-xl border text-sm ${selectedSchoolTypeIds.includes(st.id) ? 'border-primary bg-primary/10 text-primary' : 'border-neutral-outline'}`}
                >
                  {getLocalizedName(st.name, locale)}
                </button>
              ))}
            </div>
            {selectedSchoolTypeIds.length > 0 && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-neutral-slate">Grades (select at least one per school type)</label>
                {selectedSchoolTypeIds.map((stId) => {
                  const st = schoolTypes.find((s) => s.id === stId);
                  const gradesForType = gradeOptions.filter((g) => g.school_type_id === stId);
                  const selectedForType = selectedGradeIds.filter((gid) => gradeOptions.find((g) => g.id === gid)?.school_type_id === stId);
                  return (
                    <div key={stId} className="border border-neutral-outline rounded-xl p-3">
                      <p className="text-sm font-medium text-neutral-carbon mb-2">{getLocalizedName(st?.name, locale)}</p>
                      <div className="flex flex-wrap gap-2">
                        {gradesForType.map((g) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => toggleGrade(g.id)}
                            className={`px-3 py-1.5 rounded-lg border text-sm ${selectedGradeIds.includes(g.id) ? 'border-primary bg-primary/10 text-primary' : 'border-neutral-outline'}`}
                          >
                            {getLocalizedName(g.name, locale)}
                          </button>
                        ))}
                        {gradesForType.length === 0 && <span className="text-xs text-neutral-slate">No grades</span>}
                      </div>
                      {gradesForType.length > 0 && selectedForType.length === 0 && (
                        <p className="text-xs text-red-600 mt-1">Select at least one</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-neutral-outline text-neutral-slate hover:bg-neutral-mist/50">{t('cancel')}</button>
          <button type="button" onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl btn-primary disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditLessonsModal({
  lessons,
  onClose,
  onSave,
  getLocalizedName,
  locale,
  API_URL,
  t,
}: {
  lessons: { id: string; lesson_type_name: unknown; price_per_hour_cents: number; currency: string }[];
  onClose: () => void;
  onSave: (lessons: { lesson_type_id: string; price_per_hour_cents: number; currency: string }[]) => Promise<unknown>;
  getLocalizedName: (o: unknown, l?: string) => string;
  locale: string;
  API_URL: string;
  t: (k: string) => string;
}) {
  const [lessonTypes, setLessonTypes] = useState<{ id: string; name: unknown }[]>([]);
  const [items, setItems] = useState<{ lesson_type_id: string; price_per_hour_cents: number; currency: string }[]>(() =>
    lessons.map((l) => ({
      lesson_type_id: l.lesson_type_id ?? '',
      price_per_hour_cents: l.price_per_hour_cents,
      currency: l.currency || 'TRY',
    }))
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/onboarding/data`)
      .then((r) => r.json())
      .then((res) => {
        const d = res?.data ?? res;
        if (d?.lesson_types) setLessonTypes(d.lesson_types);
      });
  }, [API_URL]);

  const addLesson = () => setItems((prev) => [...prev, { lesson_type_id: '', price_per_hour_cents: 0, currency: 'TRY' }]);
  const removeLesson = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const updateLesson = (i: number, f: Partial<{ lesson_type_id: string; price_per_hour_cents: number; currency: string }>) => {
    setItems((prev) => { const n = [...prev]; n[i] = { ...n[i], ...f }; return n; });
  };

  const handleSave = async () => {
    const valid = items.filter((x) => x.lesson_type_id && x.price_per_hour_cents > 0);
    if (valid.length === 0) return;
    const deduped = valid.reduce((acc, x) => {
      const existing = acc.find((a) => a.lesson_type_id === x.lesson_type_id);
      if (!existing) acc.push(x);
      else { existing.price_per_hour_cents = x.price_per_hour_cents; existing.currency = x.currency; }
      return acc;
    }, [] as typeof valid);
    setSaving(true);
    try {
      await onSave(deduped);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/50" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display font-bold text-lg mb-4">{t('edit_lessons')}</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-neutral-slate">Lessons</label>
            <button type="button" onClick={addLesson} className="text-sm text-primary hover:underline">+ Add</button>
          </div>
          {items.map((item, i) => (
            <div key={i} className="flex gap-2 items-center">
              <select
                value={item.lesson_type_id}
                onChange={(e) => updateLesson(i, { lesson_type_id: e.target.value })}
                className="flex-1 px-4 py-2 rounded-xl border border-neutral-outline"
              >
                <option value="">Select type</option>
                {lessonTypes.map((lt) => (
                  <option key={lt.id} value={lt.id}>{getLocalizedName(lt.name, locale)}</option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                value={item.price_per_hour_cents ? item.price_per_hour_cents / 100 : ''}
                onChange={(e) => updateLesson(i, { price_per_hour_cents: Math.round(parseFloat(e.target.value || '0') * 100) })}
                placeholder="Price"
                className="w-24 px-4 py-2 rounded-xl border border-neutral-outline"
              />
              <span className="text-sm">TRY</span>
              <button type="button" onClick={() => removeLesson(i)} className="px-3 py-2 text-neutral-slate hover:text-red-600">×</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-6">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-neutral-outline text-neutral-slate hover:bg-neutral-mist/50">{t('cancel')}</button>
          <button type="button" onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl btn-primary disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div
      className="rounded-2xl p-4 border border-neutral-outline/50"
      style={{ backgroundColor: 'white', boxShadow: '0 2px 4px rgba(37, 99, 235, 0.04)' }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span style={{ color }}>{icon}</span>
        <span className="text-xs font-medium text-neutral-slate">{label}</span>
      </div>
      <p className="font-display font-bold text-lg" style={{ color: color === '#64748B' ? undefined : color }}>
        {value}
      </p>
    </div>
  );
}

function TabContent({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

function Section({ title, children, empty, emptyText }: { title: string; children: React.ReactNode; empty: boolean; emptyText: string }) {
  return (
    <div>
      <h3 className="font-display font-semibold text-neutral-carbon mb-3">{title}</h3>
      {empty ? <p className="text-sm text-neutral-slate italic">{emptyText}</p> : children}
    </div>
  );
}

function InfoCard({ title, icon, items }: { title: string; icon: React.ReactNode; items: [string, string][] }) {
  return (
    <div
      className="rounded-2xl border border-neutral-outline p-5"
      style={{ boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.08)' }}
    >
      <h3 className="font-display font-semibold text-neutral-carbon mb-4 flex items-center gap-2">
        <span className="text-neutral-slate">{icon}</span>
        {title}
      </h3>
      <dl className="space-y-3 text-sm">
        {items.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-neutral-slate shrink-0">{label}</dt>
            <dd className="font-medium text-neutral-carbon text-right truncate">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 rounded-2xl border-2 border-dashed border-neutral-outline bg-neutral-mist/30">
      <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mb-4 text-neutral-slate shadow-sm">
        {icon}
      </div>
      <p className="text-sm text-neutral-slate font-medium">{text}</p>
    </div>
  );
}
