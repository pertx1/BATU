-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('MALE', 'FEMALE', 'UNSPECIFIED');

-- CreateEnum
CREATE TYPE "ActivityLevel" AS ENUM ('SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE');

-- CreateEnum
CREATE TYPE "NutritionGoal" AS ENUM ('LOSE_FAT', 'LOSE_WEIGHT', 'MAINTAIN', 'RECOMP', 'GAIN_MUSCLE', 'GAIN_WEIGHT');

-- CreateEnum
CREATE TYPE "GoalPace" AS ENUM ('GENTLE', 'RECOMMENDED', 'FAST');

-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'MIDMORNING', 'LUNCH', 'SNACK', 'DINNER', 'NIBBLE');

-- CreateEnum
CREATE TYPE "EstimateStatus" AS ENUM ('NONE', 'PENDING', 'DONE', 'FAILED');

-- AlterEnum
ALTER TYPE "GoalType" ADD VALUE 'WEIGHT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationKind" ADD VALUE 'WATER';
ALTER TYPE "NotificationKind" ADD VALUE 'WEIGH_IN';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "XpKind" ADD VALUE 'MEALS_DAY';
ALTER TYPE "XpKind" ADD VALUE 'WATER_GOAL';
ALTER TYPE "XpKind" ADD VALUE 'PROTEIN_GOAL';
ALTER TYPE "XpKind" ADD VALUE 'HUNGER';
ALTER TYPE "XpKind" ADD VALUE 'WEIGH_IN';

-- CreateTable
CREATE TABLE "NutritionProfile" (
    "userId" TEXT NOT NULL,
    "sex" "Sex" NOT NULL,
    "birthYear" INTEGER NOT NULL,
    "heightCm" DOUBLE PRECISION NOT NULL,
    "activity" "ActivityLevel" NOT NULL,
    "goal" "NutritionGoal" NOT NULL,
    "pace" "GoalPace",
    "targetWeightKg" DOUBLE PRECISION,
    "weightAtCalc" DOUBLE PRECISION NOT NULL,
    "bmr" INTEGER NOT NULL,
    "tdee" INTEGER NOT NULL,
    "kcalTarget" INTEGER NOT NULL,
    "proteinG" INTEGER NOT NULL,
    "carbsG" INTEGER NOT NULL,
    "fatG" INTEGER NOT NULL,
    "fiberG" INTEGER NOT NULL,
    "waterMl" INTEGER NOT NULL,
    "manualTargets" BOOLEAN NOT NULL DEFAULT false,
    "calculatedAt" TIMESTAMP(3) NOT NULL,
    "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "hideNumbers" BOOLEAN NOT NULL DEFAULT false,
    "glassMl" INTEGER NOT NULL DEFAULT 250,
    "bottleMl" INTEGER NOT NULL DEFAULT 500,
    "wakeTime" INTEGER NOT NULL DEFAULT 450,
    "sleepTime" INTEGER NOT NULL DEFAULT 1380,
    "waterReminders" BOOLEAN NOT NULL DEFAULT true,
    "weighInPerWeek" INTEGER NOT NULL DEFAULT 1,
    "nextWaterAt" TIMESTAMP(3),
    "nextWeighInAt" TIMESTAMP(3),
    "goalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "MealLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "eatenAt" TIMESTAMP(3) NOT NULL,
    "type" "MealType" NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "photoKey" TEXT,
    "hungerBefore" INTEGER,
    "fullnessAfter" INTEGER,
    "status" "EstimateStatus" NOT NULL DEFAULT 'NONE',
    "estimate" JSONB,
    "confidence" TEXT,
    "kcal" INTEGER NOT NULL DEFAULT 0,
    "proteinG" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carbsG" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fatG" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fiberG" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FavoriteMeal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MealType",
    "photoKey" TEXT,
    "estimate" JSONB NOT NULL,
    "kcal" INTEGER NOT NULL,
    "proteinG" DOUBLE PRECISION NOT NULL,
    "carbsG" DOUBLE PRECISION NOT NULL,
    "fatG" DOUBLE PRECISION NOT NULL,
    "fiberG" DOUBLE PRECISION NOT NULL,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteMeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaterLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "ml" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaterLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeightLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "kg" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeightLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsage" (
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("userId","day")
);

-- CreateIndex
CREATE UNIQUE INDEX "NutritionProfile_goalId_key" ON "NutritionProfile"("goalId");

-- CreateIndex
CREATE INDEX "NutritionProfile_nextWaterAt_idx" ON "NutritionProfile"("nextWaterAt");

-- CreateIndex
CREATE INDEX "NutritionProfile_nextWeighInAt_idx" ON "NutritionProfile"("nextWeighInAt");

-- CreateIndex
CREATE INDEX "MealLog_userId_day_idx" ON "MealLog"("userId", "day");

-- CreateIndex
CREATE INDEX "FavoriteMeal_userId_idx" ON "FavoriteMeal"("userId");

-- CreateIndex
CREATE INDEX "WaterLog_userId_day_idx" ON "WaterLog"("userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "WeightLog_userId_day_key" ON "WeightLog"("userId", "day");

-- AddForeignKey
ALTER TABLE "NutritionProfile" ADD CONSTRAINT "NutritionProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealLog" ADD CONSTRAINT "MealLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteMeal" ADD CONSTRAINT "FavoriteMeal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaterLog" ADD CONSTRAINT "WaterLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeightLog" ADD CONSTRAINT "WeightLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

