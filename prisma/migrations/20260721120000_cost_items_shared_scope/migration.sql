-- Itens de custo: totalmente compartilhados entre plantas + escopo por opção.
--   · UsageQuantity migra da CostItemUsage (por planta) para o próprio item.
--   · MaterialId dá o escopo: NULL = todas as opções; preenchido = avulso.
--   · CostItemUsage deixa de existir.

-- AlterTable: novas colunas no item de custo
ALTER TABLE "RoomComponentCostItem"
  ADD COLUMN "MaterialId" INTEGER,
  ADD COLUMN "UsageQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Backfill: colapsa o quantitativo (antes por planta) numa quantidade
-- representativa por item — como agora é compartilhado, escolhe o MAX.
UPDATE "RoomComponentCostItem" AS ci
SET "UsageQuantity" = agg."q"
FROM (
  SELECT "CostItemId", MAX("UsageQuantity") AS "q"
  FROM "CostItemUsage"
  GROUP BY "CostItemId"
) AS agg
WHERE agg."CostItemId" = ci."Id";

-- DropForeignKey / DropTable: CostItemUsage
ALTER TABLE "CostItemUsage" DROP CONSTRAINT "CostItemUsage_BlueprintRoomComponentId_fkey";
ALTER TABLE "CostItemUsage" DROP CONSTRAINT "CostItemUsage_CostItemId_fkey";
DROP TABLE "CostItemUsage";

-- CreateIndex
CREATE INDEX "RoomComponentCostItem_MaterialId_idx" ON "RoomComponentCostItem"("MaterialId");

-- AddForeignKey
ALTER TABLE "RoomComponentCostItem" ADD CONSTRAINT "RoomComponentCostItem_MaterialId_fkey" FOREIGN KEY ("MaterialId") REFERENCES "Material"("Id") ON DELETE CASCADE ON UPDATE CASCADE;
