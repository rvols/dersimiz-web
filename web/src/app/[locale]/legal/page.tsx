import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getPublicDocuments, DOC_TYPE_TO_SLUG } from '@/lib/legal';

const DOC_TYPES = [
  'terms_and_conditions',
  'privacy_notice',
  'cookie_policy',
  'acceptable_usage_policy',
] as const;

const DOC_TYPE_KEYS: Record<(typeof DOC_TYPES)[number], 'terms' | 'privacy' | 'cookies' | 'usage'> = {
  terms_and_conditions: 'terms',
  privacy_notice: 'privacy',
  cookie_policy: 'cookies',
  acceptable_usage_policy: 'usage',
};

export default async function LegalIndexPage() {
  const [documents, t] = await Promise.all([getPublicDocuments(), getTranslations('legal')]);
  const byType = new Map(documents.map((d) => [d.type, d]));

  return (
    <div className="bg-neutral-white rounded-card border border-neutral-outline shadow-card p-8">
      <h1 className="font-display font-bold text-2xl text-neutral-carbon mb-2">
        {t('index_title')}
      </h1>
      <p className="text-neutral-slate mb-8">
        {t('index_intro')}
      </p>
      <ul className="space-y-3">
        {DOC_TYPES.map((type) => {
          const slug = DOC_TYPE_TO_SLUG[type];
          const doc = byType.get(type);
          const label = t(DOC_TYPE_KEYS[type]);
          return (
            <li key={type}>
              <Link
                href={`/legal/${slug}`}
                className="text-primary font-medium hover:underline"
              >
                {doc ? doc.title : label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-8 pt-6 border-t border-neutral-outline">
        <Link href="/" className="text-primary text-sm font-medium hover:underline">
          ← {t('back_home')}
        </Link>
      </div>
    </div>
  );
}
