import { prisma } from '@ketopath/db';
import { redirect } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

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
    <div className="mx-auto min-h-screen max-w-5xl px-6 sm:px-10">
      <Masthead issueLabel="N. 07 — Digiuno" />
      <main className="py-12 sm:py-16">
        <p className="editorial-eyebrow animate-fade-up">Capitolo VII</p>
        <h1 className="font-display text-display text-ink animate-fade-up mt-3 font-medium leading-[0.95] tracking-tight [animation-delay:120ms]">
          {t('title')}
          <span className="text-pomodoro">.</span>
        </h1>
        <p className="font-display text-ink-soft animate-fade-up mt-6 max-w-2xl text-xl italic leading-snug [animation-delay:240ms]">
          {t('subtitle')}
        </p>

        <div className="rule animate-rule-in my-10 [animation-delay:360ms]" />

        <FastingPauseToggle initial={pauseStatus} />

        <FastTimer active={active} />

        <div className="animate-fade-up mt-16 [animation-delay:540ms]">
          <p className="editorial-eyebrow mb-6">{t('historyTitle')}</p>
          <FastHistory events={history} />
        </div>
      </main>
    </div>
  );
}
