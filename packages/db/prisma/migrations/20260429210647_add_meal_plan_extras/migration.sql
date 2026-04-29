-- AlterTable
ALTER TABLE "ingredients" ADD COLUMN     "phase2_week" INTEGER;

-- AlterTable
ALTER TABLE "meal_slots" ADD COLUMN     "is_free_meal" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "recipe_ingredients" ADD COLUMN     "substitutes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "recipes" ADD COLUMN     "variants" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "phase2_started_at" TIMESTAMP(3);
