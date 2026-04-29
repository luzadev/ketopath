import { useTranslations } from 'next-intl';

import type { FastEventRow } from './actions';

const PROTOCOL_LABEL: Record<FastEventRow['protocol'], string> = {
  FOURTEEN_TEN: '14:10',
  SIXTEEN_EIGHT: '16:8',
  EIGHTEEN_SIX: '18:6',
  TWENTY_FOUR: '20:4',
  ESE_24: 'ESE 24h',
  FIVE_TWO: '5:2',
};

const DATE_FMT = new Intl.DateTimeFormat('it-IT', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function durationLabel(startIso: string, endIso: string | null): string {
  if (!endIso) return '—';
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${pad(m)}m`;
}

function formatDate(iso: string): string {
  return DATE_FMT.format(new Date(iso));
}

export function FastHistory({ events }: { events: FastEventRow[] }) {
  const t = useTranslations('Fasting');

  if (events.length === 0) {
    return (
      <p className="font-display text-ink-dim max-w-md text-base italic leading-relaxed">
        {t('emptyHistory')}
      </p>
    );
  }

  const completed = events.filter((e) => e.status === 'COMPLETED');
  const totalHours =
    completed.reduce(
      (sum, e) =>
        sum + ((e.endedAt ? new Date(e.endedAt).getTime() : 0) - new Date(e.startedAt).getTime()),
      0,
    ) / 3_600_000;

  return (
    <div className="space-y-8">
      <div className="border-ink/10 grid grid-cols-2 gap-6 border-y py-5 sm:grid-cols-3">
        <Stat label={t('statCompleted')} value={String(completed.length)} />
        <Stat label={t('statTotal')} value={`${totalHours.toFixed(1)} h`} />
        <Stat label={t('statSessions')} value={String(events.length)} />
      </div>
      <ul className="space-y-3">
        {events.slice(0, 12).map((e) => (
          <li
            key={e.id}
            className="border-ink/10 grid grid-cols-[auto_1fr_auto] items-baseline gap-4 border-b pb-3 last:border-b-0"
          >
            <span className="font-display text-pomodoro text-base italic tabular-nums">
              {PROTOCOL_LABEL[e.protocol]}
            </span>
            <div>
              <p className="font-display text-ink text-base leading-tight">
                {formatDate(e.startedAt)}
              </p>
              <p className="text-ink-dim mt-0.5 font-mono text-[10px] uppercase tracking-widest">
                {t(`status.${e.status}`)}
              </p>
            </div>
            <p className="text-ink font-mono text-sm tabular-nums">
              {durationLabel(e.startedAt, e.endedAt)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="editorial-eyebrow">{label}</p>
      <p className="text-ink mt-2 font-mono text-2xl font-medium tabular-nums leading-none tracking-tight">
        {value}
      </p>
    </div>
  );
}
