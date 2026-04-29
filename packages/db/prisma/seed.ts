import { PrismaClient } from '@prisma/client';

import { SEED_RECIPES } from './seed-recipes.js';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // Idempotente: createMany con skipDuplicates su nome (unique implicit nope —
  // usiamo upsert per ognuna).
  let inserted = 0;
  for (const r of SEED_RECIPES) {
    const existing = await prisma.recipe.findFirst({ where: { name: r.name } });
    if (existing) continue;
    await prisma.recipe.create({ data: r });
    inserted++;
  }
  // eslint-disable-next-line no-console
  console.info(`[seed] recipes inserted: ${inserted} (catalog total ${SEED_RECIPES.length})`);
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
