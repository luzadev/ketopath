import { prisma } from '@ketopath/db';
import { redirect } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { CursorGlow } from '@/components/cursor-glow';
import { Masthead } from '@/components/masthead';
import { getServerSession } from '@/lib/auth';

import { fetchProfile } from '../profile/actions';
import { fetchPreferences } from '../profile/preferences-actions';
import type { ProfileForm } from '../profile/profile-form';

import { OnboardingFlow } from './onboarding-flow';

export default async function OnboardingPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const session = await getServerSession();
  if (!session?.user) redirect('/sign-in');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { disclaimerAcceptedAt: true },
  });
  if (!user?.disclaimerAcceptedAt) redirect('/welcome');

  const [profile, preferences] = await Promise.all([fetchProfile(), fetchPreferences()]);

  return (
    <OnboardingPageContent
      profile={profile as Parameters<typeof ProfileForm>[0]['initial']}
      preferences={preferences}
    />
  );
}

function OnboardingPageContent({
  profile,
  preferences,
}: {
  profile: Parameters<typeof ProfileForm>[0]['initial'];
  preferences: Awaited<ReturnType<typeof fetchPreferences>>;
}) {
  const t = useTranslations('Onboarding');

  return (
    <div className="relative">
      <div className="mx-auto min-h-screen max-w-7xl px-6 sm:px-10">
        <Masthead issueLabel="N. 03 — Inizio" />
        <main className="relative overflow-hidden pb-24 pt-10 sm:pt-12">
          <CursorGlow color="hsl(var(--oro))" size={520} />
          <div
            aria-hidden
            className="mesh-blob mesh-blob--oro animate-float-y -right-24 top-12 h-[28rem] w-[28rem] opacity-50"
          />
          <div
            aria-hidden
            className="mesh-blob mesh-blob--pomodoro animate-float-x -left-32 top-72 h-80 w-80 opacity-40"
          />

          {/* Chapter "III" gigante in stroke */}
          <span
            aria-hidden
            className="font-display text-stroke-thin text-chapter pointer-events-none absolute -right-4 -top-12 select-none italic"
          >
            III
          </span>

          {/* Eyebrow verticale destra */}
          <div
            aria-hidden
            className="pointer-events-none absolute right-0 top-32 hidden md:block"
            style={{ writingMode: 'vertical-rl' }}
          >
            <p className="text-ink-soft font-mono text-xs uppercase tracking-[0.4em]">
              Capitolo III — Inizio
            </p>
          </div>

          {/* Titolo bleed-left */}
          <h1 className="font-display text-mega bleed-left animate-fade-up relative mt-8 font-medium [animation-delay:120ms]">
            <span className="text-ink block">{t('title')}</span>
          </h1>

          <p className="font-display text-ink-soft animate-fade-up relative mt-10 max-w-2xl text-2xl italic leading-snug [animation-delay:240ms] md:ml-[16.66%]">
            {t('subtitle')}
          </p>

          <div className="rule animate-rule-in my-12 [animation-delay:360ms]" />

          <div className="relative">
            <OnboardingFlow initialProfile={profile} initialPreferences={preferences} />
          </div>
        </main>

        <div className="rule-thick" />
      </div>
    </div>
  );
}
