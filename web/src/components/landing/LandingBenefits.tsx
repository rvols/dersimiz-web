'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export function LandingBenefits() {
  const t = useTranslations('landing.benefits');

  const benefits = [
    {
      key: 'mobile_first',
      icon: '📱',
      titleKey: 'mobile_first' as const,
      descKey: 'mobile_desc' as const,
    },
    {
      key: 'safe',
      icon: '🛡️',
      titleKey: 'safe' as const,
      descKey: 'safe_desc' as const,
    },
    {
      key: 'simple',
      icon: '✨',
      titleKey: 'simple' as const,
      descKey: 'simple_desc' as const,
    },
  ];

  return (
    <section id="benefits" className="py-20 bg-neutral-mist">
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
          className="grid md:grid-cols-3 gap-8"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {benefits.map((b) => (
            <motion.div
              key={b.key}
              variants={item}
              className="bg-neutral-white rounded-card border border-neutral-outline shadow-card shadow-card-hover p-8 transition-all duration-300"
            >
              <div className="text-3xl mb-4">{b.icon}</div>
              <h3 className="font-display font-semibold text-xl text-neutral-carbon mb-2">
                {t(b.titleKey)}
              </h3>
              <p className="text-neutral-slate">{t(b.descKey)}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
