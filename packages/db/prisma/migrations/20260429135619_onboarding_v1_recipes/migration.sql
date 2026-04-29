-- CreateEnum
CREATE TYPE "FastStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABORTED');

-- CreateEnum
CREATE TYPE "MealCategory" AS ENUM ('COLAZIONE', 'PRANZO', 'SPUNTINO', 'CENA');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('FACILE', 'MEDIA', 'ELABORATA');

-- CreateEnum
CREATE TYPE "MealPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "disclaimer_accepted_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "weight_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "weight_kg" TEXT NOT NULL,
    "measurements" TEXT,
    "notes" TEXT,
    "energy" INTEGER,
    "sleep" INTEGER,
    "hunger" INTEGER,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weight_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fast_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "protocol" "FastingProtocol" NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "target_duration_minutes" INTEGER NOT NULL,
    "status" "FastStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "symptoms" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fast_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "default_unit" TEXT NOT NULL,
    "kcal_per_100g" DOUBLE PRECISION NOT NULL,
    "protein_per_100g" DOUBLE PRECISION NOT NULL,
    "fat_per_100g" DOUBLE PRECISION NOT NULL,
    "net_carb_per_100g" DOUBLE PRECISION NOT NULL,
    "exclusion_groups" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "price_avg_eur" DOUBLE PRECISION,

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "MealCategory" NOT NULL,
    "description" TEXT,
    "prep_minutes" INTEGER NOT NULL,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'FACILE',
    "cuisine" TEXT NOT NULL DEFAULT 'italiana',
    "photo_url" TEXT,
    "kcal" DOUBLE PRECISION NOT NULL,
    "protein_g" DOUBLE PRECISION NOT NULL,
    "fat_g" DOUBLE PRECISION NOT NULL,
    "net_carb_g" DOUBLE PRECISION NOT NULL,
    "phases" INTEGER[] DEFAULT ARRAY[1, 2, 3]::INTEGER[],
    "servings" INTEGER NOT NULL DEFAULT 1,
    "notes_chef" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "id" TEXT NOT NULL,
    "recipe_id" TEXT NOT NULL,
    "ingredient_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_plans" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "week_start" DATE NOT NULL,
    "status" "MealPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_slots" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "meal" "MealCategory" NOT NULL,
    "recipe_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "meal_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AlternativeRecipes" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "weight_entries_user_id_date_idx" ON "weight_entries"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "weight_entries_user_id_date_key" ON "weight_entries"("user_id", "date");

-- CreateIndex
CREATE INDEX "fast_events_user_id_started_at_idx" ON "fast_events"("user_id", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "ingredients_name_key" ON "ingredients"("name");

-- CreateIndex
CREATE INDEX "recipes_category_idx" ON "recipes"("category");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_ingredients_recipe_id_ingredient_id_key" ON "recipe_ingredients"("recipe_id", "ingredient_id");

-- CreateIndex
CREATE INDEX "meal_plans_user_id_week_start_idx" ON "meal_plans"("user_id", "week_start");

-- CreateIndex
CREATE UNIQUE INDEX "meal_plans_user_id_week_start_key" ON "meal_plans"("user_id", "week_start");

-- CreateIndex
CREATE UNIQUE INDEX "meal_slots_plan_id_day_of_week_meal_key" ON "meal_slots"("plan_id", "day_of_week", "meal");

-- CreateIndex
CREATE UNIQUE INDEX "_AlternativeRecipes_AB_unique" ON "_AlternativeRecipes"("A", "B");

-- CreateIndex
CREATE INDEX "_AlternativeRecipes_B_index" ON "_AlternativeRecipes"("B");

-- AddForeignKey
ALTER TABLE "weight_entries" ADD CONSTRAINT "weight_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fast_events" ADD CONSTRAINT "fast_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_slots" ADD CONSTRAINT "meal_slots_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "meal_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_slots" ADD CONSTRAINT "meal_slots_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AlternativeRecipes" ADD CONSTRAINT "_AlternativeRecipes_A_fkey" FOREIGN KEY ("A") REFERENCES "meal_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AlternativeRecipes" ADD CONSTRAINT "_AlternativeRecipes_B_fkey" FOREIGN KEY ("B") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
