import { prisma } from '@ketopath/db';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { CursorGlow } from '@/components/cursor-glow';
import { Masthead } from '@/components/masthead';
import { Button } from '@/components/ui/button';
import { getServerSession } from '@/lib/auth';

import { fetchCurrentPlan, fetchDailyTarget, regeneratePlan } from './actions';
import { PlanWeek } from './plan-week';

export default async function PlanPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const session = await getServerSession();
  if (!session?.user) redirect('/sign-in');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { disclaimerAcceptedAt: true, profile: { select: { id: true } } },
  });
  if (!user?.disclaimerAcceptedAt) redirect('/welcome');
  if (!user.profile) redirect('/onboarding');

  const [plan, dailyTarget] = await Promise.all([fetchCurrentPlan(), fetchDailyTarget()]);

  return <PlanPageContent plan={plan} dailyTarget={dailyTarget} />;
}

const ITALIAN_DATE = new Intl.DateTimeFormat('it-IT', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function formatWeek(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startStr = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long' }).format(
    start,
  );
  const endStr = ITALIAN_DATE.format(end);
  return `${startStr} – ${endStr}`;
}

function PlanPageContent({
  plan,
  dailyTarget,
}: {
  plan: Awaited<ReturnType<typeof fetchCurrentPlan>>;
  dailyTarget: Awaited<ReturnType<typeof fetchDailyTarget>>;
}) {
  const t = useTranslations('Plan');

  return (
    <div className="relative">
      <div className="mx-auto min-h-screen max-w-7xl px-6 sm:px-10">
        <Masthead issueLabel="N. 05 — Cucina" />
        <main className="relative overflow-hidden py-10 sm:py-12">
          <CursorGlow color="hsl(var(--pomodoro))" size={520} />
          <div
            aria-hidden
            className="mesh-blob mesh-blob--pomodoro animate-float-x -left-32 top-12 h-[28rem] w-[28rem] opacity-50"
          />
          <div
            aria-hidden
            className="mesh-blob mesh-blob--oliva animate-float-y -right-32 top-64 h-80 w-80 opacity-40"
          />

          {/* Chapter "V" gigante in stroke */}
          <span
            aria-hidden
            className="font-display text-stroke-thin text-chapter pointer-events-none absolute -right-4 -top-12 select-none italic"
          >
            V
          </span>

          {/* Eyebrow verticale destra */}
          <div
            aria-hidden
            className="pointer-events-none absolute right-0 top-32 hidden md:block"
            style={{ writingMode: 'vertical-rl' }}
          >
            <p className="text-ink-soft font-mono text-xs uppercase tracking-[0.4em]">
              Capitolo V — Cucina
            </p>
          </div>

          {/* Titolo che sborda */}
          <h1 className="font-display text-mega bleed-left animate-fade-up relative mt-12 font-medium [animation-delay:120ms]">
            <span className="text-ink block italic">
              {t('title')}
              <span className="text-pomodoro">.</span>
            </span>
          </h1>

          <div className="relative mt-12 grid grid-cols-12 items-end gap-6">
            <div className="col-span-12 md:col-span-7 md:col-start-2">
              <p className="font-display text-ink-soft animate-fade-up text-2xl italic leading-snug [animation-delay:240ms]">
                {plan ? formatWeek(plan.weekStart) : t('noPlan')}
              </p>
              <div className="animate-fade-up mt-5 flex flex-wrap items-baseline gap-x-6 gap-y-2 [animation-delay:300ms]">
                {plan?.fastingProtocol ? (
                  <span className="flex items-baseline gap-2">
                    <span className="editorial-eyebrow">{t('window')}</span>
                    <span className="font-display text-pomodoro text-base italic">
                      {t(`protocolLabel.${plan.fastingProtocol}`)}
                    </span>
                  </span>
                ) : null}
                {plan?.currentPhase === 'TRANSITION' && plan.phase2Week ? (
                  <span className="flex items-baseline gap-2">
                    <span className="editorial-eyebrow">{t('phase2Eyebrow')}</span>
                    <span className="font-display text-oliva text-base italic">
                      {t('phase2Week', { n: plan.phase2Week })}
                    </span>
                  </span>
                ) : plan?.currentPhase === 'MAINTENANCE' ? (
                  <span className="editorial-eyebrow">{t('phase3Eyebrow')}</span>
                ) : null}
              </div>
            </div>
            <div className="animate-fade-up col-span-12 flex flex-col items-stretch gap-3 [animation-delay:360ms] md:col-span-4 md:col-start-9 md:items-end">
              <form action={regeneratePlan}>
                <Button type="submit" variant={plan ? 'outline' : 'default'} size="lg">
                  {plan ? t('regenerate') : t('generate')}
                </Button>
              </form>
              {plan ? (
                <>
                  <Link
                    href="/shopping"
                    className="text-ink-soft decoration-pomodoro hover:text-ink font-mono text-[11px] uppercase tracking-widest underline decoration-[1.5px] underline-offset-[5px] transition-colors"
                  >
                    {t('linkShopping')} →
                  </Link>
                  <a
                    href="/api/plan-export"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink-soft decoration-pomodoro hover:text-ink font-mono text-[11px] uppercase tracking-widest underline decoration-[1.5px] underline-offset-[5px] transition-colors"
                  >
                    {t('exportPdf')} ↗
                  </a>
                </>
              ) : null}
            </div>
          </div>

          <div className="rule animate-rule-in my-12 [animation-delay:420ms]" />

          {plan ? (
            <div className="animate-fade-up relative [animation-delay:480ms]">
              <PlanWeek plan={plan} dailyTarget={dailyTarget} />
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
