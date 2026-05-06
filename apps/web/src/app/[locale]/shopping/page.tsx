import { prisma } from '@ketopath/db';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { CursorGlow } from '@/components/cursor-glow';
import { Masthead } from '@/components/masthead';
import { Button } from '@/components/ui/button';
import { getServerSession } from '@/lib/auth';

import { fetchShoppingList, type ShoppingList } from './actions';
import { ShoppingChecklist } from './shopping-checklist';

export default async function ShoppingPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const session = await getServerSession();
  if (!session?.user) redirect('/sign-in');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { disclaimerAcceptedAt: true, profile: { select: { id: true } } },
  });
  if (!user?.disclaimerAcceptedAt) redirect('/welcome');
  if (!user.profile) redirect('/onboarding');

  const list = await fetchShoppingList();

  return <ShoppingPageContent list={list} />;
}

const ITALIAN_DATE = new Intl.DateTimeFormat('it-IT', {
  day: 'numeric',
  month: 'long',
});

function formatWeek(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${ITALIAN_DATE.format(start)} – ${ITALIAN_DATE.format(end)}`;
}

function ShoppingPageContent({ list }: { list: ShoppingList | null }) {
  const t = useTranslations('Shopping');

  const totalItems = list?.groups.reduce((sum, g) => sum + g.items.length, 0) ?? 0;
  const estimatedCost = list?.groups.reduce(
    (sum, g) =>
      sum + g.items.reduce((s, it) => s + (it.priceAvgEur != null ? estimateLineCost(it) : 0), 0),
    0,
  );

  return (
    <div className="relative">
      <div className="mx-auto min-h-screen max-w-7xl px-6 sm:px-10">
        <Masthead issueLabel="N. 09 — La spesa" />
        <main className="relative overflow-hidden pb-24 pt-10 sm:pt-12">
          <CursorGlow color="hsl(var(--oliva))" size={520} />
          <div
            aria-hidden
            className="mesh-blob mesh-blob--oliva animate-float-y -right-32 top-12 h-[28rem] w-[28rem] opacity-50"
          />
          <div
            aria-hidden
            className="mesh-blob mesh-blob--pomodoro animate-float-x -left-24 top-72 h-72 w-72 opacity-35"
          />
          <span
            aria-hidden
            className="font-display text-stroke-thin text-chapter pointer-events-none absolute -right-4 -top-12 select-none italic"
          >
            IX
          </span>
          <div
            aria-hidden
            className="pointer-events-none absolute right-0 top-32 hidden md:block"
            style={{ writingMode: 'vertical-rl' }}
          >
            <p className="text-ink-soft font-mono text-xs uppercase tracking-[0.4em]">
              Capitolo IX — La spesa
            </p>
          </div>
          <h1 className="font-display text-mega bleed-left animate-fade-up relative mt-8 font-medium [animation-delay:120ms]">
            <span className="text-ink block">
              {t('title')}
              <span className="text-pomodoro">.</span>
            </span>
          </h1>

          <div className="relative mt-12 grid grid-cols-12 items-end gap-6">
            <p className="font-display text-ink-soft animate-fade-up col-span-12 max-w-2xl text-2xl italic leading-snug [animation-delay:240ms] md:col-span-7 md:col-start-2">
              {list ? formatWeek(list.plan.weekStart) : t('noPlan')}
            </p>
            {list ? (
              <aside className="animate-fade-up col-span-12 [animation-delay:360ms] md:col-span-3 md:col-start-10 md:text-right">
                <p className="editorial-eyebrow">{t('totalLabel')}</p>
                <p className="font-display text-ink mt-2 font-mono text-3xl tabular-nums">
                  {totalItems}
                </p>
                {typeof estimatedCost === 'number' && estimatedCost > 0 ? (
                  <p className="text-ink-soft mt-3 font-mono text-xs uppercase tracking-widest">
                    {t('estimatedCost')}{' '}
                    <span className="text-ink not-italic">€ {estimatedCost.toFixed(2)}</span>
                  </p>
                ) : null}
              </aside>
            ) : (
              <div className="animate-fade-up col-span-12 [animation-delay:360ms] md:col-span-3 md:col-start-10 md:text-right">
                <Button asChild size="lg">
                  <Link href="/plan">{t('viewPlan')}</Link>
                </Button>
              </div>
            )}
          </div>

          <div className="rule animate-rule-in relative my-12 [animation-delay:420ms]" />

          {list ? (
            <div className="animate-fade-up relative [animation-delay:480ms]">
              <ShoppingChecklist list={list} />
            </div>
          ) : null}
        </main>

        <div className="rule-thick" />
      </div>
    </div>
  );
}

function estimateLineCost(line: {
  quantity: number;
  unit: string;
  priceAvgEur: number | null;
}): number {
  if (line.priceAvgEur == null) return 0;
  // Prezzo medio è espresso al kg/litro/cad (vedi seed-ingredients).
  // Heuristica semplice: g/ml → kg/litro (÷1000); pz / cucchiaio / cucchiaino → conta uno.
  if (line.unit === 'g' || line.unit === 'ml') {
    return (line.quantity / 1000) * line.priceAvgEur;
  }
  return line.quantity * line.priceAvgEur;
}
