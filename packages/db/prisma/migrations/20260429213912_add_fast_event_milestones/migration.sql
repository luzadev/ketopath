-- AlterTable
ALTER TABLE "fast_events" ADD COLUMN     "notified_milestones" TEXT[] DEFAULT ARRAY[]::TEXT[];
