// PRD §5.4 — lista della spesa generata aggregando i RecipeIngredient
// del piano settimanale ACTIVE dell'utente. Aggregazione per (ingrediente, unità):
// se la stessa ricetta usa lo stesso ingrediente con unità diverse (raro ma
// possibile), restano righe separate.

import type { FastifyPluginAsync } from 'fastify';

import { requireAuth } from '../../plugins/auth.js';

interface ShoppingLine {
  ingredientId: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  recipes: string[]; // nomi delle ricette che la richiedono
  priceAvgEur: number | null;
}

interface ShoppingGroup {
  category: string;
  items: ShoppingLine[];
}

export const shoppingRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/me/shopping-list', { preHandler: requireAuth() }, async (request, reply) => {
    const userId = request.user!.id;

    const plan = await fastify.prisma.mealPlan.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { weekStart: 'desc' },
      include: {
        slots: {
          where: { recipeId: { not: null } },
          include: {
            selected: {
              include: {
                ingredients: {
                  include: { ingredient: true },
                },
              },
            },
          },
        },
      },
    });

    if (!plan) return reply.code(404).send({ error: 'plan_not_found' });

    type AggKey = string; // `${ingredientId}::${unit}`
    const aggregated = new Map<AggKey, ShoppingLine>();

    for (const slot of plan.slots) {
      const recipe = slot.selected;
      if (!recipe) continue;
      for (const ri of recipe.ingredients) {
        const key: AggKey = `${ri.ingredientId}::${ri.unit}`;
        const existing = aggregated.get(key);
        if (existing) {
          existing.quantity += ri.quantity;
          if (!existing.recipes.includes(recipe.name)) {
            existing.recipes.push(recipe.name);
          }
        } else {
          aggregated.set(key, {
            ingredientId: ri.ingredientId,
            name: ri.ingredient.name,
            category: ri.ingredient.category,
            unit: ri.unit,
            quantity: ri.quantity,
            recipes: [recipe.name],
            priceAvgEur: ri.ingredient.priceAvgEur ?? null,
          });
        }
      }
    }

    const byCategory = new Map<string, ShoppingLine[]>();
    for (const line of aggregated.values()) {
      if (!byCategory.has(line.category)) byCategory.set(line.category, []);
      byCategory.get(line.category)!.push(line);
    }

    const groups: ShoppingGroup[] = Array.from(byCategory.entries())
      .map(([category, items]) => ({
        category,
        items: items.sort((a, b) => a.name.localeCompare(b.name, 'it')),
      }))
      .sort((a, b) => a.category.localeCompare(b.category, 'it'));

    return {
      plan: {
        id: plan.id,
        weekStart: plan.weekStart.toISOString().slice(0, 10),
      },
      groups,
    };
  });
};
