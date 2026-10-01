-- CreateEnum
CREATE TYPE "AntolaTone" AS ENUM ('LIVELY', 'CALM');

-- CreateEnum
CREATE TYPE "XpKind" AS ENUM ('TASK', 'HABIT', 'DAY_COMPLETE', 'REVIEW', 'MILESTONE', 'GOAL', 'ACHIEVEMENT', 'CHALLENGE');

-- CreateEnum
CREATE TYPE "ChallengeKind" AS ENUM ('TASKS', 'HIGH_PRIORITY', 'HABIT_DAYS', 'PROJECT_TASKS', 'PRODUCTIVE_DAYS', 'EARLY_TASKS');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationKind" ADD VALUE 'STREAK_RISK';
ALTER TYPE "NotificationKind" ADD VALUE 'REWARD';
ALTER TYPE "NotificationKind" ADD VALUE 'MISS_YOU';

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "antolaOnToday" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "antolaTone" "AntolaTone" NOT NULL DEFAULT 'LIVELY',
ADD COLUMN     "gamificationEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "nextMissYouAt" TIMESTAMP(3),
ADD COLUMN     "nextStreakAt" TIMESTAMP(3),
ADD COLUMN     "notifyMissYou" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyRewards" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyStreakRisk" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "soundsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "UserStats" (
    "userId" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "crumbs" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "streakShields" INTEGER NOT NULL DEFAULT 0,
    "lastProductiveDay" DATE,
    "lastClosedDay" DATE,
    "lastMissYouAt" TIMESTAMP(3),
    "backfilledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserStats_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "XpEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "XpKind" NOT NULL,
    "refId" TEXT NOT NULL,
    "xp" INTEGER NOT NULL,
    "crumbs" INTEGER NOT NULL DEFAULT 0,
    "day" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XpEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreakDay" (
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "productive" BOOLEAN NOT NULL,
    "shieldUsed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "StreakDay_pkey" PRIMARY KEY ("userId","day")
);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("userId","achievementId")
);

-- CreateTable
CREATE TABLE "UserItem" (
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "equipped" BOOLEAN NOT NULL DEFAULT false,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserItem_pkey" PRIMARY KEY ("userId","itemId")
);

-- CreateTable
CREATE TABLE "WeeklyChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "slot" INTEGER NOT NULL,
    "kind" "ChallengeKind" NOT NULL,
    "target" INTEGER NOT NULL,
    "refId" TEXT,
    "label" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "rewardXp" INTEGER NOT NULL,
    "rewardCrumbs" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AntolaMessageLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "situation" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "shownAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AntolaMessageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserStats_lastClosedDay_idx" ON "UserStats"("lastClosedDay");

-- CreateIndex
CREATE INDEX "XpEvent_userId_day_idx" ON "XpEvent"("userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "XpEvent_userId_kind_refId_key" ON "XpEvent"("userId", "kind", "refId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyChallenge_userId_weekStart_slot_key" ON "WeeklyChallenge"("userId", "weekStart", "slot");

-- CreateIndex
CREATE INDEX "AntolaMessageLog_userId_shownAt_idx" ON "AntolaMessageLog"("userId", "shownAt");

-- CreateIndex
CREATE INDEX "Settings_nextStreakAt_idx" ON "Settings"("nextStreakAt");

-- CreateIndex
CREATE INDEX "Settings_nextMissYouAt_idx" ON "Settings"("nextMissYouAt");

-- AddForeignKey
ALTER TABLE "UserStats" ADD CONSTRAINT "UserStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XpEvent" ADD CONSTRAINT "XpEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreakDay" ADD CONSTRAINT "StreakDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserItem" ADD CONSTRAINT "UserItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyChallenge" ADD CONSTRAINT "WeeklyChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AntolaMessageLog" ADD CONSTRAINT "AntolaMessageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

