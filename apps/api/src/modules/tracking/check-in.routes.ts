// PRD §5.2 — check-in lampo quotidiano: indicatori soggettivi (energia,
// sonno, fame, umore) compilabili in 10 secondi, una volta al giorno.

import { dailyCheckInInputSchema } from '@ketopath/shared';
import type { FastifyPluginAsync } from 'fastify';

import { requireAuth } from '../../plugins/auth.js';

function todayDateOnly(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export const checkInRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/me/check-ins', { preHandler: requireAuth() }, async (request) => {
    const userId = request.user!.id;
    const items = await fastify.prisma.dailyCheckIn.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 30,
    });
    return {
      items: items.map((c) => ({
        id: c.id,
        date: c.date.toISOString().slice(0, 10),
        energy: c.energy,
        sleep: c.sleep,
        hunger: c.hunger,
        mood: c.mood,
        notes: c.notes,
      })),
    };
  });

  // GET /me/check-ins/today: ritorna il check-in di oggi (se esiste).
  fastify.get('/me/check-ins/today', { preHandler: requireAuth() }, async (request) => {
    const userId = request.user!.id;
    const date = todayDateOnly();
    const item = await fastify.prisma.dailyCheckIn.findUnique({
      where: { userId_date: { userId, date } },
    });
    if (!item) return { item: null };
    return {
      item: {
        id: item.id,
        date: item.date.toISOString().slice(0, 10),
        energy: item.energy,
        sleep: item.sleep,
        hunger: item.hunger,
        mood: item.mood,
        notes: item.notes,
      },
    };
  });

  fastify.post('/me/check-ins', { preHandler: requireAuth() }, async (request, reply) => {
    const parsed = dailyCheckInInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body', issues: parsed.error.issues });
    }
    const data = parsed.data;
    const userId = request.user!.id;
    const date = new Date(data.date);
    date.setHours(0, 0, 0, 0);

    const item = await fastify.prisma.dailyCheckIn.upsert({
      where: { userId_date: { userId, date } },
      create: {
        userId,
        date,
        energy: data.energy ?? null,
        sleep: data.sleep ?? null,
        hunger: data.hunger ?? null,
        mood: data.mood ?? null,
        notes: data.notes ?? null,
      },
      update: {
        energy: data.energy ?? null,
        sleep: data.sleep ?? null,
        hunger: data.hunger ?? null,
        mood: data.mood ?? null,
        notes: data.notes ?? null,
      },
    });

    return reply.code(201).send({ item: { id: item.id } });
  });
};
