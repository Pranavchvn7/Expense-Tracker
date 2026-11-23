-- CreateEnum
CREATE TYPE "PaymentKind" AS ENUM ('ADVANCE', 'PARTIAL', 'FINAL');

-- AlterTable
ALTER TABLE "Income" ADD COLUMN     "jobId" TEXT,
ADD COLUMN     "paymentKind" "PaymentKind";

-- CreateIndex
CREATE INDEX "Income_userId_jobId_idx" ON "Income"("userId", "jobId");

-- AddForeignKey
ALTER TABLE "Income" ADD CONSTRAINT "Income_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
