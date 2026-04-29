// Side-effect import: initializes Sentry before any other module is evaluated.
// Must stay first — moving it later means errors thrown during early boot
// (env validation, Prisma adapter, etc.) wouldn't reach Sentry.
import './lib/sentry.js';
import { buildApp } from './app.js';
import { env } from './config/env.js';
import { startNotificationScheduler } from './modules/notifications/scheduler.js';

async function start(): Promise<void> {
  const app = await buildApp();

  const cronHandles = startNotificationScheduler(app.prisma, app.log);
  app.addHook('onClose', async () => {
    cronHandles?.weekly.stop();
    cronHandles?.fasting.stop();
    cronHandles?.meals.forEach((m) => m.stop());
  });

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void start();
