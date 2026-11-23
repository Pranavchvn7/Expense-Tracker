-- CreateEnum
CREATE TYPE "JobCostKind" AS ENUM ('TRAVEL', 'ASSISTANT', 'PRODUCTS', 'OTHER');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "costKind" "JobCostKind",
ADD COLUMN     "jobId" TEXT,
ADD COLUMN     "payee" VARCHAR(80);

-- CreateIndex
CREATE INDEX "Expense_userId_jobId_idx" ON "Expense"("userId", "jobId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
