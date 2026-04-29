import { linearWeightTrend, projectGoalDate } from '@ketopath/shared';
import { useTranslations } from 'next-intl';

import type { WeightEntryRow } from './actions';

const MONTHS = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

function formatDate(iso: string): string {
  const [, m, d] = iso.split('-').map((p) => parseInt(p, 10));
  return `${d} ${MONTHS[(m ?? 1) - 1]}`;
}

interface SparkProps {
  values: number[];
  width?: number;
  height?: number;
}

// Tiny inline sparkline. Pure SVG, no client deps.
function Sparkline({ values, width = 280, height = 64 }: SparkProps) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 0.1);
  const stepX = width / (values.length - 1);
  const points = values
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / span) * (height - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      role="img"
      aria-label="Trend peso"
    >
      <polyline
        fill="none"
        stroke="hsl(var(--ink))"
        strokeWidth="1.25"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
      <circle
        cx={(values.length - 1) * stepX}
        cy={height - ((values[values.length - 1]! - min) / span) * (height - 8) - 4}
        r="3.5"
        fill="hsl(var(--pomodoro))"
      />
    </svg>
  );
}

const ITALIAN_DATE = new Intl.DateTimeFormat('it-IT', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function WeightHistory({
  entries,
  goalKg,
  startKg,
}: {
  entries: WeightEntryRow[];
  goalKg?: number | null;
  startKg?: number | null;
}) {
  const t = useTranslations('Tracking');
  if (entries.length === 0) {
    return (
      <p className="font-display text-ink-dim text-base italic leading-relaxed">
        {t('emptyHistory')}
      </p>
    );
  }

  // entries arrive newest-first; reverse for the trend, keep newest-first for the list.
  const trendValues = [...entries].reverse().map((e) => e.weightKg);
  const newest = entries[0]!;
  const oldest = entries[entries.length - 1]!;
  const delta = newest.weightKg - oldest.weightKg;

  const trend = linearWeightTrend(
    [...entries].reverse().map((e) => ({ date: e.date, weightKg: e.weightKg })),
  );
  const projectedDate =
    trend && goalKg != null
      ? projectGoalDate({
          currentKg: newest.weightKg,
          goalKg,
          slopeKgPerWeek: trend.slopeKgPerWeek,
        })
      : null;

  // PRD §6.4 — % del percorso. (start - current) / (start - goal).
  // Se start == goal o sign mismatch, ritorna null.
  const journeyPercent =
    startKg != null && goalKg != null && startKg !== goalKg
      ? Math.max(
          0,
          Math.min(100, Math.round(((startKg - newest.weightKg) / (startKg - goalKg)) * 100)),
        )
      : null;

  return (
    <div className="space-y-8">
      <div>
        <Sparkline values={trendValues} />
        <div className="text-ink-dim mt-2 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-widest">
          <span>{formatDate(oldest.date)}</span>
          <span>{formatDate(newest.date)}</span>
        </div>
      </div>

      <div className="border-ink/10 grid grid-cols-2 gap-6 border-y py-5 sm:grid-cols-4">
        <div>
          <p className="editorial-eyebrow">{t('current')}</p>
          <p className="text-ink mt-2 font-mono text-3xl font-medium leading-none tracking-tight">
            {newest.weightKg.toFixed(1)}
            <span className="font-display text-ink-soft ml-1 text-xs italic">kg</span>
          </p>
        </div>
        <div>
          <p className="editorial-eyebrow">{t('delta')}</p>
          <p
            className={`mt-2 font-mono text-3xl font-medium leading-none tracking-tight ${
              delta < 0 ? 'text-oliva' : delta > 0 ? 'text-pomodoro' : 'text-ink'
            }`}
          >
            {delta > 0 ? '+' : ''}
            {delta.toFixed(1)}
            <span className="font-display text-ink-soft ml-1 text-xs italic">kg</span>
          </p>
        </div>
        {trend && trend.n >= 2 ? (
          <div>
            <p className="editorial-eyebrow">{t('weeklyTrend')}</p>
            <p
              className={`mt-2 font-mono text-3xl font-medium leading-none tracking-tight ${
                trend.slopeKgPerWeek < 0
                  ? 'text-oliva'
                  : trend.slopeKgPerWeek > 0
                    ? 'text-pomodoro'
                    : 'text-ink'
              }`}
            >
              {trend.slopeKgPerWeek > 0 ? '+' : ''}
              {trend.slopeKgPerWeek.toFixed(2)}
              <span className="font-display text-ink-soft ml-1 text-xs italic">kg/sett</span>
            </p>
          </div>
        ) : null}
        {journeyPercent != null ? (
          <div>
            <p className="editorial-eyebrow">{t('journey')}</p>
            <p className="text-ink mt-2 font-mono text-3xl font-medium leading-none tracking-tight">
              {journeyPercent}
              <span className="font-display text-ink-soft ml-1 text-xs italic">%</span>
            </p>
          </div>
        ) : null}
      </div>

      {projectedDate && goalKg != null ? (
        <p className="font-display text-ink-soft text-base italic leading-snug">
          {t('projection', { kg: goalKg.toFixed(1), date: ITALIAN_DATE.format(projectedDate) })}
        </p>
      ) : null}

      <ul className="space-y-3">
        {entries.slice(0, 8).map((e) => (
          <li
            key={e.id}
            className="border-ink/10 flex items-baseline justify-between gap-4 border-b pb-2 last:border-b-0"
          >
            <div>
              <p className="font-display text-ink text-base leading-tight">{formatDate(e.date)}</p>
              {e.notes ? (
                <p className="font-display text-ink-dim mt-1 line-clamp-1 text-xs italic">
                  {e.notes}
                </p>
              ) : null}
            </div>
            <p className="text-ink font-mono text-sm tabular-nums">
              {e.weightKg.toFixed(1)}
              <span className="font-display text-ink-dim ml-1 text-[10px] italic">kg</span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
