'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function GooglePlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.16 5.947 7.858-8.25zM5.864 2.658L16.802 8.99l-2.302 2.302-8.636-8.634zm13.946 6.504l-2.26-1.294-2.383 2.383 2.383 2.383 2.26-1.294a1 1 0 0 0 0-1.732z"
      />
    </svg>
  );
}

export function LandingDownload() {
  const t = useTranslations('landing.download');

  return (
    <section id="download" className="py-20 bg-neutral-mist">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
        <motion.h2
          className="font-display font-bold text-3xl sm:text-4xl text-neutral-carbon mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {t('title')}
        </motion.h2>
        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <a
            href="#"
            className="inline-flex items-center justify-center gap-3 bg-primary text-white rounded-full py-3 px-6 text-sm font-medium shadow-button hover:bg-primary-hover transition-colors min-w-[180px]"
          >
            <AppleIcon className="w-6 h-6" />
            {t('app_store')}
          </a>
          <a
            href="#"
            className="inline-flex items-center justify-center gap-3 bg-primary text-white rounded-full py-3 px-6 text-sm font-medium shadow-button hover:bg-primary-hover transition-colors min-w-[180px]"
          >
            <GooglePlayIcon className="w-6 h-6" />
            {t('play_store')}
          </a>
        </motion.div>
      </div>
    </section>
  );
}
