-- AlterTable
ALTER TABLE "preferences" ADD COLUMN "banned_ingredient_ids" TEXT[] DEFAULT ARRAY[]::TEXT[];
