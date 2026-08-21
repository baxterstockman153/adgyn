-- AlterTable
ALTER TABLE "clicks" ADD COLUMN     "visitor_id" TEXT;

-- AlterTable
ALTER TABLE "scans" ADD COLUMN     "is_returning" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "visitor_id" TEXT;
