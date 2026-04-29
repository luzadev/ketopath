// PRD §5.2 — Trend del peso e proiezione data obiettivo.
//
// Regressione lineare semplice (least squares) sui WeightEntry. Output:
// pendenza in kg/settimana e intercetta. Da lì calcoliamo la data
// proiettata al raggiungimento dell'obiettivo, sotto vincoli di sicurezza
// (slope di segno coerente, max 12 mesi di proiezione).

export interface WeightPoint {
  date: Date | string;
  weightKg: number;
}

export interface WeightTrend {
  slopeKgPerWeek: number;
  interceptKg: number;
  /** Numero di punti utilizzati. */
  n: number;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function toDate(d: Date | string): Date {
  return typeof d === 'string' ? new Date(d) : d;
}

/**
 * Regressione lineare con t in settimane dal primo punto. Servono almeno 2
 * punti distinti — altrimenti slope=0 e intercept=peso unico.
 */
export function linearWeightTrend(points: ReadonlyArray<WeightPoint>): WeightTrend | null {
  if (points.length === 0) return null;
  const sorted = [...points].sort((a, b) => toDate(a.date).getTime() - toDate(b.date).getTime());
  const first = sorted[0]!;
  if (sorted.length === 1) {
    return { slopeKgPerWeek: 0, interceptKg: first.weightKg, n: 1 };
  }

  const t0 = toDate(first.date).getTime();
  const xs = sorted.map((p) => (toDate(p.date).getTime() - t0) / WEEK_MS);
  const ys = sorted.map((p) => p.weightKg);
  const n = xs.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((acc, x, i) => acc + x * (ys[i] ?? 0), 0);
  const sumXX = xs.reduce((acc, x) => acc + x * x, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) {
    return { slopeKgPerWeek: 0, interceptKg: sumY / n, n };
  }
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slopeKgPerWeek: slope, interceptKg: intercept, n };
}

/**
 * Data proiettata al raggiungimento di `goalKg`. Ritorna null se:
 *  - slope è zero, o
 *  - slope ha segno opposto a quello necessario (es. perdere peso ma il trend cresce), o
 *  - la data risulta oltre 12 mesi (rumorosa).
 */
export function projectGoalDate(args: {
  currentKg: number;
  goalKg: number;
  slopeKgPerWeek: number;
  now?: Date;
}): Date | null {
  const { currentKg, goalKg, slopeKgPerWeek, now = new Date() } = args;
  if (slopeKgPerWeek === 0) return null;
  const delta = goalKg - currentKg;
  if (delta === 0) return now;
  // Direzioni opposte → trend non sta andando verso l'obiettivo.
  if (Math.sign(delta) !== Math.sign(slopeKgPerWeek)) return null;
  const weeks = delta / slopeKgPerWeek;
  if (weeks <= 0) return null;
  const ms = weeks * WEEK_MS;
  // Cap a 12 mesi di proiezione realistica (52 settimane).
  if (weeks > 52) return null;
  return new Date(now.getTime() + ms);
}
