'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';

import { setFastingPause, type FastingPauseStatus } from './actions';

const FORMATTER = new Intl.DateTimeFormat('it-IT', {
  weekday: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

export function FastingPauseToggle({ initial }: { initial: FastingPauseStatus }) {
  const t = useTranslations('Fasting');
  const [paused, setPaused] = useState<boolean>(initial.paused);
  const [until, setUntil] = useState<string | null>(initial.fastingPausedUntil);
  const [pending, startTransition] = useTransition();

  function pause(): void {
    startTransition(async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(6, 0, 0, 0);
      const result = await setFastingPause(tomorrow);
      if (result.ok) {
        setPaused(true);
        setUntil(tomorrow.toISOString());
      }
    });
  }

  function resume(): void {
    startTransition(async () => {
      const result = await setFastingPause(null);
      if (result.ok) {
        setPaused(false);
        setUntil(null);
      }
    });
  }

  if (paused && until) {
    return (
      <aside className="border-pomodoro/30 bg-pomodoro/5 mb-10 flex flex-wrap items-baseline justify-between gap-4 border-2 border-dashed p-5">
        <div>
          <p className="editorial-eyebrow">{t('pauseEyebrow')}</p>
          <p className="font-display text-ink mt-2 text-base leading-snug">
            {t('pauseUntil', { time: FORMATTER.format(new Date(until)) })}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={resume} disabled={pending}>
          {pending ? t('saving') : t('pauseResume')}
        </Button>
      </aside>
    );
  }

  return (
    <div className="mb-10 flex justify-end">
      <button
        type="button"
        onClick={pause}
        disabled={pending}
        className="text-ink-soft decoration-pomodoro hover:text-ink font-mono text-[11px] uppercase tracking-widest underline decoration-[1.5px] underline-offset-[5px] transition-colors disabled:opacity-40"
      >
        {pending ? t('saving') : t('pauseToday')}
      </button>
    </div>
  );
}
