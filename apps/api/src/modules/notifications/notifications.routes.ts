// PRD §5.6 — registrazione device per push, gestione preferenze.

import {
  DEFAULT_NOTIFICATION_SETTINGS,
  notificationSettingsSchema,
  webPushSubscriptionSchema,
  type NotificationSettings,
} from '@ketopath/shared';
import type { FastifyPluginAsync } from 'fastify';

import { requireAuth } from '../../plugins/auth.js';

import { pushIsEnabled, sendToDevice } from './sender.js';

export const notificationsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/me/notifications/config', { preHandler: requireAuth() }, async (request) => {
    const userId = request.user!.id;
    const prefs = await fastify.prisma.preferences.findUnique({ where: { userId } });
    const tokens = await fastify.prisma.deviceToken.findMany({
      where: { userId },
      select: {
        id: true,
        platform: true,
        endpoint: true,
        userAgent: true,
        createdAt: true,
        lastSeenAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    const settings = readSettings(prefs?.notificationSettings ?? null);
    return {
      pushEnabled: pushIsEnabled(),
      settings,
      devices: tokens,
    };
  });

  fastify.post('/me/device-tokens', { preHandler: requireAuth() }, async (request, reply) => {
    if (!pushIsEnabled()) {
      return reply.code(503).send({ error: 'push_not_configured' });
    }
    const parsed = webPushSubscriptionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body', issues: parsed.error.issues });
    }
    const userId = request.user!.id;
    const { endpoint, keys, userAgent } = parsed.data;

    const data = {
      userId,
      platform: 'web',
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: userAgent ?? null,
      lastSeenAt: new Date(),
    };

    const token = await fastify.prisma.deviceToken.upsert({
      where: { userId_endpoint: { userId, endpoint } },
      create: data,
      update: { ...data, createdAt: undefined as never },
    });

    return reply.code(201).send({ device: { id: token.id } });
  });

  fastify.delete('/me/device-tokens/:id', { preHandler: requireAuth() }, async (request, reply) => {
    const userId = request.user!.id;
    const id = (request.params as { id: string }).id;
    const owned = await fastify.prisma.deviceToken.findFirst({ where: { id, userId } });
    if (!owned) return reply.code(404).send({ error: 'device_not_found' });
    await fastify.prisma.deviceToken.delete({ where: { id } });
    return reply.code(204).send();
  });

  fastify.patch(
    '/me/notifications/settings',
    { preHandler: requireAuth() },
    async (request, reply) => {
      const parsed = notificationSettingsSchema.partial().safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_body', issues: parsed.error.issues });
      }
      const userId = request.user!.id;
      const existing = await fastify.prisma.preferences.findUnique({ where: { userId } });
      const current = readSettings(existing?.notificationSettings ?? null);
      // partial().safeParse can return undefined per key; filtra prima di
      // sovrascrivere così non spegniamo flag attivi con un payload parziale.
      const patch = Object.fromEntries(
        Object.entries(parsed.data).filter(([, v]) => v !== undefined),
      );
      const next: NotificationSettings = { ...current, ...patch };

      await fastify.prisma.preferences.upsert({
        where: { userId },
        create: { userId, notificationSettings: next },
        update: { notificationSettings: next },
      });

      return { settings: next };
    },
  );

  fastify.post('/me/notifications/test', { preHandler: requireAuth() }, async (request, reply) => {
    if (!pushIsEnabled()) {
      return reply.code(503).send({ error: 'push_not_configured' });
    }
    const userId = request.user!.id;
    const tokens = await fastify.prisma.deviceToken.findMany({ where: { userId } });
    if (tokens.length === 0) return reply.code(409).send({ error: 'no_devices' });

    let sent = 0;
    let removed = 0;
    for (const t of tokens) {
      const result = await sendToDevice(t, {
        title: 'KetoPath',
        body: 'Notifica di prova: la connessione funziona.',
        url: '/profile',
      });
      if (result.ok) sent++;
      if (result.expired) {
        await fastify.prisma.deviceToken.delete({ where: { id: t.id } });
        removed++;
      }
    }
    return { sent, removed };
  });
};

function readSettings(value: unknown): NotificationSettings {
  if (!value || typeof value !== 'object') return DEFAULT_NOTIFICATION_SETTINGS;
  const parsed = notificationSettingsSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_NOTIFICATION_SETTINGS;
}
