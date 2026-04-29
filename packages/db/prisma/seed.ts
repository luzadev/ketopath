import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // TODO: dati di seed (utenti demo, ricette base, ecc.) — verranno aggiunti
  // quando le entità relative saranno modellate.
  // eslint-disable-next-line no-console
  console.info('[seed] nothing to seed yet');
}

main()
  .catch((err: unknown) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
