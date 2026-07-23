-- Linha-registro passa a ter valor unitário digitado (R$), sem material de
-- catálogo — é só um registro de custo.

-- DropForeignKey / DropIndex / DropColumn: material
ALTER TABLE "RoomCostRegistro" DROP CONSTRAINT "RoomCostRegistro_BaseMaterialId_fkey";
DROP INDEX "RoomCostRegistro_BaseMaterialId_idx";
ALTER TABLE "RoomCostRegistro" DROP COLUMN "BaseMaterialId";

-- AddColumn: valor unitário
ALTER TABLE "RoomCostRegistro" ADD COLUMN "UnitCost" DOUBLE PRECISION NOT NULL DEFAULT 0;
