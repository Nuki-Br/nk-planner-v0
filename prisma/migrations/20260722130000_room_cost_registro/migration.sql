-- Linha-registro passa a ser de nível AMBIENTE (RoomCostRegistro), avulsa e com
-- nome em texto livre — deixa de ser uma flag no item de custo do componente.

-- DropColumn: a flag no item de componente
ALTER TABLE "RoomComponentCostItem" DROP COLUMN "Registro";

-- CreateTable
CREATE TABLE "RoomCostRegistro" (
    "Id" SERIAL NOT NULL,
    "RoomId" INTEGER NOT NULL,
    "Name" TEXT NOT NULL,
    "BaseMaterialId" INTEGER NOT NULL,
    "Unit" TEXT NOT NULL,
    "UsageQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "Position" INTEGER NOT NULL DEFAULT 0,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomCostRegistro_pkey" PRIMARY KEY ("Id")
);

-- CreateIndex
CREATE INDEX "RoomCostRegistro_RoomId_idx" ON "RoomCostRegistro"("RoomId");

-- CreateIndex
CREATE INDEX "RoomCostRegistro_BaseMaterialId_idx" ON "RoomCostRegistro"("BaseMaterialId");

-- AddForeignKey
ALTER TABLE "RoomCostRegistro" ADD CONSTRAINT "RoomCostRegistro_RoomId_fkey" FOREIGN KEY ("RoomId") REFERENCES "Room"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomCostRegistro" ADD CONSTRAINT "RoomCostRegistro_BaseMaterialId_fkey" FOREIGN KEY ("BaseMaterialId") REFERENCES "BaseMaterial"("Id") ON DELETE RESTRICT ON UPDATE CASCADE;
