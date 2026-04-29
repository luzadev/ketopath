import {
  PROTOCOL_DEFAULT_MINUTES,
  fastEventStartSchema,
  fastEventUpdateSchema,
} from '@ketopath/shared';
import type { FastifyPluginAsync } from 'fastify';

import { requireAuth } from '../../plugins/auth.js';

export const fastRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/me/fast-events', { preHandler: requireAuth() }, async (request) => {
    const events = await fastify.prisma.fastEvent.findMany({
      where: { userId: request.user!.id },
      orderBy: { startedAt: 'desc' },
      take: 30,
    });
    return {
      events: events.map((e) => ({
        id: e.id,
        protocol: e.protocol,
        status: e.status,
        startedAt: e.startedAt.toISOString(),
        endedAt: e.endedAt?.toISOString() ?? null,
        targetDuration: e.targetDuration,
        symptoms: e.symptoms ? (JSON.parse(e.symptoms) as unknown) : null,
        notes: e.notes,
      })),
    };
  });

  fastify.post('/me/fast-events', { preHandler: requireAuth() }, async (request, reply) => {
    const parsed = fastEventStartSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body', issues: parsed.error.issues });
    }
    const data = parsed.data;
    const event = await fastify.prisma.fastEvent.create({
      data: {
        userId: request.user!.id,
        protocol: data.protocol,
        startedAt: data.startedAt ?? new Date(),
        targetDuration: data.targetDuration ?? PROTOCOL_DEFAULT_MINUTES[data.protocol],
      },
    });
    return reply.code(201).send({ event: { id: event.id } });
  });

  fastify.patch('/me/fast-events/:id', { preHandler: requireAuth() }, async (request, reply) => {
    const id = (request.params as { id: string }).id;
    const parsed = fastEventUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body', issues: parsed.error.issues });
    }
    const data = parsed.data;
    // Garantisce che l'utente possa aggiornare solo i propri eventi.
    const owned = await fastify.prisma.fastEvent.findFirst({
      where: { id, userId: request.user!.id },
      select: { id: true },
    });
    if (!owned) return reply.code(404).send({ error: 'fast_event_not_found' });

    // Costruiamo l'oggetto data omettendo le chiavi non fornite, perché con
    // `exactOptionalPropertyTypes` Prisma rifiuta `undefined` esplicito.
    const updateData: Parameters<typeof fastify.prisma.fastEvent.update>[0]['data'] = {};
    if (data.endedAt) updateData.endedAt = data.endedAt;
    if (data.status) updateData.status = data.status;
    if (data.symptoms) updateData.symptoms = JSON.stringify(data.symptoms);
    if (data.notes != null) updateData.notes = data.notes;

    const event = await fastify.prisma.fastEvent.update({
      where: { id },
      data: updateData,
    });
    return { event: { id: event.id, status: event.status } };
  });

  // PRD §5.3 — modalità "giorno libero". Mette in pausa i reminder fino a
  // `until` (default: domani alle 06:00 nel fuso del server). Idempotente:
  // body vuoto = pausa fino a domattina; { until: null } = riprende subito.
  fastify.post('/me/fasting/pause', { preHandler: requireAuth() }, async (request, reply) => {
    const userId = request.user!.id;
    const body = (request.body ?? {}) as { until?: string | null };
    let until: Date | null = null;
    if (body.until === null) {
      until = null;
    } else if (typeof body.until === 'string') {
      const d = new Date(body.until);
      if (Number.isNaN(d.getTime())) {
        return reply.code(400).send({ error: 'invalid_until' });
      }
      until = d;
    } else {
      // default: domani alle 06:00 locali (server)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(6, 0, 0, 0);
      until = tomorrow;
    }
    const user = await fastify.prisma.user.update({
      where: { id: userId },
      data: { fastingPausedUntil: until },
      select: { fastingPausedUntil: true },
    });
    return { fastingPausedUntil: user.fastingPausedUntil?.toISOString() ?? null };
  });

  // PRD §5.3 — pasto di rottura intelligente. Per digiuni > 24h propone 3
  // ricette facili da digerire: prep <= 20 min, kcal <= 350, nessun ingrediente
  // a forte impatto digestivo (legumi, pesce affumicato, fritture). Heuristica
  // semplice: prepMinutes + kcal + categoria SPUNTINO/COLAZIONE.
  fastify.get(
    '/me/fast-events/:id/break-fast-suggestions',
    { preHandler: requireAuth() },
    async (request, reply) => {
      const id = (request.params as { id: string }).id;
      const userId = request.user!.id;
      const fast = await fastify.prisma.fastEvent.findFirst({
        where: { id, userId },
        select: { startedAt: true, endedAt: true, targetDuration: true, status: true },
      });
      if (!fast) return reply.code(404).send({ error: 'fast_event_not_found' });
      // Disponibile solo per digiuni effettivamente >= 24h
      const end = fast.endedAt ?? new Date();
      const hours = (end.getTime() - fast.startedAt.getTime()) / 3_600_000;
      if (hours < 24) {
        return reply.code(409).send({ error: 'duration_too_short', hours });
      }
      const recipes = await fastify.prisma.recipe.findMany({
        where: {
          prepMinutes: { lte: 20 },
          kcal: { lte: 350 },
          category: { in: ['COLAZIONE', 'SPUNTINO'] },
        },
        orderBy: [{ kcal: 'asc' }, { prepMinutes: 'asc' }],
        take: 3,
        select: {
          id: true,
          name: true,
          kcal: true,
          proteinG: true,
          prepMinutes: true,
          description: true,
        },
      });
      return { suggestions: recipes };
    },
  );

  fastify.get('/me/fasting/pause', { preHandler: requireAuth() }, async (request) => {
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.user!.id },
      select: { fastingPausedUntil: true },
    });
    const until = user?.fastingPausedUntil ?? null;
    const active = until != null && until.getTime() > Date.now();
    return {
      fastingPausedUntil: until?.toISOString() ?? null,
      paused: active,
    };
  });
};
