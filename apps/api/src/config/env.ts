import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().min(1).default('127.0.0.1'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  SENTRY_DSN: z.string().url().optional(),
  // PRD §5.6 — Web Push (VAPID). Tutte e tre opzionali: se mancano, lo
  // scheduler delle notifiche resta disattivo e gli endpoint /me/device-tokens
  // rispondono 503. Vedi ADR 0003.
  VAPID_PUBLIC_KEY: z.string().min(1).optional(),
  VAPID_PRIVATE_KEY: z.string().min(1).optional(),
  VAPID_SUBJECT: z.string().min(1).optional(), // es. mailto:hello@ketopath.app
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
