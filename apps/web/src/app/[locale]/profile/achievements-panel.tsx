'use client';

import { ACHIEVEMENTS } from '@ketopath/shared';
import { useTranslations } from 'next-intl';

import type { UnlockedAchievement } from './achievements-actions';

const ITALIAN_DATE = new Intl.DateTimeFormat('it-IT', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function AchievementsPanel({ unlocked }: { unlocked: UnlockedAchievement[] }) {
  const t = useTranslations('Achievements');
  const map = new Map(unlocked.map((u) => [u.key, u.unlockedAt]));
  const total = ACHIEVEMENTS.length;
  const got = unlocked.length;

  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <p className="editorial-eyebrow">{t('eyebrow')}</p>
        <h2 className="font-display text-ink text-3xl font-medium leading-tight tracking-tight">
          {t('title')}
        </h2>
        <p className="font-display text-ink-soft max-w-xl text-base italic leading-snug">
          {t('subtitle', { got, total })}
        </p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2">
        {ACHIEVEMENTS.map((a) => {
          const at = map.get(a.key);
          const unlockedDate = at ? ITALIAN_DATE.format(new Date(at)) : null;
          return (
            <li
              key={a.key}
              className={`group flex flex-col gap-2 border p-5 transition-colors ${
                at ? 'border-pomodoro/40 bg-carta-light' : 'border-ink/15 bg-transparent'
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className={`font-mono text-[10px] uppercase tracking-widest ${
                    at ? 'text-pomodoro' : 'text-ink-dim'
                  }`}
                >
                  {t(`category.${a.category}`)}
                </span>
                {at ? (
                  <span className="text-ink-soft font-mono text-[10px] tracking-widest">
                    {unlockedDate}
                  </span>
                ) : (
                  <span className="text-ink-dim font-mono text-[10px] uppercase tracking-widest">
                    {t('locked')}
                  </span>
                )}
              </div>
              <p
                className={`font-display text-xl font-medium leading-tight ${
                  at ? 'text-ink' : 'text-ink-dim'
                }`}
              >
                {t(`key.${a.key}.title`)}
              </p>
              <p
                className={`font-display text-sm italic leading-snug ${
                  at ? 'text-ink-soft' : 'text-ink-dim'
                }`}
              >
                {t(`key.${a.key}.hint`)}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
