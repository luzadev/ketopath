'use client';

import { computeAdherence } from '@ketopath/shared';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';

import {
  regenerateSlot,
  swapSlotRecipe,
  toggleConsumed,
  toggleFreeMeal,
  type CurrentPlan,
  type PlanSlot,
} from './actions';

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

function aggregateMacros(slots: PlanSlot[]): {
  kcal: number;
  proteinG: number;
  fatG: number;
  netCarbG: number;
} {
  return slots.reduce(
    (acc, s) => {
      // Per i free meal usiamo una stima fissa kcal e azzeriamo i macros
      // (non li conosciamo davvero) — il PRD parla di "compensazione" non di
      // tracking puntuale del pasto libero.
      if (s.isFreeMeal) {
        return {
          kcal: acc.kcal + FREE_MEAL_DEFAULT_KCAL,
          proteinG: acc.proteinG,
          fatG: acc.fatG,
          netCarbG: acc.netCarbG,
        };
      }
      if (!s.selected) return acc;
      return {
        kcal: acc.kcal + s.selected.kcal,
        proteinG: acc.proteinG + s.selected.proteinG,
        fatG: acc.fatG + s.selected.fatG,
        netCarbG: acc.netCarbG + s.selected.netCarbG,
      };
    },
    { kcal: 0, proteinG: 0, fatG: 0, netCarbG: 0 },
  );
}

const FREE_MEAL_DEFAULT_KCAL = 750;

export function PlanWeek({ plan }: { plan: CurrentPlan }) {
  const t = useTranslations('Plan');

  const byDay = new Map<number, PlanSlot[]>();
  for (const slot of plan.slots) {
    if (!byDay.has(slot.dayOfWeek)) byDay.set(slot.dayOfWeek, []);
    byDay.get(slot.dayOfWeek)!.push(slot);
  }

  const isPhase3 = plan.currentPhase === 'MAINTENANCE';
  const weekTotals = aggregateMacros(plan.slots);
  const activeDays = Array.from(byDay.values()).filter((s) => s.length > 0).length;
  const weekAvg =
    activeDays > 0
      ? {
          kcal: Math.round(weekTotals.kcal / activeDays),
          proteinG: Math.round(weekTotals.proteinG / activeDays),
          fatG: Math.round(weekTotals.fatG / activeDays),
          netCarbG: Math.round(weekTotals.netCarbG / activeDays),
        }
      : { kcal: 0, proteinG: 0, fatG: 0, netCarbG: 0 };

  const adherence = computeAdherence(
    plan.slots.map((s) => ({
      dayOfWeek: s.dayOfWeek,
      consumed: s.consumed,
      isFreeMeal: s.isFreeMeal,
    })),
    new Date(plan.weekStart + 'T00:00:00'),
  );

  return (
    <div className="space-y-14">
      <section className="border-ink/15 bg-carta-light/40 grid grid-cols-2 gap-x-8 gap-y-4 border p-5 sm:grid-cols-5">
        <MacroSummary label={t('avgKcal')} value={weekAvg.kcal} unit="kcal" big />
        <MacroSummary label={t('avgProtein')} value={weekAvg.proteinG} unit="g" />
        <MacroSummary label={t('avgFat')} value={weekAvg.fatG} unit="g" />
        <MacroSummary label={t('avgNetCarb')} value={weekAvg.netCarbG} unit="g" />
        <div className="flex flex-col gap-1">
          <span className="editorial-eyebrow">{t('adherence')}</span>
          <span className="text-ink font-mono text-3xl font-medium tabular-nums">
            {adherence.pastSlots === 0 ? '—' : `${Math.round(adherence.rate * 100)}%`}
          </span>
          {adherence.pastSlots > 0 ? (
            <span className="text-ink-soft font-mono text-[10px] uppercase tracking-widest">
              {adherence.consumedSlots}/{adherence.pastSlots}
            </span>
          ) : null}
        </div>
      </section>

      {DAY_KEYS.map((dayKey, idx) => {
        const slots = (byDay.get(idx) ?? []).sort(
          (a, b) => MEAL_ORDER.indexOf(a.meal) - MEAL_ORDER.indexOf(b.meal),
        );
        const dayMacros = aggregateMacros(slots);
        // Nessuno slot → giorno di digiuno completo (ESE_24).
        const isFastingDay = slots.length === 0;
        // Solo CENA con dailyKcal ridotto → giorno "leggero" del 5:2.
        const isLightDay = !isFastingDay && slots.length === 1 && slots[0].meal === 'CENA';

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
                {isFastingDay ? (
                  <span className="font-display text-ink-dim ml-3 text-base italic">
                    · {t('fastingDay')}
                  </span>
                ) : isLightDay ? (
                  <span className="font-display text-ink-dim ml-3 text-base italic">
                    · {t('lightDay')}
                  </span>
                ) : null}
              </h2>
              <span className="text-ink-soft font-mono text-[11px] uppercase tracking-widest">
                {isFastingDay
                  ? '— kcal'
                  : `${Math.round(dayMacros.kcal)} kcal · P ${Math.round(dayMacros.proteinG)} · G ${Math.round(dayMacros.fatG)} · C ${Math.round(dayMacros.netCarbG)}`}
              </span>
            </header>
            {isFastingDay ? (
              <p className="font-display text-ink-soft text-base italic leading-snug">
                {t('fastingDayHint')}
              </p>
            ) : (
              <div className="divide-ink/10 grid grid-cols-1 divide-y sm:grid-cols-2 sm:gap-x-8 sm:divide-y-0 lg:grid-cols-4 lg:gap-x-6">
                {slots.map((slot, slotIdx) => (
                  <SlotCard key={slot.id} slot={slot} index={slotIdx} canFreeMeal={isPhase3} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

const MEAL_ROMAN = ['I', 'II', 'III', 'IV'];

function SlotCard({
  slot,
  index,
  canFreeMeal,
}: {
  slot: PlanSlot;
  index: number;
  canFreeMeal: boolean;
}) {
  const t = useTranslations('Plan');
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function swap(recipeId: string) {
    startTransition(async () => {
      await swapSlotRecipe(slot.id, recipeId);
      setOpen(false);
    });
  }

  function regenerate() {
    startTransition(async () => {
      await regenerateSlot(slot.id);
      setOpen(false);
    });
  }

  function freeMeal() {
    startTransition(async () => {
      await toggleFreeMeal(slot.id);
      setOpen(false);
    });
  }

  function consume() {
    startTransition(async () => {
      await toggleConsumed(slot.id);
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={consume}
            disabled={pending}
            aria-pressed={slot.consumed}
            aria-label={slot.consumed ? t('consumedUndo') : t('consumedMark')}
            title={slot.consumed ? t('consumedUndo') : t('consumedMark')}
            className={`font-mono text-xs leading-none transition-colors disabled:opacity-40 ${
              slot.consumed ? 'text-oliva' : 'text-ink-dim hover:text-oliva'
            }`}
          >
            ✓
          </button>
          {canFreeMeal ? (
            <button
              type="button"
              onClick={freeMeal}
              disabled={pending}
              aria-label={slot.isFreeMeal ? t('freeMealUndo') : t('freeMealMark')}
              title={slot.isFreeMeal ? t('freeMealUndo') : t('freeMealMark')}
              className={`font-mono text-xs leading-none transition-colors disabled:opacity-40 ${
                slot.isFreeMeal ? 'text-pomodoro' : 'text-ink-dim hover:text-pomodoro'
              }`}
            >
              ☆
            </button>
          ) : null}
          {!slot.isFreeMeal ? (
            <button
              type="button"
              onClick={regenerate}
              disabled={pending}
              aria-label={t('regenerateSlot')}
              title={t('regenerateSlot')}
              className="text-ink-dim hover:text-pomodoro font-mono text-xs leading-none transition-colors disabled:opacity-40"
            >
              ↻
            </button>
          ) : null}
        </div>
      </header>
      {slot.isFreeMeal ? (
        <>
          <p className="font-display text-pomodoro text-lg font-medium italic leading-tight">
            {t('freeMealLabel')}
          </p>
          <p className="text-ink-soft font-mono text-xs tracking-tight">
            ~{FREE_MEAL_DEFAULT_KCAL}{' '}
            <span className="font-display text-[10px] italic">kcal stimate</span>
          </p>
        </>
      ) : slot.selected ? (
        <Link
          href={`/recipes/${slot.selected.id}`}
          className="font-display text-ink decoration-pomodoro hover:decoration-ink text-lg font-medium leading-tight underline decoration-[1.5px] underline-offset-[5px] transition-colors"
        >
          {slot.selected.name}
        </Link>
      ) : (
        <p className="font-display text-ink-soft text-lg italic leading-tight">{t('noRecipe')}</p>
      )}
      {!slot.isFreeMeal && slot.selected ? (
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
                  <Link
                    href={`/recipes/${alt.id}`}
                    className="font-display text-ink hover:text-pomodoro text-sm leading-snug transition-colors"
                  >
                    {alt.name}{' '}
                    <span className="text-ink-dim font-mono text-[10px]">
                      {Math.round(alt.kcal)} kcal
                    </span>
                  </Link>
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

function MacroSummary({
  label,
  value,
  unit,
  big = false,
}: {
  label: string;
  value: number;
  unit: string;
  big?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="editorial-eyebrow">{label}</span>
      <span
        className={`font-mono tabular-nums ${
          big ? 'text-ink text-3xl font-medium' : 'text-ink text-2xl'
        }`}
      >
        {value}
        <span className="font-display text-ink-soft ml-1 text-xs italic">{unit}</span>
      </span>
    </div>
  );
}
