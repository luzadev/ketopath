-- AlterTable
ALTER TABLE "preferences" ADD COLUMN     "meals_per_day" INTEGER,
ADD COLUMN     "session_minutes" INTEGER,
ADD COLUMN     "training_days" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "training_type" TEXT;

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "diet_history" TEXT;
