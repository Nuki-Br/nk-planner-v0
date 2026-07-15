-- CreateEnum
CREATE TYPE "PlanningStatus" AS ENUM ('rascunho', 'em_preenchimento', 'em_revisao', 'publicado');

-- CreateEnum
CREATE TYPE "BlueprintStatus" AS ENUM ('completa', 'incompleta');

-- CreateEnum
CREATE TYPE "ColumnKind" AS ENUM ('free', 'rowTotal', 'rowAvg');

-- CreateEnum
CREATE TYPE "CommentAuthor" AS ENUM ('construtora', 'incorporadora');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "auth_user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "organization_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enterprise" (
    "Id" SERIAL NOT NULL,
    "OrganizationId" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "Developer" TEXT,
    "TowerLabel" TEXT,
    "Status" "PlanningStatus" NOT NULL DEFAULT 'rascunho',
    "SubmittedAtLabel" TEXT,
    "DeadlineLabel" TEXT,
    "PublishedAtLabel" TEXT,
    "TotalItems" INTEGER NOT NULL DEFAULT 0,
    "FilledItems" INTEGER NOT NULL DEFAULT 0,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enterprise_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Blueprint" (
    "Id" SERIAL NOT NULL,
    "EnterpriseId" INTEGER NOT NULL,
    "Name" TEXT NOT NULL,
    "Description" TEXT NOT NULL DEFAULT '',
    "AreaSqM" DOUBLE PRECISION,
    "UnitCount" INTEGER NOT NULL DEFAULT 0,
    "Status" "BlueprintStatus" NOT NULL DEFAULT 'incompleta',
    "Position" INTEGER NOT NULL DEFAULT 0,
    "ImageUrl" TEXT,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Blueprint_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Room" (
    "Id" SERIAL NOT NULL,
    "EnterpriseId" INTEGER NOT NULL,
    "Name" TEXT NOT NULL,
    "Icon" TEXT,
    "BaseImageUrl" TEXT,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "BlueprintRoom" (
    "Id" SERIAL NOT NULL,
    "BlueprintId" INTEGER NOT NULL,
    "RoomId" INTEGER NOT NULL,
    "Position" INTEGER NOT NULL DEFAULT 0,
    "Polygon" JSONB,
    "DrawnImageUrl" TEXT,

    CONSTRAINT "BlueprintRoom_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "RoomComponent" (
    "Id" SERIAL NOT NULL,
    "RoomId" INTEGER NOT NULL,
    "Name" TEXT NOT NULL,
    "Unit" TEXT NOT NULL,
    "DefaultMaterialId" INTEGER,
    "IsGhost" BOOLEAN NOT NULL DEFAULT false,
    "Position" INTEGER NOT NULL DEFAULT 0,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomComponent_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "BlueprintRoomComponent" (
    "Id" SERIAL NOT NULL,
    "BlueprintRoomId" INTEGER NOT NULL,
    "RoomComponentId" INTEGER NOT NULL,
    "UsageQuantity" DOUBLE PRECISION NOT NULL,
    "TechnicalReservePct" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "BlueprintRoomComponent_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Material" (
    "Id" SERIAL NOT NULL,
    "RoomComponentId" INTEGER NOT NULL,
    "RoomId" INTEGER NOT NULL,
    "EnterpriseId" INTEGER NOT NULL,
    "BaseMaterialId" INTEGER NOT NULL,
    "Position" INTEGER NOT NULL DEFAULT 0,
    "IsDefault" BOOLEAN NOT NULL DEFAULT false,
    "PriceInCents" INTEGER NOT NULL DEFAULT 0,
    "Name" TEXT,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "BaseMaterial" (
    "Id" SERIAL NOT NULL,
    "OrganizationId" TEXT NOT NULL,
    "CategoryId" INTEGER,
    "Type" TEXT NOT NULL DEFAULT 'single',
    "ReferenceCode" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "Manufacturer" TEXT,
    "Unit" TEXT,
    "CostMaterialInCents" INTEGER,
    "CostLaborInCents" INTEGER,
    "ImagePreviewUrl" TEXT,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BaseMaterial_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "MaterialCategory" (
    "Id" SERIAL NOT NULL,
    "OrganizationId" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "ColorScheme" TEXT,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialCategory_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "MaterialKitItem" (
    "Id" SERIAL NOT NULL,
    "ParentMaterialId" INTEGER NOT NULL,
    "ChildMaterialId" INTEGER NOT NULL,
    "Position" INTEGER NOT NULL DEFAULT 0,
    "DefaultUsageQuantity" DOUBLE PRECISION,

    CONSTRAINT "MaterialKitItem_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "MaterialKitUsage" (
    "Id" SERIAL NOT NULL,
    "BlueprintRoomComponentId" INTEGER NOT NULL,
    "KitItemId" INTEGER NOT NULL,
    "UsageQuantity" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "MaterialKitUsage_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "BudgetColumn" (
    "Id" SERIAL NOT NULL,
    "EnterpriseId" INTEGER NOT NULL,
    "Name" TEXT NOT NULL,
    "Kind" "ColumnKind" NOT NULL,
    "Expr" TEXT NOT NULL,
    "Visible" BOOLEAN NOT NULL DEFAULT false,
    "Position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BudgetColumn_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "BudgetVersion" (
    "Id" SERIAL NOT NULL,
    "EnterpriseId" INTEGER NOT NULL,
    "Label" TEXT NOT NULL,
    "CreatedAtLabel" TEXT NOT NULL,
    "CreatedBy" TEXT NOT NULL,
    "IsCurrent" BOOLEAN NOT NULL DEFAULT false,
    "Summary" TEXT NOT NULL,
    "Changes" JSONB NOT NULL,
    "Position" INTEGER NOT NULL DEFAULT 0,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetVersion_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "Id" SERIAL NOT NULL,
    "MaterialId" INTEGER NOT NULL,
    "EnterpriseId" INTEGER NOT NULL,
    "Author" "CommentAuthor" NOT NULL,
    "Text" TEXT NOT NULL,
    "DateLabel" TEXT NOT NULL,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "FillLink" (
    "Id" SERIAL NOT NULL,
    "EnterpriseId" INTEGER NOT NULL,
    "Token" TEXT NOT NULL,
    "BlueprintIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "Fields" JSONB NOT NULL,
    "DeadlineLabel" TEXT,
    "Password" TEXT,
    "CreatedAtLabel" TEXT NOT NULL,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FillLink_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "PortalFill" (
    "EnterpriseId" INTEGER NOT NULL,
    "BaseMaterialId" INTEGER NOT NULL,
    "Mat" TEXT NOT NULL,
    "Mo" TEXT NOT NULL,
    "Comment" TEXT NOT NULL,

    CONSTRAINT "PortalFill_pkey" PRIMARY KEY ("EnterpriseId","BaseMaterialId")
);

-- CreateTable
CREATE TABLE "Tower" (
    "Id" SERIAL NOT NULL,
    "EnterpriseId" INTEGER NOT NULL,
    "Name" TEXT NOT NULL,
    "Position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Tower_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "UnitGroup" (
    "Id" SERIAL NOT NULL,
    "EnterpriseId" INTEGER NOT NULL,
    "TowerId" INTEGER,
    "Name" TEXT NOT NULL,
    "UnitNumbers" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "UnitGroup_pkey" PRIMARY KEY ("Id")
);

-- CreateIndex
CREATE INDEX "memberships_organization_id_idx" ON "memberships"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_auth_user_id_organization_id_key" ON "memberships"("auth_user_id", "organization_id");

-- CreateIndex
CREATE INDEX "Enterprise_OrganizationId_idx" ON "Enterprise"("OrganizationId");

-- CreateIndex
CREATE INDEX "Blueprint_EnterpriseId_idx" ON "Blueprint"("EnterpriseId");

-- CreateIndex
CREATE INDEX "Room_EnterpriseId_idx" ON "Room"("EnterpriseId");

-- CreateIndex
CREATE INDEX "BlueprintRoom_BlueprintId_idx" ON "BlueprintRoom"("BlueprintId");

-- CreateIndex
CREATE INDEX "BlueprintRoom_RoomId_idx" ON "BlueprintRoom"("RoomId");

-- CreateIndex
CREATE UNIQUE INDEX "BlueprintRoom_BlueprintId_RoomId_key" ON "BlueprintRoom"("BlueprintId", "RoomId");

-- CreateIndex
CREATE INDEX "RoomComponent_RoomId_idx" ON "RoomComponent"("RoomId");

-- CreateIndex
CREATE INDEX "BlueprintRoomComponent_BlueprintRoomId_idx" ON "BlueprintRoomComponent"("BlueprintRoomId");

-- CreateIndex
CREATE INDEX "BlueprintRoomComponent_RoomComponentId_idx" ON "BlueprintRoomComponent"("RoomComponentId");

-- CreateIndex
CREATE UNIQUE INDEX "BlueprintRoomComponent_BlueprintRoomId_RoomComponentId_key" ON "BlueprintRoomComponent"("BlueprintRoomId", "RoomComponentId");

-- CreateIndex
CREATE INDEX "Material_RoomComponentId_idx" ON "Material"("RoomComponentId");

-- CreateIndex
CREATE INDEX "Material_BaseMaterialId_idx" ON "Material"("BaseMaterialId");

-- CreateIndex
CREATE INDEX "Material_EnterpriseId_idx" ON "Material"("EnterpriseId");

-- CreateIndex
CREATE UNIQUE INDEX "Material_RoomComponentId_BaseMaterialId_key" ON "Material"("RoomComponentId", "BaseMaterialId");

-- CreateIndex
CREATE INDEX "BaseMaterial_OrganizationId_idx" ON "BaseMaterial"("OrganizationId");

-- CreateIndex
CREATE INDEX "BaseMaterial_OrganizationId_Type_idx" ON "BaseMaterial"("OrganizationId", "Type");

-- CreateIndex
CREATE INDEX "BaseMaterial_OrganizationId_CategoryId_idx" ON "BaseMaterial"("OrganizationId", "CategoryId");

-- CreateIndex
CREATE INDEX "MaterialCategory_OrganizationId_idx" ON "MaterialCategory"("OrganizationId");

-- CreateIndex
CREATE INDEX "MaterialKitItem_ParentMaterialId_idx" ON "MaterialKitItem"("ParentMaterialId");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialKitItem_ParentMaterialId_ChildMaterialId_key" ON "MaterialKitItem"("ParentMaterialId", "ChildMaterialId");

-- CreateIndex
CREATE INDEX "MaterialKitUsage_BlueprintRoomComponentId_idx" ON "MaterialKitUsage"("BlueprintRoomComponentId");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialKitUsage_BlueprintRoomComponentId_KitItemId_key" ON "MaterialKitUsage"("BlueprintRoomComponentId", "KitItemId");

-- CreateIndex
CREATE INDEX "BudgetColumn_EnterpriseId_idx" ON "BudgetColumn"("EnterpriseId");

-- CreateIndex
CREATE INDEX "BudgetVersion_EnterpriseId_idx" ON "BudgetVersion"("EnterpriseId");

-- CreateIndex
CREATE INDEX "Comment_MaterialId_idx" ON "Comment"("MaterialId");

-- CreateIndex
CREATE INDEX "Comment_EnterpriseId_idx" ON "Comment"("EnterpriseId");

-- CreateIndex
CREATE UNIQUE INDEX "FillLink_Token_key" ON "FillLink"("Token");

-- CreateIndex
CREATE INDEX "FillLink_EnterpriseId_idx" ON "FillLink"("EnterpriseId");

-- CreateIndex
CREATE INDEX "Tower_EnterpriseId_idx" ON "Tower"("EnterpriseId");

-- CreateIndex
CREATE INDEX "UnitGroup_EnterpriseId_idx" ON "UnitGroup"("EnterpriseId");

-- CreateIndex
CREATE INDEX "UnitGroup_TowerId_idx" ON "UnitGroup"("TowerId");

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enterprise" ADD CONSTRAINT "Enterprise_OrganizationId_fkey" FOREIGN KEY ("OrganizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blueprint" ADD CONSTRAINT "Blueprint_EnterpriseId_fkey" FOREIGN KEY ("EnterpriseId") REFERENCES "Enterprise"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_EnterpriseId_fkey" FOREIGN KEY ("EnterpriseId") REFERENCES "Enterprise"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintRoom" ADD CONSTRAINT "BlueprintRoom_BlueprintId_fkey" FOREIGN KEY ("BlueprintId") REFERENCES "Blueprint"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintRoom" ADD CONSTRAINT "BlueprintRoom_RoomId_fkey" FOREIGN KEY ("RoomId") REFERENCES "Room"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomComponent" ADD CONSTRAINT "RoomComponent_RoomId_fkey" FOREIGN KEY ("RoomId") REFERENCES "Room"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomComponent" ADD CONSTRAINT "RoomComponent_DefaultMaterialId_fkey" FOREIGN KEY ("DefaultMaterialId") REFERENCES "Material"("Id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintRoomComponent" ADD CONSTRAINT "BlueprintRoomComponent_BlueprintRoomId_fkey" FOREIGN KEY ("BlueprintRoomId") REFERENCES "BlueprintRoom"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintRoomComponent" ADD CONSTRAINT "BlueprintRoomComponent_RoomComponentId_fkey" FOREIGN KEY ("RoomComponentId") REFERENCES "RoomComponent"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_RoomComponentId_fkey" FOREIGN KEY ("RoomComponentId") REFERENCES "RoomComponent"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_RoomId_fkey" FOREIGN KEY ("RoomId") REFERENCES "Room"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_EnterpriseId_fkey" FOREIGN KEY ("EnterpriseId") REFERENCES "Enterprise"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_BaseMaterialId_fkey" FOREIGN KEY ("BaseMaterialId") REFERENCES "BaseMaterial"("Id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaseMaterial" ADD CONSTRAINT "BaseMaterial_OrganizationId_fkey" FOREIGN KEY ("OrganizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaseMaterial" ADD CONSTRAINT "BaseMaterial_CategoryId_fkey" FOREIGN KEY ("CategoryId") REFERENCES "MaterialCategory"("Id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialCategory" ADD CONSTRAINT "MaterialCategory_OrganizationId_fkey" FOREIGN KEY ("OrganizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialKitItem" ADD CONSTRAINT "MaterialKitItem_ParentMaterialId_fkey" FOREIGN KEY ("ParentMaterialId") REFERENCES "BaseMaterial"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialKitItem" ADD CONSTRAINT "MaterialKitItem_ChildMaterialId_fkey" FOREIGN KEY ("ChildMaterialId") REFERENCES "BaseMaterial"("Id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialKitUsage" ADD CONSTRAINT "MaterialKitUsage_BlueprintRoomComponentId_fkey" FOREIGN KEY ("BlueprintRoomComponentId") REFERENCES "BlueprintRoomComponent"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialKitUsage" ADD CONSTRAINT "MaterialKitUsage_KitItemId_fkey" FOREIGN KEY ("KitItemId") REFERENCES "MaterialKitItem"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetColumn" ADD CONSTRAINT "BudgetColumn_EnterpriseId_fkey" FOREIGN KEY ("EnterpriseId") REFERENCES "Enterprise"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetVersion" ADD CONSTRAINT "BudgetVersion_EnterpriseId_fkey" FOREIGN KEY ("EnterpriseId") REFERENCES "Enterprise"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_MaterialId_fkey" FOREIGN KEY ("MaterialId") REFERENCES "Material"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_EnterpriseId_fkey" FOREIGN KEY ("EnterpriseId") REFERENCES "Enterprise"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FillLink" ADD CONSTRAINT "FillLink_EnterpriseId_fkey" FOREIGN KEY ("EnterpriseId") REFERENCES "Enterprise"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalFill" ADD CONSTRAINT "PortalFill_EnterpriseId_fkey" FOREIGN KEY ("EnterpriseId") REFERENCES "Enterprise"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalFill" ADD CONSTRAINT "PortalFill_BaseMaterialId_fkey" FOREIGN KEY ("BaseMaterialId") REFERENCES "BaseMaterial"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tower" ADD CONSTRAINT "Tower_EnterpriseId_fkey" FOREIGN KEY ("EnterpriseId") REFERENCES "Enterprise"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitGroup" ADD CONSTRAINT "UnitGroup_EnterpriseId_fkey" FOREIGN KEY ("EnterpriseId") REFERENCES "Enterprise"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitGroup" ADD CONSTRAINT "UnitGroup_TowerId_fkey" FOREIGN KEY ("TowerId") REFERENCES "Tower"("Id") ON DELETE SET NULL ON UPDATE CASCADE;

