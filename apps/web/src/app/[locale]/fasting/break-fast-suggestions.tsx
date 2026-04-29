'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';

import { fetchBreakFastSuggestions, type BreakFastSuggestion } from './actions';

export function BreakFastSuggestionsBlock({ fastEventId }: { fastEventId: string }) {
  const t = useTranslations('Fasting');
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<BreakFastSuggestion[] | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(): void {
    if (!items && !pending) {
      startTransition(async () => {
        const list = await fetchBreakFastSuggestions(fastEventId);
        setItems(list);
        setOpen(true);
      });
    } else {
      setOpen((v) => !v);
    }
  }

  return (
    <div className="pl-7">
      <button
        type="button"
        onClick={toggle}
        className="text-ink-soft decoration-pomodoro hover:text-ink font-mono text-[10px] uppercase tracking-widest underline decoration-[1.5px] underline-offset-[5px] transition-colors"
      >
        {pending ? t('working') : open ? t('breakFastHide') : t('breakFastShow')}
      </button>
      {open && items ? (
        <div className="mt-3">
          {items.length === 0 ? (
            <p className="font-display text-ink-dim text-sm italic">{t('breakFastEmpty')}</p>
          ) : (
            <ul className="space-y-2">
              {items.map((s) => (
                <li
                  key={s.id}
                  className="border-ink/10 flex items-baseline justify-between gap-3 border-b pb-2"
                >
                  <Link
                    href={`/recipes/${s.id}`}
                    className="font-display text-ink hover:text-pomodoro text-sm leading-snug transition-colors"
                  >
                    {s.name}
                  </Link>
                  <span className="text-ink-dim font-mono text-[10px] uppercase tracking-widest">
                    {Math.round(s.kcal)} kcal · {s.prepMinutes} min
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
