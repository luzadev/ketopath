'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';

import { swapSlotRecipe, type CurrentPlan, type PlanSlot } from './actions';

const MEAL_ORDER: PlanSlot['meal'][] = ['COLAZIONE', 'PRANZO', 'SPUNTINO', 'CENA'];
const DAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;
const DAY_NUMERAL = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

export function PlanWeek({ plan }: { plan: CurrentPlan }) {
  const t = useTranslations('Plan');

  const byDay = new Map<number, PlanSlot[]>();
  for (const slot of plan.slots) {
    if (!byDay.has(slot.dayOfWeek)) byDay.set(slot.dayOfWeek, []);
    byDay.get(slot.dayOfWeek)!.push(slot);
  }

  return (
    <div className="space-y-14">
      {DAY_KEYS.map((dayKey, idx) => {
        const slots = (byDay.get(idx) ?? []).sort(
          (a, b) => MEAL_ORDER.indexOf(a.meal) - MEAL_ORDER.indexOf(b.meal),
        );
        const dayKcal = slots.reduce((sum, s) => sum + (s.selected?.kcal ?? 0), 0);
        return (
          <section key={dayKey} aria-labelledby={`day-${dayKey}`} className="space-y-5">
            <header className="border-ink/15 grid items-baseline gap-2 border-b pb-3 sm:grid-cols-[auto_1fr_auto]">
              <span className="font-display text-pomodoro text-xl font-medium italic leading-none">
                {DAY_NUMERAL[idx]}
              </span>
              <h2
                id={`day-${dayKey}`}
                className="font-display text-ink text-2xl font-medium leading-none tracking-tight sm:text-3xl"
              >
                {t(`days.${dayKey}`)}
              </h2>
              <span className="text-ink-soft font-mono text-[11px] uppercase tracking-widest">
                {t('dayTotal', { kcal: Math.round(dayKcal) })}
              </span>
            </header>
            <div className="divide-ink/10 grid grid-cols-1 divide-y sm:grid-cols-2 sm:gap-x-8 sm:divide-y-0 lg:grid-cols-4 lg:gap-x-6">
              {slots.map((slot, slotIdx) => (
                <SlotCard key={slot.id} slot={slot} index={slotIdx} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

const MEAL_ROMAN = ['I', 'II', 'III', 'IV'];

function SlotCard({ slot, index }: { slot: PlanSlot; index: number }) {
  const t = useTranslations('Plan');
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function swap(recipeId: string) {
    startTransition(async () => {
      await swapSlotRecipe(slot.id, recipeId);
      setOpen(false);
    });
  }

  return (
    <article className="group relative flex flex-col gap-3 py-5 sm:py-2">
      <header className="flex items-baseline justify-between gap-3">
        <p className="editorial-eyebrow flex items-baseline gap-2">
          <span className="font-display not-italic-children text-pomodoro text-base italic">
            {MEAL_ROMAN[index]}
          </span>
          <span>{t(`meals.${slot.meal}`)}</span>
        </p>
      </header>
      <p className="font-display text-ink text-lg font-medium leading-tight">
        {slot.selected?.name ?? t('noRecipe')}
      </p>
      {slot.selected ? (
        <p className="text-ink-soft font-mono text-xs tracking-tight">
          {Math.round(slot.selected.kcal)}{' '}
          <span className="font-display text-[10px] italic">kcal</span>
        </p>
      ) : null}
      {slot.alternatives.length > 0 ? (
        <div className="mt-1">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-ink-soft decoration-pomodoro hover:text-ink font-mono text-[10px] uppercase tracking-widest underline decoration-[1.5px] underline-offset-[5px] transition-colors"
          >
            {open ? t('hideAlternatives') : t('showAlternatives', { n: slot.alternatives.length })}
          </button>
          {open ? (
            <ul className="border-ink/15 mt-3 space-y-2 border-t pt-3">
              {slot.alternatives.map((alt) => (
                <li key={alt.id} className="flex items-baseline justify-between gap-2">
                  <span className="font-display text-ink text-sm leading-snug">
                    {alt.name}{' '}
                    <span className="text-ink-dim font-mono text-[10px]">
                      {Math.round(alt.kcal)} kcal
                    </span>
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => swap(alt.id)}
                  >
                    {t('swap')}
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
