'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import type { ShoppingLine, ShoppingList } from './actions';

const ROMAN = [
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
  'X',
  'XI',
  'XII',
  'XIII',
  'XIV',
  'XV',
  'XVI',
  'XVII',
  'XVIII',
  'XIX',
  'XX',
];

function storageKey(planId: string): string {
  return `ketopath:shopping:${planId}`;
}

function lineKey(line: ShoppingLine): string {
  return `${line.ingredientId}::${line.unit}`;
}

export function ShoppingChecklist({ list }: { list: ShoppingList }) {
  const t = useTranslations('Shopping');
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  // Load locally persisted check state per piano.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey(list.plan.id));
      if (raw) setChecked(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      /* no-op */
    }
  }, [list.plan.id]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey(list.plan.id), JSON.stringify(checked));
    } catch {
      /* no-op */
    }
  }, [checked, list.plan.id]);

  const totalCount = useMemo(
    () => list.groups.reduce((s, g) => s + g.items.length, 0),
    [list.groups],
  );
  const checkedCount = useMemo(() => Object.values(checked).filter(Boolean).length, [checked]);

  function toggle(line: ShoppingLine): void {
    const key = lineKey(line);
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="space-y-12">
      <p className="font-display text-ink-soft text-base italic leading-snug">
        {t('checked', { n: checkedCount, total: totalCount })}
      </p>

      {list.groups.map((group, groupIdx) => (
        <section
          key={group.category}
          aria-labelledby={`group-${group.category}`}
          className="space-y-5"
        >
          <header className="border-ink/15 grid items-baseline gap-2 border-b pb-3 sm:grid-cols-[auto_1fr_auto]">
            <span className="font-display text-pomodoro text-xl font-medium italic leading-none">
              {ROMAN[groupIdx] ?? groupIdx + 1}
            </span>
            <h2
              id={`group-${group.category}`}
              className="font-display text-ink text-2xl font-medium leading-none tracking-tight sm:text-3xl"
            >
              {t.has(`categoryLabel.${group.category}`)
                ? t(`categoryLabel.${group.category}`)
                : group.category}
            </h2>
            <span className="text-ink-soft font-mono text-[11px] uppercase tracking-widest">
              {t('groupSize', { n: group.items.length })}
            </span>
          </header>

          <ul className="divide-ink/10 divide-y">
            {group.items.map((line) => {
              const key = lineKey(line);
              const isChecked = !!checked[key];
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => toggle(line)}
                    aria-pressed={isChecked}
                    className="hover:bg-ink/5 group grid w-full grid-cols-[1.25rem_1fr_auto] items-baseline gap-4 py-4 pr-2 text-left transition-colors"
                  >
                    <span
                      aria-hidden
                      className={`border-ink h-3 w-3 translate-y-1 border-[1.5px] transition-colors ${
                        isChecked ? 'bg-ink' : 'bg-transparent'
                      }`}
                    />
                    <span className="flex flex-col gap-1">
                      <span
                        className={`font-display text-ink text-lg leading-tight transition-colors ${
                          isChecked ? 'text-ink-dim line-through' : ''
                        }`}
                      >
                        {line.name}
                      </span>
                      <span className="text-ink-soft font-mono text-[10px] uppercase tracking-widest">
                        {t('fromRecipes', { names: line.recipes.join(' · ') })}
                      </span>
                    </span>
                    <span
                      className={`text-ink font-mono text-sm tabular-nums transition-colors ${
                        isChecked ? 'text-ink-dim' : ''
                      }`}
                    >
                      {formatQuantity(line.quantity)} {line.unit}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function formatQuantity(q: number): string {
  if (Number.isInteger(q)) return String(q);
  if (q === 0.25) return '¼';
  if (q === 0.5) return '½';
  if (q === 0.75) return '¾';
  return q.toFixed(1);
}
