import { getTranslations } from 'next-intl/server';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingBenefits } from '@/components/landing/LandingBenefits';
import { LandingForStudents } from '@/components/landing/LandingForStudents';
import { LandingForTutors } from '@/components/landing/LandingForTutors';
import { LandingPricing } from '@/components/landing/LandingPricing';
import { LandingDownload } from '@/components/landing/LandingDownload';
import { LandingContact } from '@/components/landing/LandingContact';
import { LandingFooter } from '@/components/landing/LandingFooter';

export default async function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <LandingNav />
      <main className="flex-1">
        <LandingHero />
        <LandingBenefits />
        <LandingForStudents />
        <LandingForTutors />
        <LandingPricing />
        <LandingDownload />
        <LandingContact />
      </main>
      <LandingFooter />
    </div>
  );
}
