import { PrismaClient } from '@prisma/client';

import { SEED_INGREDIENTS } from './seed-ingredients.js';
import { SEED_RECIPES } from './seed-recipes.js';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // 1. Ingredienti — upsert sul nome (unique).
  let ingredientsInserted = 0;
  for (const i of SEED_INGREDIENTS) {
    const existing = await prisma.ingredient.findUnique({ where: { name: i.name } });
    if (existing) continue;
    await prisma.ingredient.create({
      data: {
        name: i.name,
        category: i.category,
        defaultUnit: i.defaultUnit,
        kcalPer100g: i.kcalPer100g,
        proteinPer100g: i.proteinPer100g,
        fatPer100g: i.fatPer100g,
        netCarbPer100g: i.netCarbPer100g,
        exclusionGroups: i.exclusionGroups,
        priceAvgEur: i.priceAvgEur ?? null,
      },
    });
    ingredientsInserted++;
  }

  const allIngredients = await prisma.ingredient.findMany({ select: { id: true, name: true } });
  const ingredientByName = new Map(allIngredients.map((i) => [i.name, i.id]));

  // 2. Ricette — `Recipe.name` non è unique nel modello, ma il seed garantisce
  // unicità per costruzione. Idempotente: se esiste, aggiorniamo i campi
  // anagrafici e ricreiamo i RecipeIngredient (così editare il seed propaga).
  let recipesInserted = 0;
  let linksCreated = 0;
  for (const r of SEED_RECIPES) {
    let recipe = await prisma.recipe.findFirst({ where: { name: r.name } });
    if (!recipe) {
      recipe = await prisma.recipe.create({
        data: {
          name: r.name,
          category: r.category,
          description: r.description,
          prepMinutes: r.prepMinutes,
          difficulty: r.difficulty,
          kcal: r.kcal,
          proteinG: r.proteinG,
          fatG: r.fatG,
          netCarbG: r.netCarbG,
          phases: r.phases,
          notesChef: r.notesChef ?? null,
        },
      });
      recipesInserted++;
    } else {
      recipe = await prisma.recipe.update({
        where: { id: recipe.id },
        data: {
          category: r.category,
          description: r.description,
          prepMinutes: r.prepMinutes,
          difficulty: r.difficulty,
          kcal: r.kcal,
          proteinG: r.proteinG,
          fatG: r.fatG,
          netCarbG: r.netCarbG,
          phases: r.phases,
          notesChef: r.notesChef ?? null,
        },
      });
    }

    await prisma.recipeIngredient.deleteMany({ where: { recipeId: recipe.id } });
    for (const ing of r.ingredients) {
      const ingredientId = ingredientByName.get(ing.name);
      if (!ingredientId) {
        // eslint-disable-next-line no-console
        console.warn(`[seed] ricetta "${r.name}": ingrediente "${ing.name}" non trovato`);
        continue;
      }
      await prisma.recipeIngredient.create({
        data: {
          recipeId: recipe.id,
          ingredientId,
          quantity: ing.quantity,
          unit: ing.unit,
        },
      });
      linksCreated++;
    }
  }

  // eslint-disable-next-line no-console
  console.info(
    `[seed] ingredients +${ingredientsInserted} (catalog ${SEED_INGREDIENTS.length}), ` +
      `recipes +${recipesInserted} (catalog ${SEED_RECIPES.length}), recipe-ingredient links: ${linksCreated}`,
  );
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
