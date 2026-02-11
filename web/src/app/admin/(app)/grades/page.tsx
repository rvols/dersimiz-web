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

type Grade = {
  id: string;
  school_type_id: string;
  name: Record<string, string>;
  sort_order: number;
  school_type_name?: Record<string, string>;
};

export default function AdminGradesPage() {
  const t = useTranslations('admin_panel');
  const [grades, setGrades] = useState<Grade[]>([]);
  const [schoolTypes, setSchoolTypes] = useState<SchoolType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [modal, setModal] = useState<'closed' | 'create' | 'edit'>('closed');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    school_type_id: '',
    nameByLocale: emptyLocalized(),
    sort_order: 0,
  });

  function load() {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    Promise.all([
      fetch(`${API_URL}/api/v1/admin/grades`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch(`${API_URL}/api/v1/admin/school-types`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ])
      .then(([gradesRes, typesRes]) => {
        if (gradesRes?.data?.grades) setGrades(gradesRes.data.grades);
        if (typesRes?.data?.school_types) setSchoolTypes(typesRes.data.school_types);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setLoading(true);
    load();
  }, []);

  function openCreate() {
    setForm({ school_type_id: schoolTypes[0]?.id ?? '', nameByLocale: emptyLocalized(), sort_order: 0 });
    setEditingId(null);
    setModal('create');
    setShowForm(true);
  }

  function openEdit(grade: Grade) {
    setEditingId(grade.id);
    setForm({
      school_type_id: grade.school_type_id,
      nameByLocale: localizedFromEntity(grade.name),
      sort_order: grade.sort_order ?? 0,
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
    if (!token || !form.school_type_id) return;
    fetch(`${API_URL}/api/v1/admin/grades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        school_type_id: form.school_type_id,
        name: form.nameByLocale,
        sort_order: form.sort_order,
      }),
    })
      .then((r) => r.json())
      .then(() => {
        setShowForm(false);
        setModal('closed');
        setForm({ school_type_id: form.school_type_id || '', nameByLocale: emptyLocalized(), sort_order: 0 });
        load();
      });
  }

  function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    const token = localStorage.getItem('admin_token');
    if (!token || !editingId) return;
    fetch(`${API_URL}/api/v1/admin/grades/${editingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        school_type_id: form.school_type_id,
        name: form.nameByLocale,
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

  function handleDelete(grade: Grade) {
    if (!confirm(t('confirm_delete'))) return;
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    fetch(`${API_URL}/api/v1/admin/grades/${grade.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(() => load());
  }

  const schoolTypeName = (id: string) => {
    const st = schoolTypes.find((s) => s.id === id);
    if (!st?.name) return '—';
    return CONTENT_LOCALES.map((loc) => getLocalizedValue(st.name, loc)).filter(Boolean).join(' / ') || '—';
  };

  const bySchoolType = schoolTypes
    .map((st) => ({
      schoolType: st,
      grades: grades.filter((g) => g.school_type_id === st.id),
    }))
    .filter((g) => g.grades.length > 0);

  if (loading && grades.length === 0) {
    return <p className="text-neutral-slate">{t('loading')}</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-bold text-2xl text-neutral-carbon">
          {t('grades_title')}
        </h1>
        <button type="button" onClick={openCreate} className="btn-primary">
          {t('add_grade')}
        </button>
      </div>

      <p className="text-neutral-slate text-sm mb-4">
        {t('grades_desc')}
      </p>

      {grades.length === 0 ? (
        <div className="bg-neutral-white rounded-card border border-neutral-outline shadow-card p-8 text-center">
          <p className="text-neutral-slate mb-4">{t('no_grades')}</p>
          <p className="text-sm text-neutral-slate mb-4">{t('grades_hint')}</p>
          <button type="button" onClick={openCreate} className="btn-primary">
            {t('add_grade')}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {bySchoolType.map(({ schoolType, grades: list }) => (
            <div key={schoolType.id} className="bg-neutral-white rounded-card border border-neutral-outline shadow-card overflow-hidden">
              <div className="px-4 py-3 bg-neutral-mist border-b border-neutral-outline font-medium text-neutral-carbon">
                {schoolTypeName(schoolType.id)}
              </div>
              <ul className="divide-y divide-neutral-outline">
                {list.map((grade) => (
                  <li key={grade.id} className="px-4 py-3 flex items-center justify-between">
                    <span className="text-neutral-carbon">
                      {CONTENT_LOCALES.map((loc) => getLocalizedValue(grade.name, loc)).filter((s) => s !== '—').join(' / ') || '—'}
                    </span>
                    <span className="text-sm text-neutral-slate flex items-center gap-2">
                      {t('plan_sort_order')}: {grade.sort_order}
                      <button type="button" onClick={() => openEdit(grade)} className="text-primary hover:underline">
                        {t('btn_edit')}
                      </button>
                      <button type="button" onClick={() => handleDelete(grade)} className="text-red-600 hover:underline">
                        {t('btn_delete')}
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="mt-6 bg-neutral-white rounded-card border border-neutral-outline shadow-card p-6 max-w-md">
          <h2 className="font-display font-semibold text-lg text-neutral-carbon mb-4">
            {modal === 'edit' ? t('edit_grade') : t('add_grade')}
          </h2>
          <form onSubmit={modal === 'edit' ? submitEdit : submitCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-carbon mb-1">{t('school_type')}</label>
              <select
                value={form.school_type_id}
                onChange={(e) => setForm((f) => ({ ...f, school_type_id: e.target.value }))}
                className="w-full rounded-button border border-neutral-outline px-4 py-2 bg-white"
                required
              >
                <option value="">— {t('select_school_type')} —</option>
                {schoolTypes.map((st) => (
                  <option key={st.id} value={st.id}>
                    {schoolTypeName(st.id)}
                  </option>
                ))}
              </select>
            </div>
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
              <button type="button" onClick={() => { setShowForm(false); setModal('closed'); setEditingId(null); }} className="btn-secondary">{t('cancel')}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
