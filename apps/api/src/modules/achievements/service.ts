// PRD §6 — service achievement: orchestra l'eval e la persistenza.
// Idempotente: rigirare la funzione senza nuovi eventi non duplica nulla
// e non emette notifiche. Pensato per essere chiamato dopo i 4 trigger:
// weight save, plan create, fast complete, slot consume.

import type { ExtendedPrismaClient } from '@ketopath/db';
import { evaluateAchievements, type AchievementKey } from '@ketopath/shared';

import { pushIsEnabled, sendToDevice } from '../notifications/sender.js';

interface UnlockOutput {
  newlyUnlocked: AchievementKey[];
}

export async function evaluateAndPersist(
  prisma: ExtendedPrismaClient,
  userId: string,
): Promise<UnlockOutput> {
  // Misuriamo le metriche correnti in parallelo. Niente filtri sulla data:
  // è uno snapshot. La unique constraint su (userId, key) ci protegge dai
  // doppioni quando l'utente innesca trigger ripetuti.
  const [weightEntryCount, planCount, completedFastCount, consumedMealCount] = await Promise.all([
    prisma.weightEntry.count({ where: { userId } }),
    prisma.mealPlan.count({ where: { userId } }),
    prisma.fastEvent.count({ where: { userId, status: 'COMPLETED' } }),
    prisma.mealSlot.count({ where: { plan: { userId }, consumed: true } }),
  ]);

  const should = evaluateAchievements({
    weightEntryCount,
    planCount,
    completedFastCount,
    consumedMealCount,
  });
  if (should.length === 0) return { newlyUnlocked: [] };

  const existing = await prisma.achievement.findMany({
    where: { userId, key: { in: should } },
    select: { key: true },
  });
  const have = new Set(existing.map((a) => a.key));
  const newlyUnlocked = should.filter((k) => !have.has(k));
  if (newlyUnlocked.length === 0) return { newlyUnlocked: [] };

  // createMany con skipDuplicates: race-safe contro chiamate concorrenti.
  await prisma.achievement.createMany({
    data: newlyUnlocked.map((key) => ({ userId, key })),
    skipDuplicates: true,
  });

  return { newlyUnlocked };
}

const ACHIEVEMENT_PUSH_COPY: Record<AchievementKey, { title: string; body: string }> = {
  first_weigh_in: {
    title: 'Achievement sbloccato: Prima pesata',
    body: 'Hai messo il primo punto sulla mappa. Ben fatto.',
  },
  first_plan: {
    title: 'Achievement sbloccato: Primo piano',
    body: 'Hai il tuo piano della settimana. Si parte.',
  },
  first_fast_complete: {
    title: 'Achievement sbloccato: Primo digiuno',
    body: 'Sessione completata. Costanza è la chiave.',
  },
  ten_meals_consumed: {
    title: 'Achievement sbloccato: 10 pasti',
    body: 'Dieci pasti spuntati. La routine sta diventando un ritmo.',
  },
};

// Best-effort: non blocchiamo la response principale se push fallisce.
export async function notifyUnlocked(
  prisma: ExtendedPrismaClient,
  userId: string,
  keys: AchievementKey[],
): Promise<void> {
  if (keys.length === 0 || !pushIsEnabled()) return;
  const tokens = await prisma.deviceToken.findMany({ where: { userId } });
  if (tokens.length === 0) return;
  for (const key of keys) {
    const copy = ACHIEVEMENT_PUSH_COPY[key];
    for (const token of tokens) {
      const r = await sendToDevice(token, {
        title: copy.title,
        body: copy.body,
        url: '/profile',
      });
      if (r.expired) {
        await prisma.deviceToken.delete({ where: { id: token.id } }).catch(() => {
          /* race */
        });
      }
    }
  }
}
