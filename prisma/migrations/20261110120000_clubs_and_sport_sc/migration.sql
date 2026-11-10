-- FUELX for clubs: coach-managed teams with per-seat billing, sport-specific S&C.
-- Individual subscriptions can't be mapped onto a team, so they are removed.
-- Existing users keep their data; they have no team until they join one with an invite code.

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('COACH', 'ATHLETE');

-- CreateEnum
CREATE TYPE "SeasonPhase" AS ENUM ('OFF_SEASON', 'PRE_SEASON', 'IN_SEASON');

-- CreateEnum
CREATE TYPE "ExerciseMeasure" AS ENUM ('LOAD_REPS', 'REPS', 'TIME', 'DISTANCE');

-- Individual (per-user) subscriptions are replaced by team subscriptions.
DELETE FROM "Subscription";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_userId_fkey";

-- DropIndex
DROP INDEX "Subscription_userId_key";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'ATHLETE',
ADD COLUMN     "teamId" TEXT;

-- AlterTable
ALTER TABLE "AthleteProfile" ADD COLUMN     "consentById" TEXT,
ADD COLUMN     "consentConfirmedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "userId",
ADD COLUMN     "teamId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "isTopUp" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "seats" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "teamId" TEXT;

-- AlterTable
ALTER TABLE "TrainingPreference" DROP COLUMN "split",
ALTER COLUMN "equipment" SET DEFAULT 'GYM';

-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "measure" "ExerciseMeasure" NOT NULL DEFAULT 'LOAD_REPS';

-- AlterTable
ALTER TABLE "TrainingProgram" DROP COLUMN "split",
ADD COLUMN     "phase" "SeasonPhase" NOT NULL DEFAULT 'OFF_SEASON';

-- AlterTable
ALTER TABLE "ProgramExercise" ADD COLUMN     "distanceM" INTEGER;

-- AlterTable
ALTER TABLE "SetLog" ADD COLUMN     "durationSec" INTEGER,
ALTER COLUMN "weightKg" SET DEFAULT 0;

-- DropEnum
DROP TYPE "Split";

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "seats" INTEGER NOT NULL DEFAULT 0,
    "nextSeats" INTEGER,
    "phase" "SeasonPhase" NOT NULL DEFAULT 'OFF_SEASON',
    "practiceWeekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "matchWeekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_inviteCode_key" ON "Team"("inviteCode");

-- CreateIndex
CREATE INDEX "User_teamId_role_idx" ON "User"("teamId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_teamId_key" ON "Subscription"("teamId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
