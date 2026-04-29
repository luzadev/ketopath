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

const STORE_MODE_KEY = 'ketopath:shopping:storeMode';

interface ExtraItem {
  id: string;
  name: string;
  checked: boolean;
}

function extrasKey(planId: string): string {
  return `ketopath:shopping:extras:${planId}`;
}

function lineKey(line: ShoppingLine): string {
  return `${line.ingredientId}::${line.unit}`;
}

export function ShoppingChecklist({ list }: { list: ShoppingList }) {
  const t = useTranslations('Shopping');
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [storeMode, setStoreMode] = useState(false);
  const [extras, setExtras] = useState<ExtraItem[]>([]);
  const [extraInput, setExtraInput] = useState('');

  // Load locally persisted check state per piano.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey(list.plan.id));
      if (raw) setChecked(JSON.parse(raw) as Record<string, boolean>);
      const sm = window.localStorage.getItem(STORE_MODE_KEY);
      if (sm === '1') setStoreMode(true);
      const rawExtras = window.localStorage.getItem(extrasKey(list.plan.id));
      if (rawExtras) setExtras(JSON.parse(rawExtras) as ExtraItem[]);
    } catch {
      /* no-op */
    }
  }, [list.plan.id]);

  useEffect(() => {
    try {
      window.localStorage.setItem(extrasKey(list.plan.id), JSON.stringify(extras));
    } catch {
      /* no-op */
    }
  }, [extras, list.plan.id]);

  function addExtra(): void {
    const name = extraInput.trim();
    if (!name) return;
    setExtras((prev) => [
      ...prev,
      { id: `extra_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name, checked: false },
    ]);
    setExtraInput('');
  }
  function toggleExtra(id: string): void {
    setExtras((prev) => prev.map((e) => (e.id === id ? { ...e, checked: !e.checked } : e)));
  }
  function removeExtra(id: string): void {
    setExtras((prev) => prev.filter((e) => e.id !== id));
  }

  function toggleStoreMode(): void {
    setStoreMode((v) => {
      const next = !v;
      try {
        window.localStorage.setItem(STORE_MODE_KEY, next ? '1' : '0');
      } catch {
        /* no-op */
      }
      return next;
    });
  }

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

  // PRD §6.5 — totale stimato sui rimanenti (non spuntati). Heuristica
  // identica a shopping/page.tsx: g/ml ÷1000, altrimenti ×1.
  const remainingCost = useMemo(() => {
    let total = 0;
    for (const g of list.groups) {
      for (const it of g.items) {
        if (checked[lineKey(it)]) continue;
        if (it.priceAvgEur == null) continue;
        if (it.unit === 'g' || it.unit === 'ml') {
          total += (it.quantity / 1000) * it.priceAvgEur;
        } else {
          total += it.quantity * it.priceAvgEur;
        }
      }
    }
    return total;
  }, [list.groups, checked]);

  function toggle(line: ShoppingLine): void {
    const key = lineKey(line);
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className={storeMode ? 'space-y-16 text-lg' : 'space-y-12'}>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <p className="font-display text-ink-soft text-base italic leading-snug">
          {t('checked', { n: checkedCount, total: totalCount })}
        </p>
        <div className="flex items-baseline gap-4">
          {remainingCost > 0 ? (
            <p className="text-ink font-mono text-sm tabular-nums">
              {t('remainingCost')}{' '}
              <span className="font-display text-ink-soft text-xs italic">€</span>{' '}
              {remainingCost.toFixed(2)}
            </p>
          ) : null}
          <button
            type="button"
            onClick={toggleStoreMode}
            aria-pressed={storeMode}
            className={`font-mono text-[11px] uppercase tracking-widest underline decoration-[1.5px] underline-offset-[5px] transition-colors ${
              storeMode ? 'text-pomodoro' : 'text-ink-soft hover:text-ink decoration-pomodoro'
            }`}
          >
            {storeMode ? t('storeModeOn') : t('storeModeOff')}
          </button>
        </div>
      </div>

      {list.groups.map((group, groupIdx) => (
        <section
          key={group.category}
          aria-labelledby={`group-${group.category}`}
          className="space-y-5"
        >
          <header className="border-ink/15 grid items-baseline gap-2 border-b pb-3 sm:grid-cols-[auto_1fr_auto]">
            <span
              className={`font-display text-pomodoro font-medium italic leading-none ${
                storeMode ? 'text-3xl' : 'text-xl'
              }`}
            >
              {ROMAN[groupIdx] ?? groupIdx + 1}
            </span>
            <h2
              id={`group-${group.category}`}
              className={`font-display text-ink font-medium leading-none tracking-tight ${
                storeMode ? 'text-4xl sm:text-5xl' : 'text-2xl sm:text-3xl'
              }`}
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
            {[...group.items]
              .sort((a, b) => {
                // PRD §6.5 — gli articoli spuntati vanno in fondo.
                const ac = checked[lineKey(a)] ? 1 : 0;
                const bc = checked[lineKey(b)] ? 1 : 0;
                if (ac !== bc) return ac - bc;
                return a.name.localeCompare(b.name, 'it');
              })
              .map((line) => {
                const key = lineKey(line);
                const isChecked = !!checked[key];
                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => toggle(line)}
                      aria-pressed={isChecked}
                      className={`hover:bg-ink/5 group grid w-full items-baseline gap-4 text-left transition-colors ${
                        storeMode
                          ? 'grid-cols-[1.75rem_1fr_auto] py-6 pr-3'
                          : 'grid-cols-[1.25rem_1fr_auto] py-4 pr-2'
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`border-ink translate-y-1 border-[1.5px] transition-colors ${
                          isChecked ? 'bg-ink' : 'bg-transparent'
                        } ${storeMode ? 'h-5 w-5' : 'h-3 w-3'}`}
                      />
                      <span className="flex flex-col gap-1">
                        <span
                          className={`font-display text-ink leading-tight transition-colors ${
                            isChecked ? 'text-ink-dim line-through' : ''
                          } ${storeMode ? 'text-2xl' : 'text-lg'}`}
                        >
                          {line.name}
                        </span>
                        <span
                          className={`text-ink-soft font-mono uppercase tracking-widest ${
                            storeMode ? 'text-xs' : 'text-[10px]'
                          }`}
                        >
                          {t('fromRecipes', { names: line.recipes.join(' · ') })}
                        </span>
                      </span>
                      <span
                        className={`text-ink font-mono tabular-nums transition-colors ${
                          isChecked ? 'text-ink-dim' : ''
                        } ${storeMode ? 'text-xl' : 'text-sm'}`}
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

      <section className="space-y-5">
        <header className="border-ink/15 border-b pb-3">
          <h2
            className={`font-display text-ink font-medium leading-none tracking-tight ${
              storeMode ? 'text-4xl sm:text-5xl' : 'text-2xl sm:text-3xl'
            }`}
          >
            {t('extrasTitle')}
          </h2>
          <p className="font-display text-ink-soft mt-2 text-sm italic leading-snug">
            {t('extrasHint')}
          </p>
        </header>

        <div className="flex gap-3">
          <input
            type="text"
            value={extraInput}
            onChange={(e) => setExtraInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addExtra();
              }
            }}
            maxLength={80}
            placeholder={t('extrasPlaceholder')}
            className={`border-ink/30 focus:border-ink font-display text-ink w-full border-b bg-transparent py-2 outline-none ${
              storeMode ? 'text-xl' : 'text-base'
            }`}
          />
          <button
            type="button"
            onClick={addExtra}
            disabled={!extraInput.trim()}
            className="text-ink-soft decoration-pomodoro hover:text-ink font-mono text-[11px] uppercase tracking-widest underline decoration-[1.5px] underline-offset-[5px] transition-colors disabled:opacity-40"
          >
            {t('extrasAdd')}
          </button>
        </div>

        {extras.length > 0 ? (
          <ul className="divide-ink/10 divide-y">
            {[...extras]
              .sort((a, b) => {
                if (a.checked !== b.checked) return a.checked ? 1 : -1;
                return a.name.localeCompare(b.name, 'it');
              })
              .map((it) => (
                <li
                  key={it.id}
                  className={`grid items-baseline gap-4 ${
                    storeMode
                      ? 'grid-cols-[1.75rem_1fr_auto] py-6'
                      : 'grid-cols-[1.25rem_1fr_auto] py-4'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleExtra(it.id)}
                    aria-pressed={it.checked}
                    aria-label={t('extrasToggle')}
                    className={`border-ink translate-y-1 border-[1.5px] transition-colors ${
                      it.checked ? 'bg-ink' : 'hover:bg-ink/30 bg-transparent'
                    } ${storeMode ? 'h-5 w-5' : 'h-3 w-3'}`}
                  />
                  <span
                    className={`font-display text-ink leading-tight transition-colors ${
                      it.checked ? 'text-ink-dim line-through' : ''
                    } ${storeMode ? 'text-2xl' : 'text-lg'}`}
                  >
                    {it.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeExtra(it.id)}
                    aria-label={t('extrasRemove')}
                    title={t('extrasRemove')}
                    className="text-ink-dim hover:text-pomodoro font-mono text-xs leading-none transition-colors"
                  >
                    ×
                  </button>
                </li>
              ))}
          </ul>
        ) : null}
      </section>
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
