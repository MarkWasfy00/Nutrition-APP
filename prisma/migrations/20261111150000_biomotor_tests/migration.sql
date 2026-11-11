-- Biomotor testing assignments (team-wide or one athlete) and their results.
-- CreateTable
CREATE TABLE "BiomotorAssignment" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "athleteId" TEXT,
    "title" TEXT,
    "day" TEXT NOT NULL,
    "tests" TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BiomotorAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiomotorResult" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "recordedById" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BiomotorResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BiomotorAssignment_teamId_day_idx" ON "BiomotorAssignment"("teamId", "day");

-- CreateIndex
CREATE INDEX "BiomotorAssignment_athleteId_day_idx" ON "BiomotorAssignment"("athleteId", "day");

-- CreateIndex
CREATE INDEX "BiomotorResult_athleteId_testId_idx" ON "BiomotorResult"("athleteId", "testId");

-- CreateIndex
CREATE UNIQUE INDEX "BiomotorResult_assignmentId_athleteId_testId_key" ON "BiomotorResult"("assignmentId", "athleteId", "testId");

-- AddForeignKey
ALTER TABLE "BiomotorAssignment" ADD CONSTRAINT "BiomotorAssignment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiomotorAssignment" ADD CONSTRAINT "BiomotorAssignment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiomotorAssignment" ADD CONSTRAINT "BiomotorAssignment_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiomotorResult" ADD CONSTRAINT "BiomotorResult_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "BiomotorAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiomotorResult" ADD CONSTRAINT "BiomotorResult_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiomotorResult" ADD CONSTRAINT "BiomotorResult_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

