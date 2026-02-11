'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CONTENT_LOCALES, getLocalizedValue } from '@/lib/content-locales';

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

  useEffect(() => {
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
  }, []);

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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-4 text-sm text-neutral-slate">
        {t('total')}: {boosters.length}
      </p>
    </div>
  );
}
