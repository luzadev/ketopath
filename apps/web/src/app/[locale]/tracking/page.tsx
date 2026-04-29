import { prisma } from '@ketopath/db';
import { redirect } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { Masthead } from '@/components/masthead';
import { getServerSession } from '@/lib/auth';

import { fetchProfile } from '../profile/actions';

import { fetchTodayCheckIn, fetchWeightEntries } from './actions';
import { DailyCheckIn } from './daily-check-in';
import { WeightEntryForm } from './weight-entry-form';
import { WeightHistory } from './weight-history';

type ProfileLike = {
  weightGoalKg?: number;
  alertWeightKg?: number | null;
} | null;

export default async function TrackingPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const session = await getServerSession();
  if (!session?.user) redirect('/sign-in');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { disclaimerAcceptedAt: true, profile: { select: { id: true } } },
  });
  if (!user?.disclaimerAcceptedAt) redirect('/welcome');
  if (!user.profile) redirect('/onboarding');

  const [entries, profile, todayCheckIn] = await Promise.all([
    fetchWeightEntries(),
    fetchProfile(),
    fetchTodayCheckIn(),
  ]);

  return (
    <TrackingPageContent
      entries={entries}
      profile={profile as ProfileLike}
      todayCheckIn={todayCheckIn}
    />
  );
}

function TrackingPageContent({
  entries,
  profile,
  todayCheckIn,
}: {
  entries: Awaited<ReturnType<typeof fetchWeightEntries>>;
  profile: ProfileLike;
  todayCheckIn: Awaited<ReturnType<typeof fetchTodayCheckIn>>;
}) {
  const t = useTranslations('Tracking');
  const latest = entries[0] ?? null;
  const goalKg = typeof profile?.weightGoalKg === 'number' ? profile.weightGoalKg : null;
  const alertKg = typeof profile?.alertWeightKg === 'number' ? profile.alertWeightKg : null;
  const alertActive = alertKg != null && latest != null && latest.weightKg >= alertKg;

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-6 sm:px-10">
      <Masthead issueLabel="N. 06 — Tracking" />
      <main className="py-12 sm:py-16">
        <p className="editorial-eyebrow animate-fade-up">Capitolo VI</p>
        <h1 className="font-display text-display text-ink animate-fade-up mt-3 font-medium leading-[0.95] tracking-tight [animation-delay:120ms]">
          {t('title')}
          <span className="text-pomodoro">.</span>
        </h1>
        <p className="font-display text-ink-soft animate-fade-up mt-6 max-w-2xl text-xl italic leading-snug [animation-delay:240ms]">
          {t('subtitle')}
        </p>

        <div className="rule animate-rule-in my-10 [animation-delay:360ms]" />

        <DailyCheckIn initial={todayCheckIn} />

        {alertActive && alertKg != null && latest != null ? (
          <aside className="border-pomodoro/40 bg-pomodoro/5 mb-10 border-2 border-dashed p-5">
            <p className="editorial-eyebrow">{t('alertEyebrow')}</p>
            <p className="font-display text-ink mt-3 text-base leading-snug">
              {t('alertMessage', {
                current: latest.weightKg.toFixed(1),
                threshold: alertKg.toFixed(1),
              })}
            </p>
            <p className="font-display text-ink-soft mt-2 text-sm italic leading-snug">
              {t('alertHint')}
            </p>
          </aside>
        ) : null}

        <div className="grid gap-12 md:grid-cols-12">
          <section className="animate-fade-up [animation-delay:300ms] md:col-span-7">
            <p className="editorial-eyebrow mb-6">{t('newEntry')}</p>
            <WeightEntryForm latest={latest} />
          </section>
          <aside className="md:border-ink/15 animate-fade-up [animation-delay:420ms] md:col-span-5 md:border-l md:pl-10">
            <p className="editorial-eyebrow mb-6">{t('history')}</p>
            <WeightHistory entries={entries} goalKg={goalKg} />
          </aside>
        </div>
      </main>
    </div>
  );
}
