-- AlterTable
ALTER TABLE "meal_slots" ADD COLUMN     "consumed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "consumed_at" TIMESTAMP(3);
