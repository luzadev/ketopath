import { prisma } from '@ketopath/db';
import { redirect } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { CursorGlow } from '@/components/cursor-glow';
import { Masthead } from '@/components/masthead';
import { getServerSession } from '@/lib/auth';

import { fetchProfile } from '../profile/actions';

import { fetchTodayCheckIn, fetchWeightEntries } from './actions';
import { DailyCheckIn } from './daily-check-in';
import { WeightEntryForm } from './weight-entry-form';
import { WeightHistory } from './weight-history';

type ProfileLike = {
  weightGoalKg?: number;
  weightStartKg?: number;
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
  const startKg = typeof profile?.weightStartKg === 'number' ? profile.weightStartKg : null;
  const alertKg = typeof profile?.alertWeightKg === 'number' ? profile.alertWeightKg : null;
  const alertActive = alertKg != null && latest != null && latest.weightKg >= alertKg;

  return (
    <div className="relative">
      <div className="mx-auto min-h-screen max-w-7xl px-6 sm:px-10">
        <Masthead issueLabel="N. 06 — Tracking" />
        <main className="relative overflow-hidden pb-24 pt-10 sm:pt-12">
          <CursorGlow color="hsl(var(--oro))" size={520} />
          <div
            aria-hidden
            className="mesh-blob mesh-blob--oro animate-float-y -right-32 top-12 h-[28rem] w-[28rem] opacity-50"
          />
          <div
            aria-hidden
            className="mesh-blob mesh-blob--oliva animate-float-x -left-24 top-72 h-72 w-72 opacity-40"
          />
          <span
            aria-hidden
            className="font-display text-stroke-thin text-chapter pointer-events-none absolute -right-4 -top-12 select-none italic"
          >
            VI
          </span>
          <div
            aria-hidden
            className="pointer-events-none absolute right-0 top-32 hidden md:block"
            style={{ writingMode: 'vertical-rl' }}
          >
            <p className="text-ink-soft font-mono text-xs uppercase tracking-[0.4em]">
              Capitolo VI — Tracking
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

          <p className="animate-fade-up relative mt-6 [animation-delay:300ms] md:ml-[16.66%]">
            <a
              href="/api/tracking-export"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-soft decoration-pomodoro hover:text-ink font-mono text-[11px] uppercase tracking-widest underline decoration-[1.5px] underline-offset-[5px] transition-colors"
            >
              {t('exportPdf')} ↗
            </a>
          </p>

          <div className="rule animate-rule-in relative my-12 [animation-delay:360ms]" />

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

          <div className="relative grid gap-12 md:grid-cols-12">
            <section className="animate-fade-up [animation-delay:300ms] md:col-span-7">
              <p className="editorial-eyebrow mb-6">{t('newEntry')}</p>
              <WeightEntryForm latest={latest} />
            </section>
            <aside className="md:border-ink/15 animate-fade-up [animation-delay:420ms] md:col-span-5 md:border-l md:pl-10">
              <p className="editorial-eyebrow mb-6">{t('history')}</p>
              <WeightHistory entries={entries} goalKg={goalKg} startKg={startKg} />
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
