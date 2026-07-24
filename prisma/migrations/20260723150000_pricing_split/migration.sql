-- Split de precificação: BaseMaterial vira template puro, o custo base passa a
-- ser por empreendimento e a precificação ganha duas camadas (rascunho em
-- MaterialPricing, publicado no Material). Ver docs/features/pricing.md.
--
-- Ordem obrigatória: criar tabelas → criar colunas novas → BACKFILL → dropar as
-- antigas. O backfill lê CostMaterialInCents/CostLaborInCents do BaseMaterial,
-- então tem que rodar antes do DROP.

-- ─── 1. Custo base por empreendimento ───────────────────────────────────

CREATE TABLE "EnterpriseMaterialCost" (
    "Id" SERIAL NOT NULL,
    "EnterpriseId" INTEGER NOT NULL,
    "BaseMaterialId" INTEGER NOT NULL,
    "CostMaterialInCents" INTEGER,
    "CostLaborInCents" INTEGER,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnterpriseMaterialCost_pkey" PRIMARY KEY ("Id")
);

CREATE UNIQUE INDEX "EnterpriseMaterialCost_EnterpriseId_BaseMaterialId_key"
    ON "EnterpriseMaterialCost"("EnterpriseId", "BaseMaterialId");
CREATE INDEX "EnterpriseMaterialCost_EnterpriseId_idx"
    ON "EnterpriseMaterialCost"("EnterpriseId");

ALTER TABLE "EnterpriseMaterialCost" ADD CONSTRAINT "EnterpriseMaterialCost_EnterpriseId_fkey"
    FOREIGN KEY ("EnterpriseId") REFERENCES "Enterprise"("Id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnterpriseMaterialCost" ADD CONSTRAINT "EnterpriseMaterialCost_BaseMaterialId_fkey"
    FOREIGN KEY ("BaseMaterialId") REFERENCES "BaseMaterial"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── 2. Rascunho de precificação (1:1 com Material) ─────────────────────

CREATE TABLE "MaterialPricing" (
    "Id" SERIAL NOT NULL,
    "MaterialId" INTEGER NOT NULL,
    "EnterpriseId" INTEGER NOT NULL,
    "UnitCostInCents" INTEGER,
    "UsageQuantity" DOUBLE PRECISION,
    "TechnicalReservePct" DOUBLE PRECISION,
    "Unit" TEXT,
    "ColumnOverrides" JSONB NOT NULL DEFAULT '{}',
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialPricing_pkey" PRIMARY KEY ("Id")
);

CREATE UNIQUE INDEX "MaterialPricing_MaterialId_key" ON "MaterialPricing"("MaterialId");
CREATE INDEX "MaterialPricing_EnterpriseId_idx" ON "MaterialPricing"("EnterpriseId");

ALTER TABLE "MaterialPricing" ADD CONSTRAINT "MaterialPricing_MaterialId_fkey"
    FOREIGN KEY ("MaterialId") REFERENCES "Material"("Id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaterialPricing" ADD CONSTRAINT "MaterialPricing_EnterpriseId_fkey"
    FOREIGN KEY ("EnterpriseId") REFERENCES "Enterprise"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── 3. Material vira a camada publicada ────────────────────────────────

-- PriceInCents era NOT NULL DEFAULT 0 e nunca era escrito; vira nullable, onde
-- NULL = nunca publicado (0 passaria por "publicado de graça" na UI).
ALTER TABLE "Material" ALTER COLUMN "PriceInCents" DROP NOT NULL;
ALTER TABLE "Material" ALTER COLUMN "PriceInCents" DROP DEFAULT;
UPDATE "Material" SET "PriceInCents" = NULL;

ALTER TABLE "Material" ADD COLUMN "PublishedSnapshot" JSONB;
ALTER TABLE "Material" ADD COLUMN "PublishedAt" TIMESTAMPTZ;
ALTER TABLE "Material" ADD COLUMN "PublishedVersionId" INTEGER;

CREATE INDEX "Material_PublishedVersionId_idx" ON "Material"("PublishedVersionId");
ALTER TABLE "Material" ADD CONSTRAINT "Material_PublishedVersionId_fkey"
    FOREIGN KEY ("PublishedVersionId") REFERENCES "BudgetVersion"("Id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── 4. Backfill: custo do catálogo → custo do empreendimento ───────────

-- 4a. Materiais aplicados como opção de componente.
INSERT INTO "EnterpriseMaterialCost" ("EnterpriseId", "BaseMaterialId", "CostMaterialInCents", "CostLaborInCents")
SELECT DISTINCT m."EnterpriseId", bm."Id", bm."CostMaterialInCents", bm."CostLaborInCents"
  FROM "Material" m
  JOIN "BaseMaterial" bm ON bm."Id" = m."BaseMaterialId"
 WHERE bm."CostMaterialInCents" IS NOT NULL
    OR bm."CostLaborInCents" IS NOT NULL
ON CONFLICT ("EnterpriseId", "BaseMaterialId") DO NOTHING;

-- 4b. Materiais usados só como item de custo "fixo" (satélite) — não têm linha
--     em Material, então o empreendimento vem por Room.
INSERT INTO "EnterpriseMaterialCost" ("EnterpriseId", "BaseMaterialId", "CostMaterialInCents", "CostLaborInCents")
SELECT DISTINCT r."EnterpriseId", bm."Id", bm."CostMaterialInCents", bm."CostLaborInCents"
  FROM "RoomComponentCostItem" ci
  JOIN "RoomComponent" rc ON rc."Id" = ci."RoomComponentId"
  JOIN "Room" r ON r."Id" = rc."RoomId"
  JOIN "BaseMaterial" bm ON bm."Id" = ci."BaseMaterialId"
 WHERE ci."BaseMaterialId" IS NOT NULL
   AND (bm."CostMaterialInCents" IS NOT NULL OR bm."CostLaborInCents" IS NOT NULL)
ON CONFLICT ("EnterpriseId", "BaseMaterialId") DO NOTHING;

-- 4c. Sub-itens de kit: o kit não tem custo próprio, quem tem é o material
--     filho — que pode não aparecer em nenhum Material do empreendimento.
INSERT INTO "EnterpriseMaterialCost" ("EnterpriseId", "BaseMaterialId", "CostMaterialInCents", "CostLaborInCents")
SELECT DISTINCT m."EnterpriseId", child."Id", child."CostMaterialInCents", child."CostLaborInCents"
  FROM "Material" m
  JOIN "MaterialKitItem" ki ON ki."ParentMaterialId" = m."BaseMaterialId"
  JOIN "BaseMaterial" child ON child."Id" = ki."ChildMaterialId"
 WHERE child."CostMaterialInCents" IS NOT NULL
    OR child."CostLaborInCents" IS NOT NULL
ON CONFLICT ("EnterpriseId", "BaseMaterialId") DO NOTHING;

-- ─── 5. Drop do que saiu de escopo ──────────────────────────────────────

ALTER TABLE "BaseMaterial" DROP COLUMN "CostMaterialInCents";
ALTER TABLE "BaseMaterial" DROP COLUMN "CostLaborInCents";
ALTER TABLE "Material" DROP COLUMN "Name";
