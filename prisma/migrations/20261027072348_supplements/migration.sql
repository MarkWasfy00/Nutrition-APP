-- AlterTable
ALTER TABLE "AthleteProfile" ADD COLUMN     "supplements" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "useSupplements" BOOLEAN NOT NULL DEFAULT false;
