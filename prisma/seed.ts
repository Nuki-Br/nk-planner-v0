// Seed do banco (realinhado) — porta o seed mock (src/lib/data/seed.ts) para o
// Postgres do Supabase no modelo relacional novo (Enterprise/Blueprint/Room/
// RoomComponent/Material/BaseMaterial), criando também a organização beta e o
// usuário de teste no Supabase Auth. Idempotente: apaga e regrava os dados da org.
//
// Ponto-chave do modelo compartilhado: a "Sala/Living" é UM Room criado uma vez
// e ligado a 3 plantas via BlueprintRoom (mesma paleta; qtd/RT por planta no BRC).
//
// Rodar com: npm run db:seed  (dotenv -e .env.local -- tsx prisma/seed.ts)
import { Prisma, PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

import { createSeed } from "../src/lib/data/seed";

const prisma = new PrismaClient();

function json<T extends object>(v: T | null | undefined): Prisma.InputJsonValue | undefined {
  return v == null ? undefined : (v as unknown as Prisma.InputJsonValue);
}

/** Reais → centavos inteiros; 0/negativo vira NULL (= pendente). */
function toCents(reais: number): number | null {
  return reais > 0 ? Math.round(reais * 100) : null;
}

const ORG_ID = "org-grupo-axis";
const ORG_NAME = "Grupo Axis";
const SEED_USER_EMAIL = process.env.SEED_USER_EMAIL ?? "beta@nukibr.com";
const SEED_USER_PASSWORD = process.env.SEED_USER_PASSWORD;

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

  // ── Limpa os dados da org (re-seed limpo) ──
  // Enterprise cascateia Blueprints/Rooms/RoomComponents/Materials/BRC/versions/
  // columns/comments/portal/torres/unitgroups. Kits antes dos singles (FK Restrict).
  await prisma.enterprise.deleteMany({ where: { OrganizationId: ORG_ID } });
  // Insumos cascateiam preços (já foram com o Enterprise) e linhas de composição.
  await prisma.costItem.deleteMany({ where: { OrganizationId: ORG_ID } });
  await prisma.baseMaterial.deleteMany({ where: { OrganizationId: ORG_ID, Type: "kit" } });
  await prisma.baseMaterial.deleteMany({ where: { OrganizationId: ORG_ID, Type: "single" } });
  await prisma.materialCategory.deleteMany({ where: { OrganizationId: ORG_ID } });

  // ── Categorias (por org) — cores espelham o CAT_COLORS do protótipo ──
  const CAT_SEED_COLORS: Record<string, string> = {
    Piso: "blue",
    Revestimento: "purple",
    Pedra: "pink",
    Metal: "yellow",
    "Rodapé": "green",
    "Cuba/Louça": "cyan",
  };
  const catNames = new Set<string>([...seed.materiais, ...seed.kits].map((x) => x.categoria));
  const catMap = new Map<string, number>();
  for (const name of catNames) {
    const row = await prisma.materialCategory.create({
      data: { OrganizationId: ORG_ID, Name: name, ColorScheme: CAT_SEED_COLORS[name] ?? "gray" },
      select: { Id: true },
    });
    catMap.set(name, row.Id);
  }

  // ── Catálogo: BaseMaterial single + kit (+ KitItems) ──
  const catalogMap = new Map<number, number>(); // seed catalog id → db BaseMaterial id
  const kitItemMap = new Map<number, number>(); // seed KitItem id → db MaterialKitItem id
  for (const m of seed.materiais) {
    const row = await prisma.baseMaterial.create({
      data: {
        OrganizationId: ORG_ID,
        CategoryId: catMap.get(m.categoria)!,
        Type: "single",
        ReferenceCode: m.codigo,
        Name: m.nome,
        Manufacturer: m.fabricante,
        Unit: m.unidade,
        CostQuantity: m.custoQtd ?? 1,
      },
      select: { Id: true },
    });
    catalogMap.set(m.id, row.Id);
  }
  for (const k of seed.kits) {
    const row = await prisma.baseMaterial.create({
      data: {
        OrganizationId: ORG_ID,
        CategoryId: catMap.get(k.categoria)!,
        Type: "kit",
        ReferenceCode: k.codigo,
        Name: k.nome,
        KitItems: {
          create: k.itens.map((it, i) => ({
            ChildMaterialId: catalogMap.get(it.materialId)!,
            Position: i,
            Unit: it.unidade,
          })),
        },
      },
      select: { Id: true, KitItems: { select: { Id: true, Position: true } } },
    });
    catalogMap.set(k.id, row.Id);
    for (const [i, it] of k.itens.entries()) {
      const dbKi = row.KitItems.find((x) => x.Position === i);
      if (dbKi) kitItemMap.set(it.id, dbKi.Id);
    }
  }

  // ── Itens de custo (insumos) da org + composições dos materiais (catálogo) ──
  const costItemMap = new Map<number, number>(); // seed CostItem id → db id
  for (const it of seed.costItems) {
    const row = await prisma.costItem.create({
      data: { OrganizationId: ORG_ID, Code: it.codigo, Name: it.nome, Unit: it.unidade },
      select: { Id: true },
    });
    costItemMap.set(it.id, row.Id);
  }
  const positions = new Map<number, number>();
  await prisma.materialCompositionItem.createMany({
    data: seed.composicoes.map((c) => {
      const pos = positions.get(c.materialId) ?? 0;
      positions.set(c.materialId, pos + 1);
      return {
        BaseMaterialId: catalogMap.get(c.materialId)!,
        CostItemId: costItemMap.get(c.itemId)!,
        Quantity: c.qtd,
        Position: pos,
      };
    }),
  });

  // ── Empreendimentos (Enterprise) — projects[0] é o âncora (mais antigo) ──
  const base = Date.now();
  const enterpriseMap = new Map<number, number>();
  for (const [i, p] of seed.projects.entries()) {
    const row = await prisma.enterprise.create({
      data: {
        OrganizationId: ORG_ID,
        Name: p.nome,
        Developer: p.incorporadora,
        TowerLabel: p.torre,
        Status: p.status,
        SubmittedAtLabel: p.enviadoEm,
        DeadlineLabel: p.prazo,
        PublishedAtLabel: p.publicadoEm ?? null,
        TotalItems: p.totalItens,
        FilledItems: p.itensPreenchidos,
        UsesDebitCredit: p.usaDebitoCredito ?? true,
        CreatedAt: new Date(base + i * 1000), // garante ordem: projects[0] = âncora
      },
      select: { Id: true },
    });
    enterpriseMap.set(p.id, row.Id);
  }
  const activeId = enterpriseMap.get(seed.projects[0]!.id)!;

  // ── Custo base do empreendimento âncora ──
  // O catálogo não guarda custo: quem guarda é o empreendimento. Só o âncora é
  // semeado — os outros projetos ficam pendentes de propósito, que é o estado
  // real de um empreendimento novo e o que demonstra o escopo por obra.
  await prisma.enterpriseMaterialCost.createMany({
    data: Object.values(seed.custosBase)
      .filter((c) => c.custoMat !== null || c.custoMO > 0)
      .map((c) => ({
        EnterpriseId: activeId,
        BaseMaterialId: catalogMap.get(c.baseId)!,
        CostMaterialInCents: c.custoMat === null ? null : toCents(c.custoMat),
        CostLaborInCents: toCents(c.custoMO),
      })),
  });

  // Preço dos insumos no âncora (NULL = pendente, como o custo de material).
  await prisma.enterpriseCostItemPrice.createMany({
    data: seed.costItems.map((it) => ({
      EnterpriseId: activeId,
      CostItemId: costItemMap.get(it.id)!,
      UnitPriceInCents: it.preco === null ? null : Math.round(it.preco * 100),
    })),
  });

  // ── Colunas de orçamento do empreendimento âncora ──
  const cols = seed.projects[0]!.taxColumns ?? [];
  await prisma.budgetColumn.createMany({
    data: cols.map((c, i) => ({
      EnterpriseId: activeId,
      Name: c.nome,
      Expr: c.expr,
      Visible: c.visivel,
      Position: i,
    })),
  });

  // ── Tipologias → Rooms (dedupe compartilhado) → BlueprintRoom/BRC/KitUsage ──
  interface RoomCache {
    dbRoomId: number;
    compMap: Map<number, number>; // seed RoomComponent id → db id
  }
  const roomCache = new Map<number, RoomCache>(); // seed Room id → cache
  const optMap = new Map<number, number>(); // seed option id → db Material id (global, p/ comentários)

  for (const [ti, tip] of seed.tipologias.entries()) {
    const bp = await prisma.blueprint.create({
      data: {
        EnterpriseId: activeId,
        Name: tip.nome,
        Description: tip.descricao,
        AreaSqM: tip.metragem,
        UnitCount: tip.unidades,
        Status: tip.status,
        Position: ti,
      },
      select: { Id: true },
    });
    for (const [ai, amb] of tip.ambientes.entries()) {
      let cache = roomCache.get(amb.id);
      if (!cache) {
        const dbRoom = await prisma.room.create({
          data: {
            EnterpriseId: activeId,
            Name: amb.nome,
            Icon: amb.icon ?? null,
          },
          select: { Id: true },
        });
        const compMap = new Map<number, number>();
        for (const c of amb.componentes) {
          const rc = await prisma.roomComponent.create({
            data: { RoomId: dbRoom.Id, Name: c.nome, Unit: c.unidade, IsGhost: c.ghost, Position: c.ordem },
            select: { Id: true },
          });
          compMap.set(c.id, rc.Id);
          let defaultDbId: number | null = null;
          for (const opt of c.options) {
            const m = await prisma.material.create({
              data: {
                RoomComponentId: rc.Id,
                RoomId: dbRoom.Id,
                EnterpriseId: activeId,
                BaseMaterialId: catalogMap.get(opt.baseId)!,
                Position: opt.ordem,
                IsDefault: opt.isDefault,
              },
              select: { Id: true },
            });
            optMap.set(opt.id, m.Id);
            if (c.padrao === opt.id) defaultDbId = m.Id;
          }
          if (defaultDbId != null) {
            await prisma.roomComponent.update({ where: { Id: rc.Id }, data: { DefaultMaterialId: defaultDbId } });
          }
        }
        cache = { dbRoomId: dbRoom.Id, compMap };
        roomCache.set(amb.id, cache);
      }
      const br = await prisma.blueprintRoom.create({
        data: { BlueprintId: bp.Id, RoomId: cache.dbRoomId, Position: ai, Polygon: json(amb.local) },
        select: { Id: true },
      });
      for (const c of amb.componentes) {
        const brc = await prisma.blueprintRoomComponent.create({
          data: {
            BlueprintRoomId: br.Id,
            RoomComponentId: cache.compMap.get(c.id)!,
            UsageQuantity: c.qtd,
            TechnicalReservePct: c.rt,
          },
          select: { Id: true },
        });
        const kitEntries = Object.entries(c.kitQtds);
        if (kitEntries.length > 0) {
          await prisma.materialKitUsage.createMany({
            data: kitEntries.map(([kitItemSeedId, q]) => ({
              BlueprintRoomComponentId: brc.Id,
              KitItemId: kitItemMap.get(Number(kitItemSeedId))!,
              UsageQuantity: q,
            })),
          });
        }
      }
    }
  }

  // ── Torres + grupos de unidades (Enterprise âncora) ──
  const towerMap = new Map<string, number>();
  for (const [i, nome] of seed.torres.entries()) {
    const row = await prisma.tower.create({
      data: { EnterpriseId: activeId, Name: nome, Position: i },
      select: { Id: true },
    });
    towerMap.set(nome, row.Id);
  }
  await prisma.unitGroup.createMany({
    data: seed.unitGroups.map((g) => ({
      EnterpriseId: activeId,
      Name: g.nome,
      TowerId: towerMap.get(g.torre) ?? null,
      UnitNumbers: g.unidades,
    })),
  });

  // ── Versões ──
  await prisma.budgetVersion.createMany({
    data: seed.versions.map((v, i) => ({
      EnterpriseId: activeId,
      Label: v.label,
      CreatedAtLabel: v.createdAt,
      CreatedBy: v.createdBy,
      IsCurrent: v.isCurrent,
      Summary: v.summary,
      Changes: json(v.changes) ?? {},
      Position: i,
    })),
  });

  // ── Comentários (thread por opção; rowKey = String(optionId) do seed) ──
  const cbase = Date.now();
  const commentRows = Object.entries(seed.comments).flatMap(([rowKey, thread]) => {
    const materialId = optMap.get(Number(rowKey));
    if (materialId == null) return [];
    return thread.map((c, i) => ({
      MaterialId: materialId,
      EnterpriseId: activeId,
      Author: c.autor,
      AuthorName: c.autorNome ?? null,
      Text: c.texto,
      DateLabel: c.data,
      CreatedAt: new Date(cbase + i * 1000),
    }));
  });
  if (commentRows.length > 0) await prisma.comment.createMany({ data: commentRows });

  // ── Resumo ──
  const counts = {
    baseMateriais: await prisma.baseMaterial.count({ where: { OrganizationId: ORG_ID } }),
    blueprints: await prisma.blueprint.count({ where: { EnterpriseId: activeId } }),
    rooms: await prisma.room.count({ where: { EnterpriseId: activeId } }),
    blueprintRooms: await prisma.blueprintRoom.count({ where: { Blueprint: { EnterpriseId: activeId } } }),
    roomComponents: await prisma.roomComponent.count({ where: { Room: { EnterpriseId: activeId } } }),
    materials: await prisma.material.count({ where: { EnterpriseId: activeId } }),
    enterprises: await prisma.enterprise.count({ where: { OrganizationId: ORG_ID } }),
    unitGroups: await prisma.unitGroup.count({ where: { EnterpriseId: activeId } }),
    versions: await prisma.budgetVersion.count({ where: { EnterpriseId: activeId } }),
    comments: await prisma.comment.count({ where: { EnterpriseId: activeId } }),
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
