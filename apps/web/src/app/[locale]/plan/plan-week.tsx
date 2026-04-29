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

export function PlanWeek({ plan }: { plan: CurrentPlan }) {
  const t = useTranslations('Plan');

  // Group slots by day for quick lookup.
  const byDay = new Map<number, PlanSlot[]>();
  for (const slot of plan.slots) {
    if (!byDay.has(slot.dayOfWeek)) byDay.set(slot.dayOfWeek, []);
    byDay.get(slot.dayOfWeek)!.push(slot);
  }

  return (
    <div className="space-y-6">
      {DAY_KEYS.map((dayKey, idx) => {
        const slots = (byDay.get(idx) ?? []).sort(
          (a, b) => MEAL_ORDER.indexOf(a.meal) - MEAL_ORDER.indexOf(b.meal),
        );
        const dayKcal = slots.reduce((sum, s) => sum + (s.selected?.kcal ?? 0), 0);
        return (
          <section key={dayKey} aria-labelledby={`day-${dayKey}`}>
            <header className="mb-2 flex items-baseline justify-between">
              <h2 id={`day-${dayKey}`} className="text-lg font-semibold">
                {t(`days.${dayKey}`)}
              </h2>
              <span className="text-muted-foreground text-xs">
                {t('dayTotal', { kcal: Math.round(dayKcal) })}
              </span>
            </header>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {slots.map((slot) => (
                <SlotCard key={slot.id} slot={slot} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function SlotCard({ slot }: { slot: PlanSlot }) {
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
    <article className="border-border bg-card flex flex-col rounded-md border p-3">
      <p className="text-muted-foreground text-xs uppercase tracking-wider">
        {t(`meals.${slot.meal}`)}
      </p>
      <p className="mt-1 text-sm font-medium leading-tight">
        {slot.selected?.name ?? t('noRecipe')}
      </p>
      {slot.selected ? (
        <p className="text-muted-foreground mt-1 text-xs">{Math.round(slot.selected.kcal)} kcal</p>
      ) : null}
      {slot.alternatives.length > 0 ? (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-primary text-xs hover:underline"
          >
            {open ? t('hideAlternatives') : t('showAlternatives', { n: slot.alternatives.length })}
          </button>
          {open ? (
            <ul className="mt-2 space-y-1">
              {slot.alternatives.map((alt) => (
                <li key={alt.id} className="flex items-center justify-between gap-2">
                  <span className="text-xs">
                    {alt.name}{' '}
                    <span className="text-muted-foreground">({Math.round(alt.kcal)} kcal)</span>
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
