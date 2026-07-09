// Seed do banco (Fase 10) — porta o seed mock (src/lib/data/seed.ts) para o
// Postgres do Supabase, criando também a organização beta e o usuário de
// teste no Supabase Auth. Idempotente: apaga e regrava os dados da org.
//
// Rodar com: npm run db:seed  (dotenv -e .env.local -- tsx prisma/seed.ts)
import { Prisma, PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

import { createSeed } from "../src/lib/data/seed";

const prisma = new PrismaClient();

/** Interfaces do domínio → coluna Json do Prisma (sem index signature). */
function json<T extends object>(v: T | null | undefined): Prisma.InputJsonValue | undefined {
  return v == null ? undefined : (v as unknown as Prisma.InputJsonValue);
}

const ORG_ID = "org-grupo-axis";
const ORG_NAME = "Grupo Axis";
const SEED_USER_EMAIL = process.env.SEED_USER_EMAIL ?? "beta@nukibr.com";
const SEED_USER_PASSWORD = process.env.SEED_USER_PASSWORD;

/**
 * Cria (ou reaproveita) o usuário de teste no Supabase Auth e retorna o id.
 * Falha de auth não derruba o seed do domínio — só avisa.
 */
async function ensureAuthUser(): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret || !SEED_USER_PASSWORD) {
    console.warn(
      "⚠ NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SECRET_KEY/SEED_USER_PASSWORD ausentes — pulando usuário de teste."
    );
    return null;
  }
  const admin = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const created = await admin.auth.admin.createUser({
    email: SEED_USER_EMAIL,
    password: SEED_USER_PASSWORD,
    email_confirm: true,
  });
  if (created.data.user) return created.data.user.id;

  // Já existe? Procura na listagem (beta: poucos usuários).
  const list = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
  const existing = list.data?.users.find((u) => u.email === SEED_USER_EMAIL);
  if (existing) return existing.id;

  console.warn(`⚠ Não foi possível criar/achar o usuário de teste: ${created.error?.message ?? "erro desconhecido"}`);
  return null;
}

async function main(): Promise<void> {
  const seed = createSeed();

  // ── Organização + membership do usuário de teste ──
  await prisma.organization.upsert({
    where: { id: ORG_ID },
    update: { name: ORG_NAME },
    create: { id: ORG_ID, name: ORG_NAME },
  });

  const authUserId = await ensureAuthUser();
  if (authUserId) {
    await prisma.membership.upsert({
      where: { authUserId_organizationId: { authUserId, organizationId: ORG_ID } },
      update: { email: SEED_USER_EMAIL, role: "owner" },
      create: { authUserId, email: SEED_USER_EMAIL, role: "owner", organizationId: ORG_ID },
    });
  }

  // ── Limpa os dados de domínio da org (re-seed limpo) ──
  const org = { organizationId: ORG_ID };
  await prisma.portalFill.deleteMany({ where: org });
  await prisma.fillLink.deleteMany({ where: org });
  await prisma.comment.deleteMany({ where: org });
  await prisma.budgetVersion.deleteMany({ where: org });
  await prisma.pendingItem.deleteMany({ where: org });
  await prisma.unitGroup.deleteMany({ where: org });
  await prisma.tower.deleteMany({ where: org });
  await prisma.ambienteShared.deleteMany({ where: org });
  await prisma.tipologia.deleteMany({ where: org }); // cascata: ambientes → componentes
  await prisma.project.deleteMany({ where: org }); // cascata: budget_columns
  await prisma.material.deleteMany({ where: org });
  await prisma.kit.deleteMany({ where: org });

  // ── Catálogo ──
  await prisma.material.createMany({
    data: seed.materiais.map((m) => ({ ...m, organizationId: ORG_ID })),
  });
  await prisma.kit.createMany({
    data: seed.kits.map(({ tipo: _tipo, ...k }) => ({ ...k, organizationId: ORG_ID })),
  });

  // ── Tipologias → ambientes → componentes (nested, preservando a ordem) ──
  for (const [ti, tip] of seed.tipologias.entries()) {
    await prisma.tipologia.create({
      data: {
        id: tip.id,
        nome: tip.nome,
        metragem: tip.metragem,
        descricao: tip.descricao,
        unidades: tip.unidades,
        status: tip.status,
        ordem: ti,
        organizationId: ORG_ID,
        ambientes: {
          create: tip.ambientes.map((amb, ai) => ({
            id: amb.id,
            nome: amb.nome,
            icon: amb.icon ?? null,
            imagem: json(amb.imagem),
            local: json(amb.local),
            ordem: ai,
            organizationId: ORG_ID,
            componentes: {
              create: amb.componentes.map((c, ci) => ({
                id: c.id,
                nome: c.nome,
                unidade: c.unidade,
                qtd: c.qtd,
                rt: c.rt,
                padrao: c.padrao,
                upgrades: c.upgrades,
                taxaEspecifica: json(c.taxaEspecifica),
                ghost: c.ghost ?? false,
                ordem: c.ordem ?? ci,
                kitQtds: json(c.kitQtds),
                organizationId: ORG_ID,
              })),
            },
          })),
        },
      },
    });
  }

  // ── Compartilhamento de ambientes (ambShared + sharedReg) ──
  const tipDoAmbiente = new Map<string, string>();
  for (const tip of seed.tipologias) {
    for (const amb of tip.ambientes) tipDoAmbiente.set(amb.id, tip.id);
  }
  await prisma.ambienteShared.createMany({
    data: Object.entries(seed.ambShared).map(([ambienteId, shareId]) => ({
      ambienteId,
      shareId,
      tipologiaId: tipDoAmbiente.get(ambienteId) ?? "",
      organizationId: ORG_ID,
    })),
  });

  // ── Torres + grupos de unidades ──
  await prisma.tower.createMany({
    data: seed.torres.map((nome, i) => ({
      id: `tower-${i + 1}`,
      nome,
      ordem: i,
      organizationId: ORG_ID,
    })),
  });
  await prisma.unitGroup.createMany({
    data: seed.unitGroups.map((g) => ({ ...g, organizationId: ORG_ID })),
  });

  // ── Pendências + versões ──
  await prisma.pendingItem.createMany({
    data: seed.pendingItems.map((key) => ({ key, organizationId: ORG_ID })),
  });
  await prisma.budgetVersion.createMany({
    data: seed.versions.map((v, i) => ({
      id: v.id,
      label: v.label,
      criadoEm: v.createdAt,
      createdBy: v.createdBy,
      isCurrent: v.isCurrent,
      summary: v.summary,
      changes: json(v.changes) ?? {},
      ordem: i,
      organizationId: ORG_ID,
    })),
  });

  // ── Projetos (+ colunas de orçamento do projeto ativo) ──
  for (const p of seed.projects) {
    const { taxColumns, tipologias: _tips, taxas, ...rest } = p;
    await prisma.project.create({
      data: {
        ...rest,
        taxas: json(taxas),
        organizationId: ORG_ID,
        taxColumns: taxColumns
          ? {
              create: taxColumns.map((c, i) => ({
                ...c,
                ordem: i,
                organizationId: ORG_ID,
              })),
            }
          : undefined,
      },
    });
  }

  // ── Comentários (threads por rowKey, ordem preservada via createdAt) ──
  const base = Date.now();
  const commentRows = Object.entries(seed.comments).flatMap(([rowKey, thread]) =>
    thread.map((c, i) => ({
      rowKey,
      autor: c.autor,
      texto: c.texto,
      data: c.data,
      createdAt: new Date(base + i * 1000),
      organizationId: ORG_ID,
    }))
  );
  await prisma.comment.createMany({ data: commentRows });

  // ── Resumo ──
  const counts = {
    materiais: await prisma.material.count({ where: org }),
    kits: await prisma.kit.count({ where: org }),
    tipologias: await prisma.tipologia.count({ where: org }),
    ambientes: await prisma.ambiente.count({ where: org }),
    componentes: await prisma.componente.count({ where: org }),
    projects: await prisma.project.count({ where: org }),
    budgetColumns: await prisma.budgetColumn.count({ where: org }),
    unitGroups: await prisma.unitGroup.count({ where: org }),
    torres: await prisma.tower.count({ where: org }),
    pendingItems: await prisma.pendingItem.count({ where: org }),
    versions: await prisma.budgetVersion.count({ where: org }),
    comments: await prisma.comment.count({ where: org }),
  };
  console.log("Seed concluído:", counts);
  if (authUserId) {
    console.log(`Usuário de teste: ${SEED_USER_EMAIL} (troque a senha no painel do Supabase → Authentication)`);
  }
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
