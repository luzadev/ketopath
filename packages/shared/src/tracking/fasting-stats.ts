// PRD §5.3 — Statistiche del digiuno: streak, ore totali, completion rate.
//
// Funzione pura, riutilizzabile da UI e API. Lavora su array di eventi già
// caricati dal DB.

export interface FastingEventLike {
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABORTED';
  startedAt: Date | string;
  endedAt: Date | string | null;
  targetDuration: number; // minuti
}

export interface FastingStats {
  weeklyHours: number; // ore di digiuno completato negli ultimi 7 giorni
  monthlyHours: number; // ultimi 30 giorni
  currentStreak: number; // giorni consecutivi con almeno una sessione COMPLETED
  longestStreak: number; // record di sempre
  completionRate: number; // [0, 1] su sessioni terminate (COMPLETED+ABORTED)
  totalSessions: number;
  completedSessions: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function toDate(d: Date | string): Date {
  return typeof d === 'string' ? new Date(d) : d;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function durationMs(e: FastingEventLike): number {
  const start = toDate(e.startedAt).getTime();
  const end = e.endedAt ? toDate(e.endedAt).getTime() : start;
  return Math.max(0, end - start);
}

export function computeFastingStats(
  events: ReadonlyArray<FastingEventLike>,
  now: Date = new Date(),
): FastingStats {
  const completed = events.filter((e) => e.status === 'COMPLETED');
  const finished = events.filter((e) => e.status !== 'IN_PROGRESS');

  const oneWeekAgo = now.getTime() - 7 * DAY_MS;
  const oneMonthAgo = now.getTime() - 30 * DAY_MS;
  const weeklyMs = completed
    .filter((e) => toDate(e.startedAt).getTime() >= oneWeekAgo)
    .reduce((sum, e) => sum + durationMs(e), 0);
  const monthlyMs = completed
    .filter((e) => toDate(e.startedAt).getTime() >= oneMonthAgo)
    .reduce((sum, e) => sum + durationMs(e), 0);

  // Streak: contiamo giorni consecutivi (anchored a oggi) in cui esiste
  // almeno una sessione COMPLETED.
  const completedDays = new Set(completed.map((e) => dayKey(toDate(e.startedAt))));
  let currentStreak = 0;
  for (let offset = 0; offset < 365; offset++) {
    const candidate = new Date(now.getTime() - offset * DAY_MS);
    if (completedDays.has(dayKey(candidate))) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Longest streak storico: scansiona i giorni completati ordinati e conta
  // run consecutive.
  const sortedDays = Array.from(completedDays).sort();
  let longestStreak = 0;
  let run = 0;
  let prevTs: number | null = null;
  for (const day of sortedDays) {
    const ts = new Date(day + 'T00:00:00Z').getTime();
    if (prevTs != null && ts - prevTs === DAY_MS) {
      run++;
    } else {
      run = 1;
    }
    if (run > longestStreak) longestStreak = run;
    prevTs = ts;
  }

  return {
    weeklyHours: Number((weeklyMs / 3_600_000).toFixed(1)),
    monthlyHours: Number((monthlyMs / 3_600_000).toFixed(1)),
    currentStreak,
    longestStreak,
    completionRate: finished.length === 0 ? 0 : completed.length / finished.length,
    totalSessions: events.length,
    completedSessions: completed.length,
  };
}
