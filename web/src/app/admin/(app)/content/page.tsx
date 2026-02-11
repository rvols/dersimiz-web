'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function AdminContentPage() {
  const t = useTranslations('admin_panel');
  const cards = [
    { href: '/admin/lesson-types', titleKey: 'content_lesson_types' as const, descKey: 'content_lesson_types_desc' as const, hint: t('backend_hint_lesson') },
    { href: '/admin/locations', titleKey: 'content_locations' as const, descKey: 'content_locations_desc' as const, hint: t('backend_hint_locations') },
    { href: '/admin/school-types', titleKey: 'content_school_types' as const, descKey: 'content_school_types_desc' as const, hint: t('backend_hint_schools') },
    { href: '/admin/grades', titleKey: 'content_grades' as const, descKey: 'content_grades_desc' as const, hint: t('backend_hint_grades') },
    { href: '/admin/plans', titleKey: 'content_plans' as const, descKey: 'content_plans_desc' as const, hint: null },
  ];
  return (
    <div>
      <h1 className="font-display font-bold text-2xl text-neutral-carbon mb-6">
        {t('content_title')}
      </h1>
      <div className="grid sm:grid-cols-2 gap-6">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="bg-neutral-white rounded-card border border-neutral-outline shadow-card p-6 block transition-all hover:shadow-card-hover hover:-translate-y-0.5"
          >
            <h2 className="font-display font-semibold text-lg text-neutral-carbon mb-2">
              {t(card.titleKey)}
            </h2>
            <p className="text-neutral-slate text-sm mb-4">
              {t(card.descKey)}
            </p>
            {card.hint && (
              <p className="text-xs text-neutral-slate">
                {card.hint}
              </p>
            )}
            <p className="text-primary text-sm font-medium mt-2">{t('manage')} →</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
