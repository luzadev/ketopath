// PRD §5.6 — promemoria settimanale pesata.
// Cron lunedì 09:00 Europe/Rome. Mandiamo a tutti gli utenti che hanno
// il flag `weeklyWeighIn` attivo, e ripuliamo i token scaduti.

import type { ExtendedPrismaClient } from '@ketopath/db';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  notificationSettingsSchema,
  type NotificationSettings,
} from '@ketopath/shared';
import type { FastifyBaseLogger } from 'fastify';
// `node-cron` espone CommonJS: il default import è ciò che funziona a runtime.
// eslint-disable-next-line import/default
import cron from 'node-cron';
import type { ScheduledTask } from 'node-cron';

import { pushIsEnabled, sendToDevice } from './sender.js';

const WEEKLY_CRON = '0 9 * * 1'; // lunedì alle 09:00
const FASTING_CRON = '*/5 * * * *'; // ogni 5 minuti
// PRD §6.3 — orari fissi pranzo/spuntino/cena
const LUNCH_CRON = '0 13 * * *';
const SNACK_CRON = '0 16 * * *';
const DINNER_CRON = '0 19 * * *';

export interface SchedulerHandles {
  weekly: ScheduledTask;
  fasting: ScheduledTask;
  meals: ScheduledTask[];
}

export function startNotificationScheduler(
  prisma: ExtendedPrismaClient,
  log: FastifyBaseLogger,
): SchedulerHandles | null {
  if (!pushIsEnabled()) {
    log.info('[notifications] VAPID keys missing — scheduler disabled');
    return null;
  }
  // eslint-disable-next-line import/no-named-as-default-member
  const weekly = cron.schedule(
    WEEKLY_CRON,
    () => {
      void runWeeklyWeighInJob(prisma, log);
    },
    { timezone: 'Europe/Rome' },
  );
  // eslint-disable-next-line import/no-named-as-default-member
  const fasting = cron.schedule(
    FASTING_CRON,
    () => {
      void runFastingMilestonesJob(prisma, log);
    },
    { timezone: 'Europe/Rome' },
  );
  const meals: ScheduledTask[] = [
    [LUNCH_CRON, 'PRANZO'] as const,
    [SNACK_CRON, 'SPUNTINO'] as const,
    [DINNER_CRON, 'CENA'] as const,
  ].map(([expr, slot]) =>
    // eslint-disable-next-line import/no-named-as-default-member
    cron.schedule(
      expr,
      () => {
        void runMealReminderJob(prisma, log, slot);
      },
      { timezone: 'Europe/Rome' },
    ),
  );
  log.info(
    '[notifications] cron scheduled — weekly weigh-in (Mon 09:00), fasting milestones (every 5 min), meal reminders (13/16/19 daily)',
  );
  return { weekly, fasting, meals };
}

export async function runWeeklyWeighInJob(
  prisma: ExtendedPrismaClient,
  log: FastifyBaseLogger,
): Promise<{ candidates: number; sent: number; expired: number }> {
  const candidates = await prisma.user.findMany({
    where: {
      preferences: { isNot: null },
      deviceTokens: { some: {} },
    },
    select: {
      id: true,
      preferences: { select: { notificationSettings: true } },
      deviceTokens: true,
    },
  });

  let sent = 0;
  let expired = 0;
  for (const u of candidates) {
    const settings = readSettings(u.preferences?.notificationSettings ?? null);
    if (!settings.weeklyWeighIn) continue;
    for (const token of u.deviceTokens) {
      const r = await sendToDevice(token, {
        title: 'È giorno di pesata',
        body: 'Apri KetoPath per registrare il peso della settimana.',
        url: '/tracking',
      });
      if (r.ok) sent++;
      if (r.expired) {
        expired++;
        await prisma.deviceToken.delete({ where: { id: token.id } }).catch(() => {
          /* race con altra cancellazione: ignora */
        });
      }
    }
  }

  log.info(
    { candidates: candidates.length, sent, expired },
    '[notifications] weekly weigh-in job completed',
  );
  return { candidates: candidates.length, sent, expired };
}

function readSettings(value: unknown): NotificationSettings {
  if (!value || typeof value !== 'object') return DEFAULT_NOTIFICATION_SETTINGS;
  const parsed = notificationSettingsSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_NOTIFICATION_SETTINGS;
}

// PRD §5.3 — milestone per le sessioni di digiuno IN_PROGRESS.
// Pattern: ogni 5 minuti scansiona le sessioni attive e invia push per le
// milestone "scadute" non ancora notificate. `notifiedMilestones` su FastEvent
// previene duplicati. Skipping se utente in pausa (fastingPausedUntil futuro).
type Milestone =
  | 'hydration_2h'
  | 'hydration_4h'
  | 'hydration_6h'
  | 'electrolyte_18h'
  | 'ending_soon';

interface MilestoneSpec {
  key: Milestone;
  /** Vero se è il momento di notificarla data l'ora di start + target. */
  isDue: (elapsedMin: number, targetMin: number) => boolean;
  title: string;
  body: string;
}

const MILESTONES: MilestoneSpec[] = [
  {
    key: 'hydration_2h',
    isDue: (m) => m >= 120,
    title: 'Idratazione',
    body: "Bevi un bicchiere d'acqua o tè non zuccherato.",
  },
  {
    key: 'hydration_4h',
    isDue: (m) => m >= 240,
    title: 'Idratazione',
    body: "Mantieni il ritmo: un altro bicchiere d'acqua aiuta.",
  },
  {
    key: 'hydration_6h',
    isDue: (m) => m >= 360,
    title: 'Idratazione',
    body: 'Hai superato le 6 ore: bevi e prosegui.',
  },
  {
    key: 'electrolyte_18h',
    isDue: (m) => m >= 1080,
    title: 'Elettroliti',
    body: 'Sopra le 18 ore: un pizzico di sale o un brodo aiutano a evitare il calo.',
  },
  {
    key: 'ending_soon',
    isDue: (m, target) => target - m <= 30 && target - m >= 0,
    title: 'Manca poco',
    body: 'Tra 30 minuti puoi rompere il digiuno. Pianifica il primo pasto.',
  },
];

export async function runFastingMilestonesJob(
  prisma: ExtendedPrismaClient,
  log: FastifyBaseLogger,
): Promise<{ checked: number; sent: number; expired: number }> {
  const now = Date.now();
  const active = await prisma.fastEvent.findMany({
    where: { status: 'IN_PROGRESS' },
    include: {
      user: {
        select: {
          fastingPausedUntil: true,
          deviceTokens: true,
          preferences: { select: { notificationSettings: true } },
        },
      },
    },
  });

  let sent = 0;
  let expired = 0;
  for (const fast of active) {
    const settings = readSettings(fast.user.preferences?.notificationSettings ?? null);
    if (!settings.fastingMilestones) continue;
    if (fast.user.fastingPausedUntil && fast.user.fastingPausedUntil.getTime() > now) {
      continue;
    }
    const elapsedMin = (now - fast.startedAt.getTime()) / 60_000;
    const already = new Set(fast.notifiedMilestones);
    const toSend: MilestoneSpec[] = MILESTONES.filter(
      (m) => !already.has(m.key) && m.isDue(elapsedMin, fast.targetDuration),
    );
    if (toSend.length === 0) continue;
    if (fast.user.deviceTokens.length === 0) continue;

    for (const milestone of toSend) {
      for (const token of fast.user.deviceTokens) {
        const r = await sendToDevice(token, {
          title: milestone.title,
          body: milestone.body,
          url: '/fasting',
        });
        if (r.ok) sent++;
        if (r.expired) {
          expired++;
          await prisma.deviceToken.delete({ where: { id: token.id } }).catch(() => {
            /* ignora race */
          });
        }
      }
    }
    await prisma.fastEvent.update({
      where: { id: fast.id },
      data: {
        notifiedMilestones: { push: toSend.map((m) => m.key) },
      },
    });
  }

  if (sent > 0 || expired > 0) {
    log.info({ checked: active.length, sent, expired }, '[notifications] fasting milestones job');
  }
  return { checked: active.length, sent, expired };
}

// PRD §6.3 — promemoria pasti agli orari italiani standard.
// Ignoriamo gli utenti in pausa (fastingPausedUntil futuro). Per gli utenti
// con fastingProtocol attivo che esclude un pasto (es. 16:8 senza colazione),
// se il pasto richiesto è 0% nello share del giorno corrente, saltiamo.
const MEAL_COPY: Record<'PRANZO' | 'SPUNTINO' | 'CENA', { title: string; body: string }> = {
  PRANZO: {
    title: 'Ora di pranzo',
    body: "Vedi cosa c'è nel piano di oggi.",
  },
  SPUNTINO: {
    title: 'Spuntino',
    body: "Una pausa veloce: dai un'occhiata al piano.",
  },
  CENA: {
    title: 'È quasi ora di cena',
    body: 'Apri KetoPath per la ricetta di stasera.',
  },
};

export async function runMealReminderJob(
  prisma: ExtendedPrismaClient,
  log: FastifyBaseLogger,
  meal: 'PRANZO' | 'SPUNTINO' | 'CENA',
): Promise<{ candidates: number; sent: number; expired: number }> {
  const candidates = await prisma.user.findMany({
    where: {
      preferences: { isNot: null },
      deviceTokens: { some: {} },
    },
    select: {
      id: true,
      fastingPausedUntil: true,
      preferences: { select: { notificationSettings: true } },
      deviceTokens: true,
    },
  });

  const now = Date.now();
  let sent = 0;
  let expired = 0;
  for (const u of candidates) {
    const settings = readSettings(u.preferences?.notificationSettings ?? null);
    if (!settings.mealReminders) continue;
    if (u.fastingPausedUntil && u.fastingPausedUntil.getTime() > now) continue;

    const copy = MEAL_COPY[meal];
    for (const token of u.deviceTokens) {
      const r = await sendToDevice(token, {
        title: copy.title,
        body: copy.body,
        url: '/plan',
      });
      if (r.ok) sent++;
      if (r.expired) {
        expired++;
        await prisma.deviceToken.delete({ where: { id: token.id } }).catch(() => {
          /* ignora race */
        });
      }
    }
  }
  if (sent > 0 || expired > 0) {
    log.info(
      { meal, candidates: candidates.length, sent, expired },
      '[notifications] meal reminder job',
    );
  }
  return { candidates: candidates.length, sent, expired };
}
