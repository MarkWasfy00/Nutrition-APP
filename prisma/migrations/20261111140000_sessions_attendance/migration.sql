-- Dated sessions (team-wide or one athlete's own) and coach-recorded attendance.
-- CreateEnum
CREATE TYPE "SessionKind" AS ENUM ('PRACTICE', 'MATCH', 'SC', 'RECOVERY', 'OTHER');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT');

-- CreateTable
CREATE TABLE "TeamSession" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "athleteId" TEXT,
    "kind" "SessionKind" NOT NULL,
    "title" TEXT,
    "day" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "location" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "markedById" TEXT,
    "markedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamSession_teamId_day_idx" ON "TeamSession"("teamId", "day");

-- CreateIndex
CREATE INDEX "TeamSession_athleteId_day_idx" ON "TeamSession"("athleteId", "day");

-- CreateIndex
CREATE INDEX "Attendance_athleteId_idx" ON "Attendance"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_sessionId_athleteId_key" ON "Attendance"("sessionId", "athleteId");

-- AddForeignKey
ALTER TABLE "TeamSession" ADD CONSTRAINT "TeamSession_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamSession" ADD CONSTRAINT "TeamSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamSession" ADD CONSTRAINT "TeamSession_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TeamSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

