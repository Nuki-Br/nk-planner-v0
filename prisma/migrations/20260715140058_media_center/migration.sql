-- CreateEnum
CREATE TYPE "MediaFileStatus" AS ENUM ('Pending', 'Active', 'Deleted');

-- CreateEnum
CREATE TYPE "MediaFileType" AS ENUM ('Image', 'Document');

-- AlterTable
ALTER TABLE "BaseMaterial" ADD COLUMN     "MediaFileId" INTEGER;

-- AlterTable
ALTER TABLE "Blueprint" ADD COLUMN     "MediaFileId" INTEGER;

-- AlterTable
ALTER TABLE "BlueprintRoom" ADD COLUMN     "MediaFileId" INTEGER;

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "MediaFileId" INTEGER;

-- CreateTable
CREATE TABLE "MediaFolder" (
    "Id" SERIAL NOT NULL,
    "OrganizationId" TEXT NOT NULL,
    "ParentFolderId" INTEGER,
    "Name" TEXT NOT NULL,
    "Slug" TEXT NOT NULL,
    "Depth" INTEGER NOT NULL DEFAULT 0,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaFolder_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "MediaFile" (
    "Id" SERIAL NOT NULL,
    "OrganizationId" TEXT NOT NULL,
    "FolderId" INTEGER,
    "UploadedById" TEXT NOT NULL,
    "DisplayName" TEXT NOT NULL,
    "OriginalFilename" TEXT NOT NULL,
    "StoragePath" TEXT NOT NULL,
    "StorageContainer" TEXT NOT NULL,
    "PublicUrl" TEXT,
    "PublicOptimizedUrl" TEXT,
    "MimeType" TEXT NOT NULL,
    "FileType" "MediaFileType" NOT NULL,
    "SizeBytes" BIGINT NOT NULL,
    "Width" INTEGER,
    "Height" INTEGER,
    "Status" "MediaFileStatus" NOT NULL DEFAULT 'Pending',
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaFile_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "StorageUsage" (
    "Id" SERIAL NOT NULL,
    "OrganizationId" TEXT NOT NULL,
    "UsedBytes" BIGINT NOT NULL DEFAULT 0,
    "FileCount" INTEGER NOT NULL DEFAULT 0,
    "UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StorageUsage_pkey" PRIMARY KEY ("Id")
);

-- CreateIndex
CREATE INDEX "MediaFolder_OrganizationId_ParentFolderId_idx" ON "MediaFolder"("OrganizationId", "ParentFolderId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaFolder_OrganizationId_ParentFolderId_Name_key" ON "MediaFolder"("OrganizationId", "ParentFolderId", "Name");

-- CreateIndex
CREATE INDEX "MediaFile_OrganizationId_Status_FolderId_idx" ON "MediaFile"("OrganizationId", "Status", "FolderId");

-- CreateIndex
CREATE INDEX "MediaFile_OrganizationId_Status_CreatedAt_idx" ON "MediaFile"("OrganizationId", "Status", "CreatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MediaFile_StorageContainer_StoragePath_key" ON "MediaFile"("StorageContainer", "StoragePath");

-- CreateIndex
CREATE UNIQUE INDEX "StorageUsage_OrganizationId_key" ON "StorageUsage"("OrganizationId");

-- CreateIndex
CREATE INDEX "BaseMaterial_MediaFileId_idx" ON "BaseMaterial"("MediaFileId");

-- CreateIndex
CREATE INDEX "Blueprint_MediaFileId_idx" ON "Blueprint"("MediaFileId");

-- CreateIndex
CREATE INDEX "BlueprintRoom_MediaFileId_idx" ON "BlueprintRoom"("MediaFileId");

-- CreateIndex
CREATE INDEX "Room_MediaFileId_idx" ON "Room"("MediaFileId");

-- AddForeignKey
ALTER TABLE "Blueprint" ADD CONSTRAINT "Blueprint_MediaFileId_fkey" FOREIGN KEY ("MediaFileId") REFERENCES "MediaFile"("Id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_MediaFileId_fkey" FOREIGN KEY ("MediaFileId") REFERENCES "MediaFile"("Id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintRoom" ADD CONSTRAINT "BlueprintRoom_MediaFileId_fkey" FOREIGN KEY ("MediaFileId") REFERENCES "MediaFile"("Id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaseMaterial" ADD CONSTRAINT "BaseMaterial_MediaFileId_fkey" FOREIGN KEY ("MediaFileId") REFERENCES "MediaFile"("Id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaFolder" ADD CONSTRAINT "MediaFolder_OrganizationId_fkey" FOREIGN KEY ("OrganizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaFolder" ADD CONSTRAINT "MediaFolder_ParentFolderId_fkey" FOREIGN KEY ("ParentFolderId") REFERENCES "MediaFolder"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "MediaFile" ADD CONSTRAINT "MediaFile_OrganizationId_fkey" FOREIGN KEY ("OrganizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaFile" ADD CONSTRAINT "MediaFile_FolderId_fkey" FOREIGN KEY ("FolderId") REFERENCES "MediaFolder"("Id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorageUsage" ADD CONSTRAINT "StorageUsage_OrganizationId_fkey" FOREIGN KEY ("OrganizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
