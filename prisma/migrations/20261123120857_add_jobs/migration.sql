-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('ENQUIRY', 'BOOKED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "serviceType" VARCHAR(60),
    "eventDate" DATE NOT NULL,
    "startTime" VARCHAR(5),
    "endTime" VARCHAR(5),
    "location" VARCHAR(200),
    "status" "JobStatus" NOT NULL DEFAULT 'BOOKED',
    "agreedAmountMinor" INTEGER NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL,
    "notes" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Job_userId_eventDate_idx" ON "Job"("userId", "eventDate");

-- CreateIndex
CREATE INDEX "Job_userId_clientId_idx" ON "Job"("userId", "clientId");

-- CreateIndex
CREATE INDEX "Job_userId_status_eventDate_idx" ON "Job"("userId", "status", "eventDate");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
