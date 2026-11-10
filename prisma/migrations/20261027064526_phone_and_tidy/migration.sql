/*
  Warnings:

  - You are about to drop the column `reminderSentAt` on the `CheckIn` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CheckIn" DROP COLUMN "reminderSentAt";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" TEXT;
