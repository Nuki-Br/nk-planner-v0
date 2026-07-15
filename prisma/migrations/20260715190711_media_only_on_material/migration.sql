/*
  Warnings:

  - You are about to drop the column `ImageUrl` on the `Blueprint` table. All the data in the column will be lost.
  - You are about to drop the column `MediaFileId` on the `Blueprint` table. All the data in the column will be lost.
  - You are about to drop the column `DrawnImageUrl` on the `BlueprintRoom` table. All the data in the column will be lost.
  - You are about to drop the column `MediaFileId` on the `BlueprintRoom` table. All the data in the column will be lost.
  - You are about to drop the column `BaseImageUrl` on the `Room` table. All the data in the column will be lost.
  - You are about to drop the column `MediaFileId` on the `Room` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Blueprint" DROP CONSTRAINT "Blueprint_MediaFileId_fkey";

-- DropForeignKey
ALTER TABLE "BlueprintRoom" DROP CONSTRAINT "BlueprintRoom_MediaFileId_fkey";

-- DropForeignKey
ALTER TABLE "Room" DROP CONSTRAINT "Room_MediaFileId_fkey";

-- DropIndex
DROP INDEX "Blueprint_MediaFileId_idx";

-- DropIndex
DROP INDEX "BlueprintRoom_MediaFileId_idx";

-- DropIndex
DROP INDEX "Room_MediaFileId_idx";

-- AlterTable
ALTER TABLE "Blueprint" DROP COLUMN "ImageUrl",
DROP COLUMN "MediaFileId";

-- AlterTable
ALTER TABLE "BlueprintRoom" DROP COLUMN "DrawnImageUrl",
DROP COLUMN "MediaFileId";

-- AlterTable
ALTER TABLE "Room" DROP COLUMN "BaseImageUrl",
DROP COLUMN "MediaFileId";
