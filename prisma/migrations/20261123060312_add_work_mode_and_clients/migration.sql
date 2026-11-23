-- CreateEnum
CREATE TYPE "WorkMode" AS ENUM ('SALARIED', 'FREELANCE', 'BOTH');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "workMode" "WorkMode" NOT NULL DEFAULT 'SALARIED';

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "phone" VARCHAR(20),
    "email" VARCHAR(254),
    "city" VARCHAR(80),
    "address" VARCHAR(200),
    "source" VARCHAR(60),
    "notes" VARCHAR(1000),
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Client_userId_archived_name_idx" ON "Client"("userId", "archived", "name");

-- CreateIndex
CREATE INDEX "Client_userId_createdAt_idx" ON "Client"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
