import { prisma } from '@ketopath/db';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';

import { readAuthEnv } from './env.js';

const env = readAuthEnv();

const isGoogleConfigured = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

export type SocialProvider = 'google';

export const enabledSocialProviders: ReadonlyArray<SocialProvider> = isGoogleConfigured
  ? ['google']
  : [];

const googleProvider = isGoogleConfigured
  ? {
      google: {
        clientId: env.GOOGLE_CLIENT_ID!,
        clientSecret: env.GOOGLE_CLIENT_SECRET!,
      },
    }
  : undefined;

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    // MVP: nessuna verifica email per non bloccare l'onboarding (vedi
    // docs/decisions/0001-auth-provider.md). Verrà attivata in V1.
    requireEmailVerification: false,
    minPasswordLength: 8,
  },
  socialProviders: googleProvider,
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 giorni
    updateAge: 60 * 60 * 24, // refresh expiresAt ogni 24h se la session è attiva
  },
  advanced: {
    cookiePrefix: 'ketopath',
  },
});

export type Auth = typeof auth;
