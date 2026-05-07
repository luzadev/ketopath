import { prisma } from '@ketopath/db';
import { redirect } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { CursorGlow } from '@/components/cursor-glow';
import { Masthead } from '@/components/masthead';
import { getServerSession } from '@/lib/auth';

import { fetchAchievements } from './achievements-actions';
import { AchievementsPanel } from './achievements-panel';
import { fetchProfile } from './actions';
import { DataPanel } from './data-panel';
import { fetchNotificationConfig } from './notifications-actions';
import { NotificationsPanel } from './notifications-panel';
import { fetchPreferences } from './preferences-actions';
import { PreferencesSection } from './preferences-section';
import { ProfileForm } from './profile-form';

export default async function ProfilePage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const session = await getServerSession();
  if (!session?.user) redirect('/sign-in');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { disclaimerAcceptedAt: true },
  });
  if (!user?.disclaimerAcceptedAt) redirect('/welcome');

  const profile = (await fetchProfile()) as Parameters<typeof ProfileForm>[0]['initial'];
  const notifications = await fetchNotificationConfig();
  const preferences = await fetchPreferences();
  const achievements = await fetchAchievements();

  return (
    <ProfilePageContent
      initial={profile}
      notifications={notifications}
      preferences={preferences}
      achievements={achievements}
    />
  );
}

function ProfilePageContent({
  initial,
  notifications,
  preferences,
  achievements,
}: {
  initial: Parameters<typeof ProfileForm>[0]['initial'];
  notifications: Awaited<ReturnType<typeof fetchNotificationConfig>>;
  preferences: Awaited<ReturnType<typeof fetchPreferences>>;
  achievements: Awaited<ReturnType<typeof fetchAchievements>>;
}) {
  const t = useTranslations('Profile');

  return (
    <div className="relative">
      <div className="min-h-screen w-full px-6 sm:px-10 lg:px-16 xl:px-24">
        <Masthead showNav />
        <main className="relative overflow-hidden pb-24 pt-10 sm:pt-12">
          <CursorGlow color="hsl(var(--oliva))" size={520} />
          <div
            aria-hidden
            className="mesh-blob mesh-blob--oliva animate-float-y -right-32 top-12 h-[28rem] w-[28rem] opacity-50"
          />
          <div
            aria-hidden
            className="mesh-blob mesh-blob--oro animate-float-x -left-24 top-72 h-72 w-72 opacity-35"
          />
          <span
            aria-hidden
            className="font-display text-stroke-thin text-chapter pointer-events-none absolute -right-4 -top-12 select-none italic"
          >
            IV
          </span>
          <div
            aria-hidden
            className="pointer-events-none absolute right-0 top-32 hidden md:block"
            style={{ writingMode: 'vertical-rl' }}
          >
            <p className="text-ink-soft font-mono text-xs uppercase tracking-[0.4em]">
              Capitolo IV — Profilo
            </p>
          </div>
          <h1 className="font-display text-mega bleed-left animate-fade-up relative mt-8 font-medium [animation-delay:120ms]">
            <span className="text-ink block">
              {t('title')}
              <span className="text-pomodoro">.</span>
            </span>
          </h1>
          <p className="font-display text-ink-soft animate-fade-up relative mt-10 max-w-2xl text-2xl italic leading-snug [animation-delay:240ms] md:ml-[16.66%]">
            {t('subtitle')}
          </p>

          <div className="rule animate-rule-in my-12 [animation-delay:360ms]" />

          <div className="animate-fade-up [animation-delay:300ms]">
            <ProfileForm initial={initial} />
          </div>

          <div className="rule animate-rule-in my-16 [animation-delay:420ms]" />

          <div className="animate-fade-up [animation-delay:480ms]">
            <PreferencesSection initial={preferences} />
          </div>

          <div className="rule animate-rule-in my-16 [animation-delay:600ms]" />

          <div className="animate-fade-up [animation-delay:660ms]">
            <NotificationsPanel initial={notifications} />
          </div>

          <div className="rule animate-rule-in my-16 [animation-delay:780ms]" />

          <div className="animate-fade-up [animation-delay:840ms]">
            <AchievementsPanel unlocked={achievements} />
          </div>

          <div className="rule animate-rule-in my-16 [animation-delay:900ms]" />

          <div className="animate-fade-up [animation-delay:960ms]">
            <DataPanel />
          </div>
        </main>
      </div>
    </div>
  );
}
