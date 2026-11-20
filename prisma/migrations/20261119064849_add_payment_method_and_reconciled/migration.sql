-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'UPI', 'BANK_TRANSFER', 'WALLET', 'OTHER');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "paymentMethod" "PaymentMethod",
ADD COLUMN     "reconciled" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Expense_userId_paymentMethod_spentOn_idx" ON "Expense"("userId", "paymentMethod", "spentOn");
