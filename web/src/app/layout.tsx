import type { Metadata } from 'next';
import { Outfit, Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Toaster } from 'sonner';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Dersimiz - Öğretmenlerle Buluş',
  description: 'Nitelikli özel ders öğretmenleri ile buluş, güvenle ders al. Mobil uygulama.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale} className={`${outfit.variable} ${inter.variable}`}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
          <Toaster position="top-center" richColors closeButton />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
