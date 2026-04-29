import { prisma } from '@ketopath/db';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { Masthead } from '@/components/masthead';
import { Button } from '@/components/ui/button';
import { getServerSession } from '@/lib/auth';

import { fetchCurrentPlan, regeneratePlan } from './actions';
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
  if (!user.profile) redirect('/profile');

  const plan = await fetchCurrentPlan();

  return <PlanPageContent plan={plan} />;
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

function PlanPageContent({ plan }: { plan: Awaited<ReturnType<typeof fetchCurrentPlan>> }) {
  const t = useTranslations('Plan');

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-6 sm:px-10">
      <Masthead issueLabel="N. 05 — Cucina" />
      <main className="py-12 sm:py-16">
        <div className="grid items-end gap-6 md:grid-cols-12">
          <div className="md:col-span-8">
            <p className="editorial-eyebrow animate-fade-up">Capitolo V</p>
            <h1 className="font-display text-display text-ink animate-fade-up mt-3 font-medium leading-[0.95] tracking-tight [animation-delay:120ms]">
              {t('title')}
              <span className="text-pomodoro">.</span>
            </h1>
            <p className="font-display text-ink-soft animate-fade-up mt-5 max-w-2xl text-xl italic leading-snug [animation-delay:240ms]">
              {plan ? formatWeek(plan.weekStart) : t('noPlan')}
            </p>
          </div>
          <div className="animate-fade-up flex flex-col items-stretch gap-3 [animation-delay:360ms] md:col-span-4 md:items-end">
            <form action={regeneratePlan}>
              <Button type="submit" variant={plan ? 'outline' : 'default'} size="lg">
                {plan ? t('regenerate') : t('generate')}
              </Button>
            </form>
            {plan ? (
              <Link
                href="/shopping"
                className="text-ink-soft decoration-pomodoro hover:text-ink font-mono text-[11px] uppercase tracking-widest underline decoration-[1.5px] underline-offset-[5px] transition-colors"
              >
                Lista della spesa →
              </Link>
            ) : null}
          </div>
        </div>

        <div className="rule animate-rule-in my-10 [animation-delay:420ms]" />

        {plan ? (
          <div className="animate-fade-up [animation-delay:480ms]">
            <PlanWeek plan={plan} />
          </div>
        ) : null}
      </main>
    </div>
  );
}
