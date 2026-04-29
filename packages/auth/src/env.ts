import { z } from 'zod';

// Le env vars sono lette dal processo che importa @ketopath/auth (apps/web,
// apps/api, ecc.). Vengono validate al momento della creazione dell'istanza,
// così errori di configurazione emergono al boot e non a runtime.
const authEnvSchema = z.object({
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, 'BETTER_AUTH_SECRET deve essere lungo almeno 32 caratteri'),
  BETTER_AUTH_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
});

export type AuthEnv = z.infer<typeof authEnvSchema>;

export function readAuthEnv(source: NodeJS.ProcessEnv = process.env): AuthEnv {
  return authEnvSchema.parse(source);
}
