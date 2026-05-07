import { weightEntryInputSchema } from '@ketopath/shared';
import type { FastifyPluginAsync } from 'fastify';

import { requireAuth } from '../../plugins/auth.js';
import { requirePro } from '../../plugins/require-pro.js';
import { evaluateAndPersist, notifyUnlocked } from '../achievements/service.js';

export const weightRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/me/weight-entries', { preHandler: requireAuth() }, async (request) => {
    const entries = await fastify.prisma.weightEntry.findMany({
      where: { userId: request.user!.id },
      orderBy: { date: 'desc' },
      take: 60,
    });
    return {
      entries: entries.map((e) => ({
        id: e.id,
        date: e.date.toISOString().slice(0, 10),
        weightKg: Number(e.weightKg),
        measurements: e.measurements ? (JSON.parse(e.measurements) as unknown) : null,
        notes: e.notes,
        energy: e.energy,
        sleep: e.sleep,
        hunger: e.hunger,
        photos: e.photos,
      })),
    };
  });

  fastify.post(
    '/me/weight-entries',
    { preHandler: [requireAuth(), requirePro()] },
    async (request, reply) => {
      const parsed = weightEntryInputSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_body', issues: parsed.error.issues });
      }
      const data = parsed.data;
      const userId = request.user!.id;

      const entry = await fastify.prisma.weightEntry.upsert({
        where: { userId_date: { userId, date: data.date } },
        create: {
          userId,
          date: data.date,
          weightKg: String(data.weightKg),
          measurements: data.measurements ? JSON.stringify(data.measurements) : null,
          notes: data.notes ?? null,
          energy: data.energy ?? null,
          sleep: data.sleep ?? null,
          hunger: data.hunger ?? null,
          photos: data.photos ?? [],
        },
        update: {
          weightKg: String(data.weightKg),
          measurements: data.measurements ? JSON.stringify(data.measurements) : null,
          notes: data.notes ?? null,
          energy: data.energy ?? null,
          sleep: data.sleep ?? null,
          hunger: data.hunger ?? null,
          photos: data.photos ?? [],
        },
      });

      const ach = await evaluateAndPersist(fastify.prisma, userId);
      if (ach.newlyUnlocked.length > 0) {
        void notifyUnlocked(fastify.prisma, userId, ach.newlyUnlocked).catch(() => {
          /* notifica best-effort */
        });
      }

      return reply.code(201).send({
        entry: { id: entry.id, date: entry.date.toISOString().slice(0, 10) },
        newlyUnlocked: ach.newlyUnlocked,
      });
    },
  );
};
