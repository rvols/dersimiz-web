'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const DOC_LABEL_KEYS: Record<string, 'doc_terms' | 'doc_privacy' | 'doc_cookie' | 'doc_usage'> = {
  terms_and_conditions: 'doc_terms',
  privacy_notice: 'doc_privacy',
  cookie_policy: 'doc_cookie',
  acceptable_usage_policy: 'doc_usage',
};

const DOC_TYPES = ['terms_and_conditions', 'privacy_notice', 'cookie_policy', 'acceptable_usage_policy'] as const;

type DocType = {
  latest: { id: string; type: string; version: number; title: string } | null;
  all_versions: { id: string; type: string; version: number; title: string; published_at: string }[];
};

type LegalDocDetail = {
  document: { id: string; type: string; version: number; title: string; body_markdown: string };
  acceptances: { user: { id: string; full_name?: string }; accepted_at: string }[];
  total_acceptances: number;
};

export default function AdminLegalPage() {
  const t = useTranslations('admin_panel');
  const [byType, setByType] = useState<Record<string, DocType>>({});
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewDoc, setViewDoc] = useState<LegalDocDetail | null>(null);
  const [viewDocId, setViewDocId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({ type: DOC_TYPES[0], title: '', body_markdown: '' });

  function load() {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    fetch(`${API_URL}/api/v1/admin/legal`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data?.data) setByType(data.data);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setLoading(true);
    load();
  }, []);

  useEffect(() => {
    if (!viewDocId) {
      setViewDoc(null);
      return;
    }
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    fetch(`${API_URL}/api/v1/admin/legal/${viewDocId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data?.data) setViewDoc(data.data);
      })
      .catch(() => setViewDoc(null));
  }, [viewDocId]);

  function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    fetch(`${API_URL}/api/v1/admin/legal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        type: createForm.type,
        title: createForm.title.trim(),
        body_markdown: createForm.body_markdown,
      }),
    })
      .then((r) => r.json())
      .then(() => {
        setCreateOpen(false);
        setCreateForm({ type: DOC_TYPES[0], title: '', body_markdown: '' });
        load();
      });
  }

  if (loading) return <p className="text-neutral-slate">{t('loading')}</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-bold text-2xl text-neutral-carbon">
          {t('legal_title')}
        </h1>
        <button type="button" onClick={() => setCreateOpen(true)} className="btn-primary">
          {t('legal_create_version')}
        </button>
      </div>
      <div className="space-y-6">
        {DOC_TYPES.map((type) => {
          const doc = byType[type];
          const latest = doc?.latest as DocType['latest'];
          const versions = (doc?.all_versions || []) as DocType['all_versions'];
          const labelKey = DOC_LABEL_KEYS[type];
          return (
            <div key={type} className="bg-neutral-white rounded-card border border-neutral-outline shadow-card p-6">
              <h2 className="font-display font-semibold text-lg text-neutral-carbon mb-2">
                {labelKey ? t(labelKey) : type}
              </h2>
              {latest ? (
                <p className="text-sm text-neutral-slate mb-2">
                  {t('latest_version', { version: latest.version, title: latest.title })}
                  <button
                    type="button"
                    onClick={() => setViewDocId(latest.id)}
                    className="ml-2 text-primary hover:underline"
                  >
                    {t('legal_view_doc')}
                  </button>
                </p>
              ) : (
                <p className="text-sm text-neutral-slate mb-2">{t('no_document')}</p>
              )}
              {versions.length > 0 && (
                <ul className="text-sm text-neutral-slate list-disc list-inside">
                  {versions.slice(0, 5).map((v) => (
                    <li key={v.id}>
                      v{v.version} – {v.title}
                      <button
                        type="button"
                        onClick={() => setViewDocId(v.id)}
                        className="ml-2 text-primary hover:underline"
                      >
                        {t('legal_view_doc')}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {createOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setCreateOpen(false)}>
          <div
            className="bg-neutral-white rounded-card border border-neutral-outline shadow-card p-6 w-full max-w-2xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display font-semibold text-lg text-neutral-carbon mb-4">
              {t('legal_create_version')}
            </h2>
            <form onSubmit={submitCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-carbon mb-1">{t('legal_type')}</label>
                <select
                  value={createForm.type}
                  onChange={(e) => setCreateForm((f) => ({ ...f, type: e.target.value as typeof DOC_TYPES[number] }))}
                  className="w-full rounded-button border border-neutral-outline px-4 py-2"
                >
                  {DOC_TYPES.map((tp) => (
                    <option key={tp} value={tp}>{t(DOC_LABEL_KEYS[tp])}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-carbon mb-1">{t('legal_title_label')}</label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-button border border-neutral-outline px-4 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-carbon mb-1">{t('legal_body_markdown')}</label>
                <textarea
                  value={createForm.body_markdown}
                  onChange={(e) => setCreateForm((f) => ({ ...f, body_markdown: e.target.value }))}
                  className="w-full rounded-button border border-neutral-outline px-4 py-2 min-h-[200px] font-mono text-sm"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary">{t('create_version')}</button>
                <button type="button" onClick={() => setCreateOpen(false)} className="btn-secondary">{t('cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewDocId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setViewDocId(null)}>
          <div
            className="bg-neutral-white rounded-card border border-neutral-outline shadow-card p-6 w-full max-w-4xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {viewDoc ? (
              <>
                <h2 className="font-display font-semibold text-lg text-neutral-carbon mb-2">
                  {viewDoc.document.title} (v{viewDoc.document.version})
                </h2>
                <p className="text-sm text-neutral-slate mb-4">
                  {t('total')} acceptances: {viewDoc.total_acceptances}
                </p>
                <pre className="bg-neutral-mist rounded-button p-4 text-sm text-neutral-carbon whitespace-pre-wrap mb-4 max-h-96 overflow-auto">
                  {viewDoc.document.body_markdown}
                </pre>
                {viewDoc.acceptances.length > 0 && (
                  <div>
                    <h3 className="font-medium text-neutral-carbon mb-2">Recent acceptances</h3>
                    <ul className="text-sm text-neutral-slate list-disc list-inside">
                      {viewDoc.acceptances.slice(0, 10).map((a, i) => (
                        <li key={i}>
                          {a.user.full_name ?? a.user.id} – {new Date(a.accepted_at).toLocaleString()}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="text-neutral-slate">{t('loading')}</p>
            )}
            <button
              type="button"
              onClick={() => setViewDocId(null)}
              className="mt-4 btn-secondary"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
