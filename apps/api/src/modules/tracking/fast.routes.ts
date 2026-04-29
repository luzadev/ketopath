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

    const event = await fastify.prisma.fastEvent.update({
      where: { id },
      data: {
        endedAt: data.endedAt ?? undefined,
        status: data.status ?? undefined,
        symptoms: data.symptoms ? JSON.stringify(data.symptoms) : undefined,
        notes: data.notes ?? undefined,
      },
    });
    return { event: { id: event.id, status: event.status } };
  });
};
