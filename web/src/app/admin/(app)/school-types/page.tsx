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

type SchoolType = {
  id: string;
  name: Record<string, string>;
  sort_order: number;
};

export default function AdminSchoolTypesPage() {
  const t = useTranslations('admin_panel');
  const [items, setItems] = useState<SchoolType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'closed' | 'create' | 'edit'>('closed');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nameByLocale: emptyLocalized(), sort_order: 0 });

  function load() {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    fetch(`${API_URL}/api/v1/admin/school-types`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data?.data?.school_types) setItems(data.data.school_types);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setLoading(true);
    load();
  }, []);

  function openCreate() {
    setForm({ nameByLocale: emptyLocalized(), sort_order: items.length });
    setEditingId(null);
    setModal('create');
  }

  function openEdit(item: SchoolType) {
    setEditingId(item.id);
    setForm({
      nameByLocale: localizedFromEntity(item.name),
      sort_order: item.sort_order ?? 0,
    });
    setModal('edit');
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
    fetch(`${API_URL}/api/v1/admin/school-types`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: form.nameByLocale,
        sort_order: form.sort_order,
      }),
    })
      .then((r) => r.json())
      .then(() => {
        setModal('closed');
        setForm({ nameByLocale: emptyLocalized(), sort_order: items.length });
        load();
      });
  }

  function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    fetch(`${API_URL}/api/v1/admin/school-types/${editingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: form.nameByLocale,
        sort_order: form.sort_order,
      }),
    })
      .then((r) => r.json())
      .then(() => {
        setModal('closed');
        setEditingId(null);
        load();
      });
  }

  function handleDelete(item: SchoolType) {
    if (!confirm(t('confirm_delete'))) return;
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    fetch(`${API_URL}/api/v1/admin/school-types/${item.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(() => load());
  }

  if (loading && items.length === 0) {
    return <p className="text-neutral-slate">{t('loading')}</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-bold text-2xl text-neutral-carbon">
          {t('school_types_title')}
        </h1>
        <button type="button" onClick={openCreate} className="btn-primary">
          {t('add_school_type')}
        </button>
      </div>
      <div className="bg-neutral-white rounded-card border border-neutral-outline shadow-card overflow-hidden">
        {items.length === 0 ? (
          <p className="p-8 text-neutral-slate">{t('no_school_types')}</p>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-neutral-mist border-b border-neutral-outline">
              <tr>
                {CONTENT_LOCALES.map((loc) => (
                  <th key={loc} className="px-4 py-3 text-sm font-medium text-neutral-carbon">
                    {t('name_with_locale', { locale: loc.toUpperCase() })}
                  </th>
                ))}
                <th className="px-4 py-3 text-sm font-medium text-neutral-carbon">{t('plan_sort_order')}</th>
                <th className="px-4 py-3 text-sm font-medium text-neutral-carbon">{t('col_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-neutral-outline last:border-0">
                  {CONTENT_LOCALES.map((loc) => (
                    <td key={loc} className="px-4 py-3 text-sm">
                      {getLocalizedValue(item.name, loc)}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-sm">{item.sort_order}</td>
                  <td className="px-4 py-3 text-sm">
                    <button type="button" onClick={() => openEdit(item)} className="text-primary hover:underline mr-3">
                      {t('btn_edit')}
                    </button>
                    <button type="button" onClick={() => handleDelete(item)} className="text-red-600 hover:underline">
                      {t('btn_delete')}
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
              {modal === 'create' ? t('add_school_type') : t('edit_school_type')}
            </h2>
            <form onSubmit={modal === 'create' ? submitCreate : submitEdit} className="space-y-4">
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
                <button type="button" onClick={() => setModal('closed')} className="btn-secondary">{t('cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
