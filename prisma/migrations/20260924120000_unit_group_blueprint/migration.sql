-- Vínculo tipologia ⇄ grupo de unidades (antes era só estado local da modal).
-- Aditiva: coluna nullable, nenhum dado existente muda.
ALTER TABLE "UnitGroup" ADD COLUMN "BlueprintId" INTEGER;

CREATE INDEX "UnitGroup_BlueprintId_idx" ON "UnitGroup"("BlueprintId");

ALTER TABLE "UnitGroup" ADD CONSTRAINT "UnitGroup_BlueprintId_fkey" FOREIGN KEY ("BlueprintId") REFERENCES "Blueprint"("Id") ON DELETE SET NULL ON UPDATE CASCADE;
