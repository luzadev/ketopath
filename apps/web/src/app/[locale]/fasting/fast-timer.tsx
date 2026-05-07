'use client';

import { FASTING_PROTOCOLS, PROTOCOL_DEFAULT_MINUTES } from '@ketopath/shared';
import { useTranslations } from 'next-intl';
import { useEffect, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { endFast, startFast, updateFastSymptoms, type FastEventRow } from './actions';

type Protocol = (typeof FASTING_PROTOCOLS)[number];

const PROTOCOL_LABEL: Record<Protocol, string> = {
  FOURTEEN_TEN: '14:10',
  SIXTEEN_EIGHT: '16:8',
  EIGHTEEN_SIX: '18:6',
  TWENTY_FOUR: '20:4',
  ESE_24: 'ESE 24h',
  FIVE_TWO: '5:2',
};

// PRD §5.3 — fasi metaboliche del digiuno (ore di digiuno trascorse).
function metabolicPhaseKey(hoursElapsed: number): string {
  if (hoursElapsed < 4) return 'postprandial';
  if (hoursElapsed < 12) return 'glycogenolysis';
  if (hoursElapsed < 18) return 'lipolysis';
  if (hoursElapsed < 24) return 'ketogenesis';
  return 'autophagy';
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatElapsed(seconds: number): string {
  const sec = Math.max(0, Math.floor(seconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function FastTimer({ active }: { active: FastEventRow | null }) {
  if (active) {
    return <ActiveTimer event={active} />;
  }
  return <ProtocolSelector />;
}

function ActiveTimer({ event }: { event: FastEventRow }) {
  const t = useTranslations('Fasting');
  const startMs = new Date(event.startedAt).getTime();
  const targetMs = event.targetDuration * 60 * 1000;
  const [now, setNow] = useState<number>(() => Date.now());
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsedMs = Math.max(0, now - startMs);
  const remainingMs = Math.max(0, targetMs - elapsedMs);
  const reached = elapsedMs >= targetMs;
  const progress = Math.min(1, elapsedMs / targetMs);
  const hoursElapsed = elapsedMs / 1000 / 3600;
  const phase = metabolicPhaseKey(hoursElapsed);

  function complete() {
    startTransition(async () => {
      await endFast(event.id, false);
    });
  }
  function abort() {
    if (typeof window !== 'undefined' && !window.confirm(t('confirmAbort'))) return;
    startTransition(async () => {
      await endFast(event.id, true);
    });
  }

  return (
    <section className="grid gap-12 md:grid-cols-12">
      <div className="animate-fade-up [animation-delay:300ms] md:col-span-7">
        <p className="editorial-eyebrow">
          {t('activeBadge')} · {PROTOCOL_LABEL[event.protocol]}
        </p>
        <p className="text-ink mt-6 font-mono text-[clamp(3rem,9vw,6.25rem)] font-medium tabular-nums leading-[0.9] tracking-tight">
          {formatElapsed(elapsedMs / 1000)}
        </p>
        <p className="font-display text-ink-soft mt-3 text-xl italic leading-snug">
          {reached ? t('reached') : t('remaining', { time: formatElapsed(remainingMs / 1000) })}
        </p>
        <ProgressBar progress={progress} reached={reached} />
        <div className="mt-8 flex flex-wrap gap-3">
          <Button type="button" onClick={complete} disabled={pending} size="lg">
            {pending ? t('saving') : reached ? t('completeReached') : t('completeEarly')}
          </Button>
          <Button type="button" variant="ghost" onClick={abort} disabled={pending} size="lg">
            {t('abort')}
          </Button>
        </div>
      </div>
      <aside className="md:border-ink/15 animate-fade-up space-y-10 [animation-delay:420ms] md:col-span-5 md:border-l md:pl-10">
        <div>
          <p className="editorial-eyebrow">{t('phaseTitle')}</p>
          <p className="font-display text-pomodoro mt-4 text-2xl font-medium leading-tight">
            {t(`phases.${phase}.label`)}
          </p>
          <p className="font-display text-ink-soft mt-3 text-base italic leading-snug">
            {t(`phases.${phase}.description`)}
          </p>
          <dl className="mt-8 space-y-5 text-sm">
            <Row label={t('startedAt')} value={formatStart(event.startedAt)} />
            <Row label={t('target')} value={`${(event.targetDuration / 60).toFixed(1)} h`} />
          </dl>
        </div>
        <SymptomsDiary event={event} />
      </aside>
    </section>
  );
}

function ProtocolSelector() {
  const t = useTranslations('Fasting');
  const [protocol, setProtocol] = useState<Protocol>('SIXTEEN_EIGHT');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function start() {
    setError(null);
    startTransition(async () => {
      const result = await startFast({ protocol });
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <section className="grid gap-12 md:grid-cols-12">
      <div className="animate-fade-up [animation-delay:300ms] md:col-span-7">
        <p className="editorial-eyebrow">{t('inactiveBadge')}</p>
        <p className="font-display text-ink mt-4 text-3xl italic leading-snug sm:text-4xl">
          {t('startCallToAction')}
        </p>
        <div className="mt-10 max-w-sm space-y-3">
          <p className="editorial-eyebrow">{t('chooseProtocol')}</p>
          <Select value={protocol} onValueChange={(v) => setProtocol(v as Protocol)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FASTING_PROTOCOLS.map((p) => (
                <SelectItem key={p} value={p}>
                  {PROTOCOL_LABEL[p]} · {(PROTOCOL_DEFAULT_MINUTES[p] / 60).toFixed(0)} h
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {error ? (
            <p role="alert" className="font-display text-pomodoro text-base italic">
              {error}
            </p>
          ) : null}
          <div className="pt-4">
            <Button type="button" onClick={start} disabled={pending} size="lg" className="w-full">
              {pending ? t('starting') : t('start')}
            </Button>
          </div>
        </div>
      </div>
      <aside className="md:border-ink/15 animate-fade-up [animation-delay:420ms] md:col-span-5 md:border-l md:pl-10">
        <p className="editorial-eyebrow">{t('protocolGuideTitle')}</p>
        <ol className="font-display text-ink mt-6 space-y-5 text-base leading-snug">
          {(['FOURTEEN_TEN', 'SIXTEEN_EIGHT', 'EIGHTEEN_SIX', 'TWENTY_FOUR'] as const).map(
            (p, i) => (
              <li key={p} className="grid grid-cols-[2.5rem_1fr] gap-3">
                <span className="text-ink-dim font-mono text-xs uppercase tracking-widest">
                  {['I', 'II', 'III', 'IV'][i]}
                </span>
                <div>
                  <p className="font-medium">
                    {PROTOCOL_LABEL[p]}{' '}
                    <span className="font-display text-ink-soft italic">
                      · {t(`protocolHints.${p}.title`)}
                    </span>
                  </p>
                  <p className="text-ink-soft mt-1 text-sm leading-snug">
                    {t(`protocolHints.${p}.description`)}
                  </p>
                </div>
              </li>
            ),
          )}
        </ol>
      </aside>
    </section>
  );
}

function ProgressBar({ progress, reached }: { progress: number; reached: boolean }) {
  return (
    <div className="bg-rule mt-6 h-px w-full">
      <div
        className={`h-px origin-left transition-transform duration-700 ease-out ${
          reached ? 'bg-pomodoro' : 'bg-ink'
        }`}
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-2 items-baseline gap-3">
      <dt className="editorial-eyebrow">{label}</dt>
      <dd className="text-ink font-mono text-sm tabular-nums">{value}</dd>
    </div>
  );
}

const HOUR_FMT = new Intl.DateTimeFormat('it-IT', {
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

function formatStart(iso: string): string {
  return HOUR_FMT.format(new Date(iso));
}

function SymptomsDiary({ event }: { event: FastEventRow }) {
  const t = useTranslations('Fasting');
  const initial = (event.symptoms as Record<string, unknown> | null) ?? {};
  const [headache, setHeadache] = useState<boolean>(!!initial.headache);
  const [energy, setEnergy] = useState<number>(
    typeof initial.energy === 'number' ? initial.energy : 5,
  );
  const [hunger, setHunger] = useState<number>(
    typeof initial.hunger === 'number' ? initial.hunger : 5,
  );
  const [clarity, setClarity] = useState<number>(
    typeof initial.clarity === 'number' ? initial.clarity : 5,
  );
  const [other, setOther] = useState<string>(
    typeof initial.other === 'string' ? initial.other : '',
  );
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState<boolean>(false);

  function save(): void {
    startTransition(async () => {
      setSaved(false);
      const symptoms: Parameters<typeof updateFastSymptoms>[1] = {
        headache,
        energy,
        hunger,
        clarity,
      };
      const trimmedOther = other.trim();
      if (trimmedOther) symptoms.other = trimmedOther;
      const result = await updateFastSymptoms(event.id, symptoms);
      if (result.ok) {
        setSaved(true);
        window.setTimeout(() => setSaved(false), 2500);
      }
    });
  }

  return (
    <div className="space-y-5">
      <p className="editorial-eyebrow">{t('symptomsTitle')}</p>
      <p className="font-display text-ink-soft text-sm italic leading-snug">{t('symptomsHint')}</p>
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={headache}
          onChange={(e) => setHeadache(e.target.checked)}
          className="border-ink h-4 w-4 cursor-pointer accent-current"
        />
        <span className="font-display text-ink text-base leading-tight">
          {t('symptomHeadache')}
        </span>
      </label>
      <SymptomSlider label={t('symptomEnergy')} value={energy} onChange={setEnergy} />
      <SymptomSlider label={t('symptomHunger')} value={hunger} onChange={setHunger} />
      <SymptomSlider label={t('symptomClarity')} value={clarity} onChange={setClarity} />
      <div>
        <p className="editorial-eyebrow mb-2">{t('symptomOther')}</p>
        <textarea
          value={other}
          onChange={(e) => setOther(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder={t('symptomOtherPlaceholder')}
          className="border-ink/30 focus:border-ink font-display text-ink w-full resize-none border-b bg-transparent py-2 text-sm leading-snug outline-none"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={save} disabled={pending}>
          {pending ? t('saving') : t('symptomsSave')}
        </Button>
        {saved ? (
          <span className="font-display text-oliva text-sm italic" role="status">
            {t('symptomsSaved')}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function SymptomSlider({
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
      <div className="flex items-baseline justify-between gap-3">
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
