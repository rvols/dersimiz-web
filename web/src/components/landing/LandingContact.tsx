'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { useState } from 'react';

export function LandingContact() {
  const t = useTranslations('landing.contact');
  const [sent, setSent] = useState(false);

  return (
    <section id="contact" className="py-20 bg-neutral-white">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-neutral-carbon mb-3">
            {t('title')}
          </h2>
          <p className="text-neutral-slate">{t('subtitle')}</p>
        </motion.div>
        <motion.div
          className="bg-neutral-mist rounded-card p-8 border border-neutral-outline shadow-card"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {sent ? (
            <p className="text-center text-tutor-teal font-medium">
              Mesajınız alındı. En kısa sürede dönüş yapacağız.
            </p>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
            >
              <div>
                <label className="block text-sm font-medium text-neutral-carbon mb-1">
                  {t('name')}
                </label>
                <input
                  type="text"
                  className="w-full rounded-button border border-neutral-outline px-4 py-3 bg-neutral-white focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-carbon mb-1">
                  {t('email')}
                </label>
                <input
                  type="email"
                  className="w-full rounded-button border border-neutral-outline px-4 py-3 bg-neutral-white focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-carbon mb-1">
                  {t('message')}
                </label>
                <textarea
                  rows={4}
                  className="w-full rounded-button border border-neutral-outline px-4 py-3 bg-neutral-white focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none resize-none"
                  required
                />
              </div>
              <button type="submit" className="btn-primary w-full">
                {t('send')}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
}
