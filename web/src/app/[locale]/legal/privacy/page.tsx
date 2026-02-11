import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { LegalMarkdown } from '@/components/legal/LegalMarkdown';
import { getPublicDocuments } from '@/lib/legal';

export default async function LegalPrivacyPage() {
  const [documents, t] = await Promise.all([getPublicDocuments(), getTranslations('legal')]);
  const doc = documents.find((d) => d.type === 'privacy_notice');

  return (
    <div className="bg-neutral-white rounded-card border border-neutral-outline shadow-card p-8">
      <div className="mb-6">
        <Link href="/legal" className="text-primary text-sm font-medium hover:underline">
          ← {t('all_docs')}
        </Link>
      </div>
      <h1 className="font-display font-bold text-2xl text-neutral-carbon mb-6">
        {doc ? doc.title : t('privacy')}
      </h1>
      {doc?.body_markdown ? (
        <LegalMarkdown content={doc.body_markdown} />
      ) : (
        <p className="text-neutral-slate">{t('not_published')}</p>
      )}
    </div>
  );
}
