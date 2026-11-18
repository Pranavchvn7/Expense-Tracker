-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "color" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "country" VARCHAR(2),
ADD COLUMN     "timezone" VARCHAR(64);
