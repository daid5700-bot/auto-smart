-- DropForeignKey
ALTER TABLE "TechPerformance" DROP CONSTRAINT "TechPerformance_technicianId_fkey";

-- AlterTable
ALTER TABLE "Technician" DROP COLUMN "commissionRate";

-- DropTable
DROP TABLE "TechPerformance";
