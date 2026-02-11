'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import Link from 'next/link';

export function LandingHero() {
  const t = useTranslations('landing.hero');

  return (
    <section className="relative overflow-hidden bg-neutral-white py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
        <motion.h1
          className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-neutral-carbon mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {t('title')}
        </motion.h1>
        <motion.p
          className="text-lg sm:text-xl text-neutral-slate max-w-2xl mx-auto mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {t('subtitle')}
        </motion.p>
        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Link
            href="#download"
            className="btn-primary inline-flex items-center justify-center"
          >
            {t('cta')}
          </Link>
        </motion.div>
      </div>
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_rgba(37,99,235,0.06)_0%,_transparent_70%)]" />
    </section>
  );
}
