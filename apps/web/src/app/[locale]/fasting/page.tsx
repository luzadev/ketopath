import { prisma } from '@ketopath/db';
import { redirect } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { CursorGlow } from '@/components/cursor-glow';
import { Masthead } from '@/components/masthead';
import { getServerSession } from '@/lib/auth';

import { fetchFastEvents, fetchFastingPause, type FastingPauseStatus } from './actions';
import { FastHistory } from './fast-history';
import { FastTimer } from './fast-timer';
import { FastingPauseToggle } from './fasting-pause-toggle';

export default async function FastingPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const session = await getServerSession();
  if (!session?.user) redirect('/sign-in');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { disclaimerAcceptedAt: true },
  });
  if (!user?.disclaimerAcceptedAt) redirect('/welcome');

  const [events, pauseStatus] = await Promise.all([fetchFastEvents(), fetchFastingPause()]);
  const active = events.find((e) => e.status === 'IN_PROGRESS') ?? null;
  const history = events.filter((e) => e.id !== active?.id);

  return <FastingPageContent active={active} history={history} pauseStatus={pauseStatus} />;
}

function FastingPageContent({
  active,
  history,
  pauseStatus,
}: {
  active: Awaited<ReturnType<typeof fetchFastEvents>>[number] | null;
  history: Awaited<ReturnType<typeof fetchFastEvents>>;
  pauseStatus: FastingPauseStatus;
}) {
  const t = useTranslations('Fasting');

  return (
    <div className="relative">
      <div className="min-h-screen w-full px-6 sm:px-10 lg:px-16 xl:px-24">
        <Masthead issueLabel="N. 07 — Digiuno" />
        <main className="relative overflow-hidden pb-24 pt-10 sm:pt-12">
          <CursorGlow color="hsl(var(--pomodoro))" size={520} />
          <div
            aria-hidden
            className="mesh-blob mesh-blob--pomodoro animate-float-y -right-32 top-12 h-[28rem] w-[28rem] opacity-50"
          />
          <div
            aria-hidden
            className="mesh-blob mesh-blob--oro animate-float-x -left-24 top-72 h-72 w-72 opacity-40"
          />
          <span
            aria-hidden
            className="font-display text-stroke-thin text-chapter pointer-events-none absolute -right-4 -top-12 select-none italic"
          >
            VII
          </span>
          <div
            aria-hidden
            className="pointer-events-none absolute right-0 top-32 hidden md:block"
            style={{ writingMode: 'vertical-rl' }}
          >
            <p className="text-ink-soft font-mono text-xs uppercase tracking-[0.4em]">
              Capitolo VII — Digiuno
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

          <div className="rule animate-rule-in relative my-12 [animation-delay:360ms]" />

          <div className="relative">
            <FastingPauseToggle initial={pauseStatus} />

            <FastTimer active={active} />

            <div className="animate-fade-up mt-16 [animation-delay:540ms]">
              <p className="editorial-eyebrow mb-6">{t('historyTitle')}</p>
              <FastHistory events={history} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
