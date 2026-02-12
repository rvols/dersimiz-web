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

type Booster = {
  id: string;
  slug: string;
  display_name: Record<string, string>;
  price_cents: number;
  duration_days: number;
  search_ranking_boost: number;
  is_active: boolean;
  sort_order: number;
};

export default function AdminBoostersPage() {
  const t = useTranslations('admin_panel');
  const [boosters, setBoosters] = useState<Booster[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'closed' | 'edit'>('closed');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    slug: '',
    displayNameByLocale: emptyLocalized(),
    price_cents: 0,
    duration_days: 0,
    search_ranking_boost: 0,
    is_active: true,
    sort_order: 0,
  });

  function load() {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    fetch(`${API_URL}/api/v1/admin/boosters`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.data?.boosters) setBoosters(data.data.boosters);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setLoading(true);
    load();
  }, []);

  function openEdit(b: Booster) {
    setEditingId(b.id);
    setForm({
      slug: b.slug,
      displayNameByLocale: localizedFromEntity(b.display_name),
      price_cents: b.price_cents ?? 0,
      duration_days: b.duration_days ?? 0,
      search_ranking_boost: b.search_ranking_boost ?? 0,
      is_active: b.is_active ?? true,
      sort_order: b.sort_order ?? 0,
    });
    setModal('edit');
  }

  function setDisplayName(locale: string, value: string) {
    setForm((f) => ({
      ...f,
      displayNameByLocale: { ...f.displayNameByLocale, [locale]: value },
    }));
  }

  function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    const body = {
      slug: form.slug.trim(),
      display_name: form.displayNameByLocale,
      price_cents: form.price_cents,
      duration_days: form.duration_days,
      search_ranking_boost: form.search_ranking_boost,
      is_active: form.is_active,
      sort_order: form.sort_order,
    };
    fetch(`${API_URL}/api/v1/admin/boosters/${editingId}`, {
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

  if (loading && boosters.length === 0) {
    return <p className="text-neutral-slate">{t('loading')}</p>;
  }

  return (
    <div>
      <h1 className="font-display font-bold text-2xl text-neutral-carbon mb-6">
        {t('boosters_title')}
      </h1>
      <div className="bg-neutral-white rounded-card border border-neutral-outline shadow-card overflow-hidden">
        {boosters.length === 0 ? (
          <p className="p-8 text-neutral-slate">{t('no_boosters')}</p>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-neutral-mist border-b border-neutral-outline">
              <tr>
                <th className="px-4 py-3 text-sm font-medium text-neutral-carbon">{t('col_slug')}</th>
                {CONTENT_LOCALES.map((loc) => (
                  <th key={loc} className="px-4 py-3 text-sm font-medium text-neutral-carbon">
                    {t('display_name_with_locale', { locale: loc.toUpperCase() })}
                  </th>
                ))}
                <th className="px-4 py-3 text-sm font-medium text-neutral-carbon">{t('col_price_cents')}</th>
                <th className="px-4 py-3 text-sm font-medium text-neutral-carbon">{t('col_duration_days')}</th>
                <th className="px-4 py-3 text-sm font-medium text-neutral-carbon">{t('col_ranking_boost')}</th>
                <th className="px-4 py-3 text-sm font-medium text-neutral-carbon">{t('col_active')}</th>
                <th className="px-4 py-3 text-sm font-medium text-neutral-carbon">{t('col_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {boosters.map((b) => (
                <tr key={b.id} className="border-b border-neutral-outline last:border-0">
                  <td className="px-4 py-3 text-sm">{b.slug}</td>
                  {CONTENT_LOCALES.map((loc) => (
                    <td key={loc} className="px-4 py-3 text-sm">
                      {getLocalizedValue(b.display_name, loc)}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-sm">{b.price_cents}</td>
                  <td className="px-4 py-3 text-sm">{b.duration_days}</td>
                  <td className="px-4 py-3 text-sm">{b.search_ranking_boost}</td>
                  <td className="px-4 py-3 text-sm">{b.is_active ? t('yes') : t('no')}</td>
                  <td className="px-4 py-3 text-sm">
                    <button type="button" onClick={() => openEdit(b)} className="text-primary hover:underline">
                      {t('btn_edit')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-4 text-sm text-neutral-slate">
        {t('total')}: {boosters.length}
      </p>

      {modal === 'edit' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setModal('closed')}>
          <div
            className="bg-neutral-white rounded-card border border-neutral-outline shadow-card p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display font-semibold text-lg text-neutral-carbon mb-4">
              {t('edit_booster')}
            </h2>
            <form onSubmit={submitEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-carbon mb-1">{t('col_slug')}</label>
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
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-carbon mb-1">{t('col_price_cents')}</label>
                  <input
                    type="number"
                    min={0}
                    value={form.price_cents}
                    onChange={(e) => setForm((f) => ({ ...f, price_cents: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full rounded-button border border-neutral-outline px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-carbon mb-1">{t('col_duration_days')}</label>
                  <input
                    type="number"
                    min={0}
                    value={form.duration_days}
                    onChange={(e) => setForm((f) => ({ ...f, duration_days: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full rounded-button border border-neutral-outline px-4 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-carbon mb-1">{t('col_ranking_boost')}</label>
                <input
                  type="number"
                  min={0}
                  value={form.search_ranking_boost}
                  onChange={(e) => setForm((f) => ({ ...f, search_ranking_boost: parseInt(e.target.value, 10) || 0 }))}
                  className="w-full rounded-button border border-neutral-outline px-4 py-2"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="booster_active"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="rounded border-neutral-outline"
                />
                <label htmlFor="booster_active" className="text-sm text-neutral-carbon">{t('col_active')}</label>
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
