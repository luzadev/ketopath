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

export function startNotificationScheduler(
  prisma: ExtendedPrismaClient,
  log: FastifyBaseLogger,
): ScheduledTask | null {
  if (!pushIsEnabled()) {
    log.info('[notifications] VAPID keys missing — scheduler disabled');
    return null;
  }
  // eslint-disable-next-line import/no-named-as-default-member
  const task = cron.schedule(
    WEEKLY_CRON,
    () => {
      void runWeeklyWeighInJob(prisma, log);
    },
    { timezone: 'Europe/Rome' },
  );
  log.info('[notifications] weekly weigh-in cron scheduled (Mon 09:00 Europe/Rome)');
  return task;
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
