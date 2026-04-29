'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';

import { saveTodayCheckIn, type DailyCheckInRow } from './actions';

export function DailyCheckIn({ initial }: { initial: DailyCheckInRow | null }) {
  const t = useTranslations('Tracking');
  const [energy, setEnergy] = useState<number>(initial?.energy ?? 5);
  const [sleep, setSleep] = useState<number>(initial?.sleep ?? 5);
  const [hunger, setHunger] = useState<number>(initial?.hunger ?? 5);
  const [mood, setMood] = useState<number>(initial?.mood ?? 5);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState<boolean>(initial != null);

  function save(): void {
    startTransition(async () => {
      const result = await saveTodayCheckIn({ energy, sleep, hunger, mood });
      if (result.ok) {
        setSaved(true);
        window.setTimeout(() => setSaved(false), 2500);
      }
    });
  }

  return (
    <section className="border-ink/15 bg-carta-light/40 mb-10 border p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="editorial-eyebrow">{t('checkInEyebrow')}</p>
          <p className="font-display text-ink mt-2 text-base leading-snug">{t('checkInTitle')}</p>
        </div>
        {initial ? (
          <span className="text-ink-soft font-mono text-[10px] uppercase tracking-widest">
            {t('checkInAlreadyDone')}
          </span>
        ) : null}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
        <Slider label={t('energy')} value={energy} onChange={setEnergy} />
        <Slider label={t('sleep')} value={sleep} onChange={setSleep} />
        <Slider label={t('hunger')} value={hunger} onChange={setHunger} />
        <Slider label={t('mood')} value={mood} onChange={setMood} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={save} disabled={pending} size="sm">
          {pending ? t('saving') : initial ? t('checkInUpdate') : t('checkInSave')}
        </Button>
        {saved && !pending ? (
          <span className="font-display text-oliva text-sm italic" role="status">
            {t('checkInSaved')}
          </span>
        ) : null}
      </div>
    </section>
  );
}

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="editorial-eyebrow">{label}</p>
        <p className="text-ink font-mono text-sm tabular-nums">{value}/10</p>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full cursor-pointer accent-current"
      />
    </div>
  );
}
