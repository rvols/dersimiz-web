'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  CONTENT_LOCALES,
  emptyLocalized,
  localizedFromEntity,
  getLocalizedValue,
  formatLocalizedOption,
} from '@/lib/content-locales';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type Location = {
  id: string;
  parent_id: string | null;
  type: string;
  name: Record<string, string>;
  code: string | null;
  sort_order: number;
};

const LOC_TYPES = ['country', 'state', 'city', 'district'] as const;
const TYPE_KEYS = { country: 'type_country', state: 'type_state', city: 'type_city', district: 'type_district' } as const;

export default function AdminLocationsPage() {
  const t = useTranslations('admin_panel');
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [modal, setModal] = useState<'closed' | 'create' | 'edit'>('closed');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    parent_id: '',
    type: 'country' as 'country' | 'state' | 'city' | 'district',
    nameByLocale: emptyLocalized(),
    code: '',
    sort_order: 0,
  });

  function load() {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    fetch(`${API_URL}/api/v1/admin/locations`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data?.data?.locations) setLocations(data.data.locations);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setLoading(true);
    load();
  }, []);

  const parentOptions = locations.filter((l) =>
    (form.type === 'state' && l.type === 'country') ||
    (form.type === 'city' && (l.type === 'country' || l.type === 'state')) ||
    (form.type === 'district' && l.type === 'city')
  );

  function openCreate() {
    setForm({ parent_id: '', type: 'country', nameByLocale: emptyLocalized(), code: '', sort_order: locations.length });
    setEditingId(null);
    setModal('create');
    setShowForm(true);
  }

  function openEdit(loc: Location) {
    setEditingId(loc.id);
    setForm({
      parent_id: loc.parent_id ?? '',
      type: loc.type as 'country' | 'state' | 'city' | 'district',
      nameByLocale: localizedFromEntity(loc.name),
      code: loc.code ?? '',
      sort_order: loc.sort_order ?? 0,
    });
    setModal('edit');
    setShowForm(true);
  }

  function setName(locale: string, value: string) {
    setForm((f) => ({
      ...f,
      nameByLocale: { ...f.nameByLocale, [locale]: value },
    }));
  }

  function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    fetch(`${API_URL}/api/v1/admin/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        parent_id: form.parent_id || null,
        type: form.type,
        name: form.nameByLocale,
        code: form.code.trim() || null,
        sort_order: form.sort_order,
      }),
    })
      .then((r) => r.json())
      .then(() => {
        setShowForm(false);
        setModal('closed');
        setForm({ parent_id: '', type: 'country', nameByLocale: emptyLocalized(), code: '', sort_order: locations.length });
        load();
      });
  }

  function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    const token = localStorage.getItem('admin_token');
    if (!token || !editingId) return;
    fetch(`${API_URL}/api/v1/admin/locations/${editingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        parent_id: form.parent_id || null,
        type: form.type,
        name: form.nameByLocale,
        code: form.code.trim() || null,
        sort_order: form.sort_order,
      }),
    })
      .then((r) => r.json())
      .then(() => {
        setShowForm(false);
        setModal('closed');
        setEditingId(null);
        load();
      });
  }

  function handleDelete(loc: Location) {
    if (!confirm(t('confirm_delete'))) return;
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    fetch(`${API_URL}/api/v1/admin/locations/${loc.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(() => load());
  }

  function parentLabel(id: string): string {
    const loc = locations.find((l) => l.id === id);
    return loc ? formatLocalizedOption(loc.name) : id;
  }

  if (loading && locations.length === 0) {
    return <p className="text-neutral-slate">{t('loading')}</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-bold text-2xl text-neutral-carbon">
          {t('locations_title')}
        </h1>
        <button type="button" onClick={openCreate} className="btn-primary">
          {t('add_location')}
        </button>
      </div>
      <div className="bg-neutral-white rounded-card border border-neutral-outline shadow-card overflow-hidden">
        {locations.length === 0 ? (
          <p className="p-8 text-neutral-slate">{t('no_locations')}</p>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-neutral-mist border-b border-neutral-outline">
              <tr>
                <th className="px-4 py-3 text-sm font-medium text-neutral-carbon">{t('location_type')}</th>
                {CONTENT_LOCALES.map((loc) => (
                  <th key={loc} className="px-4 py-3 text-sm font-medium text-neutral-carbon">
                    {t('name_with_locale', { locale: loc.toUpperCase() })}
                  </th>
                ))}
                <th className="px-4 py-3 text-sm font-medium text-neutral-carbon">{t('location_code')}</th>
                <th className="px-4 py-3 text-sm font-medium text-neutral-carbon">{t('location_parent')}</th>
                <th className="px-4 py-3 text-sm font-medium text-neutral-carbon">{t('col_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((loc) => (
                <tr key={loc.id} className="border-b border-neutral-outline last:border-0">
                  <td className="px-4 py-3 text-sm">{t(TYPE_KEYS[loc.type as keyof typeof TYPE_KEYS] ?? 'location_type')}</td>
                  {CONTENT_LOCALES.map((l) => (
                    <td key={l} className="px-4 py-3 text-sm">{getLocalizedValue(loc.name, l)}</td>
                  ))}
                  <td className="px-4 py-3 text-sm">{loc.code ?? '—'}</td>
                  <td className="px-4 py-3 text-sm">{loc.parent_id ? parentLabel(loc.parent_id) : '—'}</td>
                  <td className="px-4 py-3 text-sm">
                    <button type="button" onClick={() => openEdit(loc)} className="text-primary hover:underline mr-3">
                      {t('btn_edit')}
                    </button>
                    <button type="button" onClick={() => handleDelete(loc)} className="text-red-600 hover:underline">
                      {t('btn_delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="mt-6 bg-neutral-white rounded-card border border-neutral-outline shadow-card p-6 max-w-md">
          <h2 className="font-display font-semibold text-lg text-neutral-carbon mb-4">
            {modal === 'edit' ? t('edit_location') : t('add_location')}
          </h2>
          <form onSubmit={modal === 'edit' ? submitEdit : submitCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-carbon mb-1">{t('location_type')}</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'country' | 'state' | 'city' | 'district', parent_id: '' }))}
                className="w-full rounded-button border border-neutral-outline px-4 py-2"
              >
                {LOC_TYPES.map((tp) => (
                  <option key={tp} value={tp}>{t(TYPE_KEYS[tp])}</option>
                ))}
              </select>
            </div>
            {(form.type === 'state' || form.type === 'city' || form.type === 'district') && (
              <div>
                <label className="block text-sm font-medium text-neutral-carbon mb-1">{t('location_parent')}</label>
                <select
                  value={form.parent_id}
                  onChange={(e) => setForm((f) => ({ ...f, parent_id: e.target.value }))}
                  className="w-full rounded-button border border-neutral-outline px-4 py-2"
                >
                  <option value="">—</option>
                  {parentOptions.map((p) => (
                    <option key={p.id} value={p.id}>{formatLocalizedOption(p.name)}</option>
                  ))}
                </select>
              </div>
            )}
            {CONTENT_LOCALES.map((loc) => (
              <div key={loc}>
                <label className="block text-sm font-medium text-neutral-carbon mb-1">
                  {t('name_with_locale', { locale: loc.toUpperCase() })}
                </label>
                <input
                  type="text"
                  value={form.nameByLocale[loc] ?? ''}
                  onChange={(e) => setName(loc, e.target.value)}
                  className="w-full rounded-button border border-neutral-outline px-4 py-2"
                  required
                />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-neutral-carbon mb-1">{t('location_code')}</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                className="w-full rounded-button border border-neutral-outline px-4 py-2"
              />
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
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">{t('save')}</button>
              <button type="button" onClick={() => { setShowForm(false); setModal('closed'); setEditingId(null); }} className="btn-secondary">{t('cancel')}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
