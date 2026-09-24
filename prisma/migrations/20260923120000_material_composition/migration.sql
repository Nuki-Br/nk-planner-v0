-- Composição de custo (itens de custo v2): o custo base de um material passa a
-- ser custoMat × CostQuantity + custoMO + Σ(quantitativo × preço do insumo).
--   CostItem                 — insumo do catálogo da ORGANIZAÇÃO (cód, nome, unidade)
--   EnterpriseCostItemPrice  — preço do insumo POR EMPREENDIMENTO (NULL = pendente)
--   MaterialCompositionItem  — linha da composição de um BaseMaterial (catálogo)
--   BaseMaterial.CostQuantity — quantitativo do próprio material (1,2 = 20 % de quebra)
-- Os "itens de custo" satélites por componente de tipologia (RoomComponentCostItem)
-- e o registro avulso do ambiente (RoomCostRegistro) são REMOVIDOS sem conversão
-- (decisão de 2026-09-23 — dados de teste). Ver docs/decisions.md e
-- docs/features/pricing.md §2.

-- DropForeignKey
ALTER TABLE "RoomComponentCostItem" DROP CONSTRAINT "RoomComponentCostItem_RoomComponentId_fkey";

-- DropForeignKey
ALTER TABLE "RoomComponentCostItem" DROP CONSTRAINT "RoomComponentCostItem_BaseMaterialId_fkey";

-- DropForeignKey
ALTER TABLE "RoomComponentCostItem" DROP CONSTRAINT "RoomComponentCostItem_MaterialId_fkey";

-- DropForeignKey
ALTER TABLE "RoomCostRegistro" DROP CONSTRAINT "RoomCostRegistro_RoomId_fkey";

-- AlterTable
ALTER TABLE "BaseMaterial" ADD COLUMN     "CostQuantity" DOUBLE PRECISION NOT NULL DEFAULT 1;

-- DropTable
DROP TABLE "RoomComponentCostItem";

-- DropTable
DROP TABLE "RoomCostRegistro";

-- DropEnum
DROP TYPE "CostItemKind";

-- DropEnum
DROP TYPE "CostItemSide";

-- CreateTable
CREATE TABLE "CostItem" (
    "Id" SERIAL NOT NULL,
    "OrganizationId" TEXT NOT NULL,
    "Code" TEXT,
    "Name" TEXT NOT NULL,
    "Unit" TEXT NOT NULL,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostItem_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "EnterpriseCostItemPrice" (
    "Id" SERIAL NOT NULL,
    "EnterpriseId" INTEGER NOT NULL,
    "CostItemId" INTEGER NOT NULL,
    "UnitPriceInCents" INTEGER,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnterpriseCostItemPrice_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "MaterialCompositionItem" (
    "Id" SERIAL NOT NULL,
    "BaseMaterialId" INTEGER NOT NULL,
    "CostItemId" INTEGER NOT NULL,
    "Quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "Position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MaterialCompositionItem_pkey" PRIMARY KEY ("Id")
);

-- CreateIndex
CREATE INDEX "CostItem_OrganizationId_idx" ON "CostItem"("OrganizationId");

-- CreateIndex
CREATE INDEX "CostItem_OrganizationId_Code_idx" ON "CostItem"("OrganizationId", "Code");

-- CreateIndex
CREATE INDEX "EnterpriseCostItemPrice_EnterpriseId_idx" ON "EnterpriseCostItemPrice"("EnterpriseId");

-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseCostItemPrice_EnterpriseId_CostItemId_key" ON "EnterpriseCostItemPrice"("EnterpriseId", "CostItemId");

-- CreateIndex
CREATE INDEX "MaterialCompositionItem_CostItemId_idx" ON "MaterialCompositionItem"("CostItemId");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialCompositionItem_BaseMaterialId_CostItemId_key" ON "MaterialCompositionItem"("BaseMaterialId", "CostItemId");

-- AddForeignKey
ALTER TABLE "CostItem" ADD CONSTRAINT "CostItem_OrganizationId_fkey" FOREIGN KEY ("OrganizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseCostItemPrice" ADD CONSTRAINT "EnterpriseCostItemPrice_EnterpriseId_fkey" FOREIGN KEY ("EnterpriseId") REFERENCES "Enterprise"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseCostItemPrice" ADD CONSTRAINT "EnterpriseCostItemPrice_CostItemId_fkey" FOREIGN KEY ("CostItemId") REFERENCES "CostItem"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialCompositionItem" ADD CONSTRAINT "MaterialCompositionItem_BaseMaterialId_fkey" FOREIGN KEY ("BaseMaterialId") REFERENCES "BaseMaterial"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialCompositionItem" ADD CONSTRAINT "MaterialCompositionItem_CostItemId_fkey" FOREIGN KEY ("CostItemId") REFERENCES "CostItem"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

