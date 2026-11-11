-- Coaches can edit an athlete's S&C sessions; edited sessions survive automatic rebuilds.
ALTER TABLE "ProgramDay" ADD COLUMN "editedAt" TIMESTAMP(3);
