// PRD §14 — Diritto all'oblio (art. 17 GDPR) + portabilità (art. 20).
//
// `/me/export.json` restituisce un dump completo dei dati personali in JSON.
// I campi @encrypted vengono decifrati a runtime dal Prisma extension, quindi
// arrivano qui in chiaro: l'export deve essere autenticato e con
// Content-Disposition attachment.
//
// `DELETE /me` cancella l'utente e tutti i dati collegati via cascade. Per
// evitare cancellazioni accidentali richiediamo conferma re-inserendo la
// password (per gli account email/password); per gli OAuth-only basta la
// sessione attiva.

import { auth } from '@ketopath/auth';
import type { FastifyPluginAsync } from 'fastify';

import { requireAuth } from '../../plugins/auth.js';

export const gdprRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/me/export.json', { preHandler: requireAuth() }, async (request, reply) => {
    const userId = request.user!.id;

    const [
      user,
      profile,
      preferences,
      weightEntries,
      fastEvents,
      mealPlans,
      checkIns,
      deviceTokens,
    ] = await Promise.all([
      fastify.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          emailVerified: true,
          name: true,
          image: true,
          role: true,
          disclaimerAcceptedAt: true,
          phase2StartedAt: true,
          fastingPausedUntil: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      fastify.prisma.profile.findUnique({ where: { userId } }),
      fastify.prisma.preferences.findUnique({ where: { userId } }),
      fastify.prisma.weightEntry.findMany({
        where: { userId },
        orderBy: { date: 'asc' },
      }),
      fastify.prisma.fastEvent.findMany({
        where: { userId },
        orderBy: { startedAt: 'asc' },
      }),
      fastify.prisma.mealPlan.findMany({
        where: { userId },
        orderBy: { weekStart: 'asc' },
        include: {
          slots: {
            include: {
              selected: { select: { id: true, name: true } },
              alternatives: { select: { id: true, name: true } },
            },
          },
        },
      }),
      fastify.prisma.dailyCheckIn.findMany({
        where: { userId },
        orderBy: { date: 'asc' },
      }),
      fastify.prisma.deviceToken.findMany({
        where: { userId },
        select: {
          id: true,
          platform: true,
          userAgent: true,
          createdAt: true,
          lastSeenAt: true,
          // endpoint/p256dh/auth omessi: sono token push, non dato personale
        },
      }),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      schemaVersion: '1.0',
      user,
      profile,
      preferences,
      weightEntries,
      fastEvents,
      mealPlans,
      dailyCheckIns: checkIns,
      deviceTokens,
    };

    return reply
      .header('Content-Type', 'application/json; charset=utf-8')
      .header('Content-Disposition', 'attachment; filename="ketopath-export.json"')
      .send(payload);
  });

  // DELETE /me — cancellazione account.
  // Body opzionale { password } per ulteriore conferma sull'account
  // email/password. Il cascade del modello rimuove tutto il resto.
  fastify.delete('/me', { preHandler: requireAuth() }, async (request, reply) => {
    const userId = request.user!.id;
    const body = (request.body ?? {}) as { password?: unknown };

    // Se l'utente ha un account credential, esigiamo la password per
    // confermare la cancellazione. Per OAuth-only saltiamo il check.
    const credentialAccount = await fastify.prisma.account.findFirst({
      where: { userId, providerId: 'credential' },
      select: { password: true },
    });
    if (credentialAccount && credentialAccount.password) {
      if (typeof body.password !== 'string' || body.password.length === 0) {
        return reply.code(400).send({ error: 'password_required' });
      }
      const email = request.user!.email;
      if (!email) return reply.code(400).send({ error: 'email_required' });
      // Better Auth: verifica la password tentando un sign-in. Se la password
      // non corrisponde lancia un errore. Non emettiamo cookie reply.
      try {
        await auth.api.signInEmail({
          body: { email, password: body.password },
        });
      } catch {
        return reply.code(401).send({ error: 'invalid_password' });
      }
    }

    // Hard-delete con cascade.
    await fastify.prisma.user.delete({ where: { id: userId } });

    request.log.info({ userId }, '[gdpr] user account deleted');

    // Cookie di sessione: l'utente è già stato cancellato (cascade) ma il
    // browser potrebbe ancora avere il cookie. Lo invalidiamo via API.
    return reply
      .header('Set-Cookie', 'ketopath.session_token=; Path=/; Max-Age=0; HttpOnly')
      .code(204)
      .send();
  });
};
