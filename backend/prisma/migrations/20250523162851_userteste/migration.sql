/*
  Warnings:

  - Made the column `userId` on table `Client` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Client" ALTER COLUMN "userId" SET NOT NULL;
