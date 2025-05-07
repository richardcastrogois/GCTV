-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "paymentVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentVerifiedDate" TIMESTAMP(3);
