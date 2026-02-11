'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  CONTENT_LOCALES,
  emptyLocalized,
  localizedFromEntity,
  getLocalizedValue,
} from '@/lib/content-locales';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type Plan = {
  id: string;
  slug: string;
  display_name: Record<string, string>;
  monthly_price_cents: number;
  yearly_price_cents: number;
  is_active: boolean;
  sort_order: number;
};

export default function AdminPlansPage() {
  const t = useTranslations('admin_panel');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'closed' | 'create' | 'edit'>('closed');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    slug: '',
    displayNameByLocale: emptyLocalized(),
    monthly_price_cents: 0,
    yearly_price_cents: 0,
    is_active: true,
    sort_order: 0,
  });

  function load() {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    fetch(`${API_URL}/api/v1/admin/subscription-plans`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.data?.plans) setPlans(data.data.plans);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setLoading(true);
    load();
  }, []);

  function openCreate() {
    setForm({
      slug: '',
      displayNameByLocale: emptyLocalized(),
      monthly_price_cents: 0,
      yearly_price_cents: 0,
      is_active: true,
      sort_order: plans.length,
    });
    setEditingId(null);
    setModal('create');
  }

  function openEdit(p: Plan) {
    setEditingId(p.id);
    setForm({
      slug: p.slug,
      displayNameByLocale: localizedFromEntity(p.display_name),
      monthly_price_cents: p.monthly_price_cents ?? 0,
      yearly_price_cents: p.yearly_price_cents ?? 0,
      is_active: p.is_active ?? true,
      sort_order: p.sort_order ?? 0,
    });
    setModal('edit');
  }

  function setDisplayName(locale: string, value: string) {
    setForm((f) => ({
      ...f,
      displayNameByLocale: { ...f.displayNameByLocale, [locale]: value },
    }));
  }

  function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    const body = {
      slug: form.slug.trim(),
      display_name: form.displayNameByLocale,
      description: {},
      monthly_price_cents: form.monthly_price_cents,
      yearly_price_cents: form.yearly_price_cents,
      is_active: form.is_active,
      sort_order: form.sort_order,
    };
    fetch(`${API_URL}/api/v1/admin/subscription-plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
      .then((r) => r.json())
      .then(() => {
        setModal('closed');
        load();
      });
  }

  function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    const body = {
      slug: form.slug.trim(),
      display_name: form.displayNameByLocale,
      monthly_price_cents: form.monthly_price_cents,
      yearly_price_cents: form.yearly_price_cents,
      is_active: form.is_active,
      sort_order: form.sort_order,
    };
    fetch(`${API_URL}/api/v1/admin/subscription-plans/${editingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
      .then((r) => r.json())
      .then(() => {
        setModal('closed');
        setEditingId(null);
        load();
      });
  }

  if (loading && plans.length === 0) {
    return <p className="text-neutral-slate">{t('loading')}</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-bold text-2xl text-neutral-carbon">
          {t('plans_title')}
        </h1>
        <button type="button" onClick={openCreate} className="btn-primary">
          {t('btn_add_plan')}
        </button>
      </div>
      <div className="bg-neutral-white rounded-card border border-neutral-outline shadow-card overflow-hidden">
        {plans.length === 0 ? (
          <p className="p-8 text-neutral-slate">{t('no_plans')}</p>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-neutral-mist border-b border-neutral-outline">
              <tr>
                <th className="px-4 py-3 text-sm font-medium text-neutral-carbon">{t('plan_slug')}</th>
                {CONTENT_LOCALES.map((loc) => (
                  <th key={loc} className="px-4 py-3 text-sm font-medium text-neutral-carbon">
                    {t('display_name_with_locale', { locale: loc.toUpperCase() })}
                  </th>
                ))}
                <th className="px-4 py-3 text-sm font-medium text-neutral-carbon">{t('plan_monthly_cents')}</th>
                <th className="px-4 py-3 text-sm font-medium text-neutral-carbon">{t('plan_yearly_cents')}</th>
                <th className="px-4 py-3 text-sm font-medium text-neutral-carbon">{t('plan_active')}</th>
                <th className="px-4 py-3 text-sm font-medium text-neutral-carbon">{t('col_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id} className="border-b border-neutral-outline last:border-0">
                  <td className="px-4 py-3 text-sm">{p.slug}</td>
                  {CONTENT_LOCALES.map((loc) => (
                    <td key={loc} className="px-4 py-3 text-sm">
                      {getLocalizedValue(p.display_name, loc)}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-sm">{p.monthly_price_cents}</td>
                  <td className="px-4 py-3 text-sm">{p.yearly_price_cents}</td>
                  <td className="px-4 py-3 text-sm">{p.is_active ? t('yes') : t('no')}</td>
                  <td className="px-4 py-3 text-sm">
                    <button type="button" onClick={() => openEdit(p)} className="text-primary hover:underline">
                      {t('btn_edit')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal !== 'closed' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setModal('closed')}>
          <div
            className="bg-neutral-white rounded-card border border-neutral-outline shadow-card p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display font-semibold text-lg text-neutral-carbon mb-4">
              {modal === 'create' ? t('create_plan') : t('edit_plan')}
            </h2>
            <form onSubmit={modal === 'create' ? submitCreate : submitEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-carbon mb-1">{t('plan_slug')}</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  className="w-full rounded-button border border-neutral-outline px-4 py-2"
                  required
                />
              </div>
              {CONTENT_LOCALES.map((loc) => (
                <div key={loc}>
                  <label className="block text-sm font-medium text-neutral-carbon mb-1">
                    {t('display_name_with_locale', { locale: loc.toUpperCase() })}
                  </label>
                  <input
                    type="text"
                    value={form.displayNameByLocale[loc] ?? ''}
                    onChange={(e) => setDisplayName(loc, e.target.value)}
                    className="w-full rounded-button border border-neutral-outline px-4 py-2"
                    required
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-carbon mb-1">{t('plan_monthly_cents')}</label>
                  <input
                    type="number"
                    min={0}
                    value={form.monthly_price_cents}
                    onChange={(e) => setForm((f) => ({ ...f, monthly_price_cents: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full rounded-button border border-neutral-outline px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-carbon mb-1">{t('plan_yearly_cents')}</label>
                  <input
                    type="number"
                    min={0}
                    value={form.yearly_price_cents}
                    onChange={(e) => setForm((f) => ({ ...f, yearly_price_cents: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full rounded-button border border-neutral-outline px-4 py-2"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="plan_active"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="rounded border-neutral-outline"
                />
                <label htmlFor="plan_active" className="text-sm text-neutral-carbon">{t('plan_active')}</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-carbon mb-1">{t('plan_sort_order')}</label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value, 10) || 0 }))}
                  className="w-full rounded-button border border-neutral-outline px-4 py-2"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary">{t('save')}</button>
                <button type="button" onClick={() => setModal('closed')} className="btn-secondary">{t('cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
