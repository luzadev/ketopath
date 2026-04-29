-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'COACH');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "ActivityLevel" AS ENUM ('SEDENTARY', 'LIGHT', 'MODERATE', 'INTENSE');

-- CreateEnum
CREATE TYPE "Phase" AS ENUM ('INTENSIVE', 'TRANSITION', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "CookingTime" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "FastingProtocol" AS ENUM ('FOURTEEN_TEN', 'SIXTEEN_EIGHT', 'EIGHTEEN_SIX', 'TWENTY_FOUR', 'ESE_24', 'FIVE_TWO');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" "Gender" NOT NULL,
    "height_cm" INTEGER NOT NULL,
    "weight_start_kg" DECIMAL(5,2) NOT NULL,
    "weight_current_kg" DECIMAL(5,2) NOT NULL,
    "weight_goal_kg" DECIMAL(5,2) NOT NULL,
    "activity_level" "ActivityLevel" NOT NULL,
    "target_date" DATE,
    "current_phase" "Phase" NOT NULL DEFAULT 'INTENSIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "exclusions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cuisine_preferences" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cooking_time" "CookingTime" NOT NULL DEFAULT 'MEDIUM',
    "fasting_protocol" "FastingProtocol",
    "notification_settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "preferences_user_id_key" ON "preferences"("user_id");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preferences" ADD CONSTRAINT "preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
