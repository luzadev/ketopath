import { describe, expect, it } from 'vitest';

import { computeFastingStats, type FastingEventLike } from './fasting-stats.js';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

function ev(
  daysAgo: number,
  hours: number,
  status: FastingEventLike['status'] = 'COMPLETED',
): FastingEventLike {
  const now = new Date('2026-04-29T12:00:00Z');
  const start = new Date(now.getTime() - daysAgo * DAY_MS);
  return {
    status,
    startedAt: start.toISOString(),
    endedAt:
      status === 'IN_PROGRESS' ? null : new Date(start.getTime() + hours * HOUR_MS).toISOString(),
    targetDuration: hours * 60,
  };
}

const NOW = new Date('2026-04-29T12:00:00Z');

describe('computeFastingStats', () => {
  it('vuoto → tutti zeri', () => {
    const s = computeFastingStats([], NOW);
    expect(s).toEqual({
      weeklyHours: 0,
      monthlyHours: 0,
      currentStreak: 0,
      longestStreak: 0,
      completionRate: 0,
      totalSessions: 0,
      completedSessions: 0,
    });
  });

  it('weeklyHours somma solo sessioni completate negli ultimi 7 giorni', () => {
    const s = computeFastingStats([ev(0, 16), ev(2, 18), ev(10, 24)], NOW);
    expect(s.weeklyHours).toBeCloseTo(34, 5);
    expect(s.monthlyHours).toBeCloseTo(58, 5);
  });

  it('currentStreak: 3 giorni consecutivi con sessione completed', () => {
    const s = computeFastingStats([ev(0, 16), ev(1, 16), ev(2, 16), ev(4, 16)], NOW);
    expect(s.currentStreak).toBe(3);
  });

  it('currentStreak salta se manca un giorno', () => {
    const s = computeFastingStats([ev(0, 16), ev(2, 16)], NOW);
    expect(s.currentStreak).toBe(1);
  });

  it('completionRate ignora sessioni in corso', () => {
    const s = computeFastingStats(
      [ev(0, 16, 'COMPLETED'), ev(1, 8, 'ABORTED'), ev(2, 0, 'IN_PROGRESS')],
      NOW,
    );
    expect(s.completionRate).toBeCloseTo(0.5, 5);
  });

  it('longestStreak storico', () => {
    const events = [ev(0, 16), ev(1, 16), ev(2, 16), ev(3, 16), ev(10, 16), ev(11, 16)];
    const s = computeFastingStats(events, NOW);
    expect(s.longestStreak).toBeGreaterThanOrEqual(4);
  });
});
