-- CreateEnum
CREATE TYPE "CostItemKind" AS ENUM ('espelho', 'fixo');

-- CreateEnum
CREATE TYPE "CostItemSide" AS ENUM ('padrao', 'upgrade');

-- CreateTable
CREATE TABLE "RoomComponentCostItem" (
    "Id" SERIAL NOT NULL,
    "RoomComponentId" INTEGER NOT NULL,
    "Name" TEXT NOT NULL,
    "Kind" "CostItemKind" NOT NULL,
    "Side" "CostItemSide" NOT NULL DEFAULT 'upgrade',
    "BaseMaterialId" INTEGER,
    "Unit" TEXT NOT NULL,
    "Position" INTEGER NOT NULL DEFAULT 0,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomComponentCostItem_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "CostItemUsage" (
    "Id" SERIAL NOT NULL,
    "BlueprintRoomComponentId" INTEGER NOT NULL,
    "CostItemId" INTEGER NOT NULL,
    "UsageQuantity" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CostItemUsage_pkey" PRIMARY KEY ("Id")
);

-- CreateIndex
CREATE INDEX "RoomComponentCostItem_RoomComponentId_idx" ON "RoomComponentCostItem"("RoomComponentId");

-- CreateIndex
CREATE INDEX "RoomComponentCostItem_BaseMaterialId_idx" ON "RoomComponentCostItem"("BaseMaterialId");

-- CreateIndex
CREATE INDEX "CostItemUsage_BlueprintRoomComponentId_idx" ON "CostItemUsage"("BlueprintRoomComponentId");

-- CreateIndex
CREATE UNIQUE INDEX "CostItemUsage_BlueprintRoomComponentId_CostItemId_key" ON "CostItemUsage"("BlueprintRoomComponentId", "CostItemId");

-- AddForeignKey
ALTER TABLE "RoomComponentCostItem" ADD CONSTRAINT "RoomComponentCostItem_RoomComponentId_fkey" FOREIGN KEY ("RoomComponentId") REFERENCES "RoomComponent"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomComponentCostItem" ADD CONSTRAINT "RoomComponentCostItem_BaseMaterialId_fkey" FOREIGN KEY ("BaseMaterialId") REFERENCES "BaseMaterial"("Id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostItemUsage" ADD CONSTRAINT "CostItemUsage_BlueprintRoomComponentId_fkey" FOREIGN KEY ("BlueprintRoomComponentId") REFERENCES "BlueprintRoomComponent"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostItemUsage" ADD CONSTRAINT "CostItemUsage_CostItemId_fkey" FOREIGN KEY ("CostItemId") REFERENCES "RoomComponentCostItem"("Id") ON DELETE CASCADE ON UPDATE CASCADE;
