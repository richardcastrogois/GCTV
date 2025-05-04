/*
  Warnings:

  - You are about to drop the column `discount` on the `PaymentMethod` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Client" DROP CONSTRAINT "Client_paymentMethodId_fkey";

-- DropForeignKey
ALTER TABLE "Client" DROP CONSTRAINT "Client_planId_fkey";

-- AlterTable
ALTER TABLE "Client" ALTER COLUMN "paymentMethodId" SET DEFAULT 999,
ALTER COLUMN "planId" SET DEFAULT 999;

-- AlterTable
ALTER TABLE "PaymentMethod" DROP COLUMN "discount";

-- CreateTable
CREATE TABLE "PlanPaymentMethodDiscount" (
    "id" SERIAL NOT NULL,
    "planId" INTEGER NOT NULL,
    "paymentMethodId" INTEGER NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanPaymentMethodDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanPaymentMethodDiscount_planId_paymentMethodId_key" ON "PlanPaymentMethodDiscount"("planId", "paymentMethodId");

-- AddForeignKey
ALTER TABLE "PlanPaymentMethodDiscount" ADD CONSTRAINT "PlanPaymentMethodDiscount_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanPaymentMethodDiscount" ADD CONSTRAINT "PlanPaymentMethodDiscount_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET DEFAULT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE SET DEFAULT ON UPDATE CASCADE;
