'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';

export function LandingForTutors() {
  const t = useTranslations('landing.for_tutors');

  const items = [
    { key: 'profile', titleKey: 'profile' as const, descKey: 'profile_desc' as const },
    { key: 'calendar', titleKey: 'calendar' as const, descKey: 'calendar_desc' as const },
    { key: 'earn', titleKey: 'earn' as const, descKey: 'earn_desc' as const },
  ];

  return (
    <section id="tutors" className="py-20 bg-neutral-mist">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.h2
          className="font-display font-bold text-3xl sm:text-4xl text-neutral-carbon text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {t('title')}
        </motion.h2>
        <div className="grid md:grid-cols-3 gap-8">
          {items.map((item, i) => (
            <motion.div
              key={item.key}
              className="bg-neutral-white rounded-card p-8 border border-neutral-outline shadow-card shadow-card-hover transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <h3 className="font-display font-semibold text-xl text-tutor-teal mb-2">
                {t(item.titleKey)}
              </h3>
              <p className="text-neutral-slate">{t(item.descKey)}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
