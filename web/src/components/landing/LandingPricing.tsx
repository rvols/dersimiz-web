'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';

export function LandingPricing() {
  const t = useTranslations('landing.pricing');

  return (
    <section id="pricing" className="py-20 bg-neutral-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-neutral-carbon mb-3">
            {t('title')}
          </h2>
          <p className="text-neutral-slate text-lg">{t('subtitle')}</p>
        </motion.div>
        <motion.div
          className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="bg-neutral-white rounded-card p-8 border border-neutral-outline shadow-card">
            <h3 className="font-display font-semibold text-xl text-neutral-carbon mb-2">
              {t('free')}
            </h3>
            <p className="text-neutral-slate text-sm mb-4">Temel özellikler, sınırlı mesaj</p>
            <p className="text-sm text-neutral-slate">{t('download')}</p>
          </div>
          <div className="bg-neutral-white rounded-card p-8 border-2 border-primary shadow-card">
            <h3 className="font-display font-semibold text-xl text-primary mb-2">
              {t('premium')}
            </h3>
            <p className="text-neutral-slate text-sm mb-4">Sınırsız mesaj, öncelikli destek</p>
            <p className="text-sm text-neutral-slate">{t('download')}</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
