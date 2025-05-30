/*
  Warnings:

  - You are about to drop the column `paymentVerified` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `paymentVerifiedDate` on the `Client` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Client" DROP COLUMN "paymentVerified",
DROP COLUMN "paymentVerifiedDate",
ADD COLUMN     "paymentHistory" JSONB;
