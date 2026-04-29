import { PrismaClient } from '@prisma/client';
import { fieldEncryptionExtension } from 'prisma-field-encryption';

// Singleton-friendly storage of the BASE client (so HMR doesn't open a new pool
// every time). The exported `prisma` is the EXTENDED client returned by
// $extends — it wraps the base client with the field-encryption middleware.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const baseClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = baseClient;
}

export const prisma = baseClient.$extends(fieldEncryptionExtension());

// Tipo del client esteso (post-$extends), utile per chi consuma `app.prisma`
// fuori dai route handler (es. scheduler).
export type ExtendedPrismaClient = typeof prisma;
