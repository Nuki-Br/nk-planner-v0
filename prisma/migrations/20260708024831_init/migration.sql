-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('rascunho', 'em_preenchimento', 'em_revisao', 'publicado');

-- CreateEnum
CREATE TYPE "TipologiaStatus" AS ENUM ('completa', 'incompleta');

-- CreateEnum
CREATE TYPE "ColumnKind" AS ENUM ('free', 'rowTotal', 'rowAvg');

-- CreateEnum
CREATE TYPE "CommentAutor" AS ENUM ('construtora', 'incorporadora');

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
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "torre" TEXT NOT NULL,
    "incorporadora" TEXT NOT NULL,
    "construtora" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'rascunho',
    "enviado_em" TEXT,
    "prazo" TEXT,
    "publicado_em" TEXT,
    "total_itens" INTEGER NOT NULL DEFAULT 0,
    "itens_preenchidos" INTEGER NOT NULL DEFAULT 0,
    "incc_base" TEXT,
    "email_construtora" TEXT,
    "taxas" JSONB,
    "organization_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_columns" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "kind" "ColumnKind" NOT NULL,
    "expr" TEXT NOT NULL,
    "visivel" BOOLEAN NOT NULL DEFAULT false,
    "ordem" INTEGER NOT NULL,
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "budget_columns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materiais" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "fabricante" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "custo_mat" DOUBLE PRECISION NOT NULL,
    "custo_mo" DOUBLE PRECISION NOT NULL,
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "materiais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kits" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "itens" TEXT[],
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "kits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipologias" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "metragem" DOUBLE PRECISION NOT NULL,
    "descricao" TEXT NOT NULL,
    "unidades" INTEGER NOT NULL,
    "status" "TipologiaStatus" NOT NULL DEFAULT 'incompleta',
    "ordem" INTEGER NOT NULL,
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "tipologias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ambientes" (
    "id" TEXT NOT NULL,
    "tipologia_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "icon" TEXT,
    "imagem" JSONB,
    "local" JSONB,
    "ordem" INTEGER NOT NULL,
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "ambientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "componentes" (
    "id" TEXT NOT NULL,
    "ambiente_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "qtd" DOUBLE PRECISION NOT NULL,
    "rt" DOUBLE PRECISION NOT NULL,
    "padrao" TEXT,
    "upgrades" TEXT[],
    "taxa_especifica" JSONB,
    "ghost" BOOLEAN NOT NULL DEFAULT false,
    "ordem" INTEGER NOT NULL,
    "kit_qtds" JSONB,
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "componentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ambientes_compartilhados" (
    "ambiente_id" TEXT NOT NULL,
    "share_id" TEXT NOT NULL,
    "tipologia_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "ambientes_compartilhados_pkey" PRIMARY KEY ("ambiente_id")
);

-- CreateTable
CREATE TABLE "torres" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "torres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_groups" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "torre" TEXT NOT NULL,
    "unidades" TEXT[],
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "unit_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_items" (
    "key" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "pending_items_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "budget_versions" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "criado_em" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "summary" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "ordem" INTEGER NOT NULL,
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "budget_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "row_key" TEXT NOT NULL,
    "autor" "CommentAutor" NOT NULL,
    "texto" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fill_links" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "tipologia_ids" TEXT[],
    "campos" JSONB NOT NULL,
    "prazo" TEXT,
    "senha" TEXT,
    "criado_em" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "fill_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_fills" (
    "material_id" TEXT NOT NULL,
    "mat" TEXT NOT NULL,
    "mo" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "portal_fills_pkey" PRIMARY KEY ("organization_id","material_id")
);

-- CreateIndex
CREATE INDEX "memberships_organization_id_idx" ON "memberships"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_auth_user_id_organization_id_key" ON "memberships"("auth_user_id", "organization_id");

-- CreateIndex
CREATE INDEX "projects_organization_id_idx" ON "projects"("organization_id");

-- CreateIndex
CREATE INDEX "budget_columns_project_id_idx" ON "budget_columns"("project_id");

-- CreateIndex
CREATE INDEX "budget_columns_organization_id_idx" ON "budget_columns"("organization_id");

-- CreateIndex
CREATE INDEX "materiais_organization_id_idx" ON "materiais"("organization_id");

-- CreateIndex
CREATE INDEX "kits_organization_id_idx" ON "kits"("organization_id");

-- CreateIndex
CREATE INDEX "tipologias_organization_id_idx" ON "tipologias"("organization_id");

-- CreateIndex
CREATE INDEX "ambientes_tipologia_id_idx" ON "ambientes"("tipologia_id");

-- CreateIndex
CREATE INDEX "ambientes_organization_id_idx" ON "ambientes"("organization_id");

-- CreateIndex
CREATE INDEX "componentes_ambiente_id_idx" ON "componentes"("ambiente_id");

-- CreateIndex
CREATE INDEX "componentes_organization_id_idx" ON "componentes"("organization_id");

-- CreateIndex
CREATE INDEX "ambientes_compartilhados_share_id_idx" ON "ambientes_compartilhados"("share_id");

-- CreateIndex
CREATE INDEX "ambientes_compartilhados_organization_id_idx" ON "ambientes_compartilhados"("organization_id");

-- CreateIndex
CREATE INDEX "torres_organization_id_idx" ON "torres"("organization_id");

-- CreateIndex
CREATE INDEX "unit_groups_organization_id_idx" ON "unit_groups"("organization_id");

-- CreateIndex
CREATE INDEX "pending_items_organization_id_idx" ON "pending_items"("organization_id");

-- CreateIndex
CREATE INDEX "budget_versions_organization_id_idx" ON "budget_versions"("organization_id");

-- CreateIndex
CREATE INDEX "comments_row_key_idx" ON "comments"("row_key");

-- CreateIndex
CREATE INDEX "comments_organization_id_idx" ON "comments"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "fill_links_token_key" ON "fill_links"("token");

-- CreateIndex
CREATE INDEX "fill_links_organization_id_idx" ON "fill_links"("organization_id");

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_columns" ADD CONSTRAINT "budget_columns_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambientes" ADD CONSTRAINT "ambientes_tipologia_id_fkey" FOREIGN KEY ("tipologia_id") REFERENCES "tipologias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "componentes" ADD CONSTRAINT "componentes_ambiente_id_fkey" FOREIGN KEY ("ambiente_id") REFERENCES "ambientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
