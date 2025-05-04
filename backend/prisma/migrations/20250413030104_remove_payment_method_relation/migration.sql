/*
  Warnings:

  - You are about to drop the column `paymentMethodId` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the `PaymentMethod` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `paymentMethod` to the `Client` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Client" DROP CONSTRAINT "Client_paymentMethodId_fkey";

-- AlterTable
ALTER TABLE "Client" DROP COLUMN "paymentMethodId",
ADD COLUMN     "paymentMethod" TEXT NOT NULL;

-- DropTable
DROP TABLE "PaymentMethod";
