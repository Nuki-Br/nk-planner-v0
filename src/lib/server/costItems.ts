// Itens de custo (insumos) e composição de custo — a camada de servidor
// separada do store principal, como lib/server/pricing.ts. Só as rotas
// /api/projects/[id]/itens-de-custo e /custos-base/[baseId]/composicao chamam
// daqui.
//
// Escopo: o insumo e a composição são do CATÁLOGO (org); o preço do insumo é
// POR EMPREENDIMENTO. Toda fn valida o material/insumo contra a org e o
// empreendimento contra a org — nunca confiar em ids vindos do cliente.
//
// Latência: o banco é remoto (pooler) e cada round-trip custa ~1 s. As
// gravações em lote (grade com N linhas, "colar do Excel" com centenas) são
// feitas com poucas queries SET-BASED (createManyAndReturn + INSERT … ON
// CONFLICT), nunca uma query por linha — senão a transação interativa expira.
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  assertEnterprise,
  materialCostFromCents,
  materialCostToCents,
} from "@/lib/server/store";
import { isUnidade, type Unidade } from "@/shared/constants/unidades";
import type { ComposicaoOp, CostItemLineInput, CostItemPatch } from "@/shared/types/costItems";
import type { CostItemRow } from "@/shared/types/domain";

/** Cliente Prisma dentro OU fora de transação — as validações servem aos dois. */
type Db = Prisma.TransactionClient;

/** Pooler remoto: o padrão (2 s para pegar conexão, 5 s de transação) estoura. */
const TX_OPTS = { maxWait: 15_000, timeout: 60_000 } as const;

// ─── Leitura ────────────────────────────────────────────────────────────

function rowInclude(enterpriseId: number) {
  return {
    Prices: { where: { EnterpriseId: enterpriseId } },
    // Até 3 nomes bastam para a dica "usado em…"; a contagem completa vem do _count.
    Lines: {
      take: 3,
      orderBy: { BaseMaterial: { Name: "asc" as const } },
      include: { BaseMaterial: { select: { Name: true } } },
    },
    _count: { select: { Lines: true } },
  };
}

type CostItemRowDb = Prisma.CostItemGetPayload<{ include: ReturnType<typeof rowInclude> }>;

function toUnidade(u: string): Unidade {
  return isUnidade(u) ? u : "und";
}

function toRow(r: CostItemRowDb): CostItemRow {
  return {
    id: r.Id,
    codigo: r.Code,
    nome: r.Name,
    unidade: toUnidade(r.Unit),
    // Sem linha de preço neste empreendimento = nunca preenchido = pendente.
    preco: materialCostFromCents(r.Prices[0]?.UnitPriceInCents),
    usos: r._count.Lines,
    usadoEm: r.Lines.map((l) => l.BaseMaterial.Name),
  };
}

/** Insumos da org, com o preço deste empreendimento e onde são usados. A→Z por nome. */
export async function listCostItems(
  organizationId: string,
  projectId: number
): Promise<CostItemRow[]> {
  await assertEnterprise(organizationId, projectId);
  const rows = await prisma.costItem.findMany({
    where: { OrganizationId: organizationId },
    include: rowInclude(projectId),
    orderBy: { Name: "asc" },
  });
  return rows.map(toRow);
}

async function rowsByIds(projectId: number, ids: number[]): Promise<CostItemRow[]> {
  const rows = await prisma.costItem.findMany({
    where: { Id: { in: ids } },
    include: rowInclude(projectId),
    orderBy: { Name: "asc" },
  });
  return rows.map(toRow);
}

// ─── Validações ─────────────────────────────────────────────────────────

function normCode(raw: string | null | undefined): string | null {
  const c = (raw ?? "").trim();
  return c === "" ? null : c;
}

function assertNome(nome: string): string {
  const n = nome.trim();
  if (n === "") throw new Error("Informe o nome do item de custo.");
  return n;
}

function assertUnidade(u: string): Unidade {
  if (!isUnidade(u)) throw new Error("Unidade de medida inválida.");
  return u;
}

function assertQtd(q: number): number {
  if (!Number.isFinite(q) || q < 0) throw new Error("Quantitativo inválido.");
  return q;
}

function assertPreco(p: number | null): number | null {
  if (p !== null && (!Number.isFinite(p) || p < 0)) throw new Error("Preço inválido.");
  return p;
}

/** Códigos únicos por org quando preenchidos — como o nome da categoria. Uma query. */
async function assertCodesFree(
  db: Db,
  organizationId: string,
  codes: string[],
  exceptId?: number
): Promise<void> {
  if (codes.length === 0) return;
  const dup = await db.costItem.findFirst({
    where: {
      OrganizationId: organizationId,
      Code: { in: codes },
      ...(exceptId ? { NOT: { Id: exceptId } } : {}),
    },
    select: { Code: true, Name: true },
  });
  if (dup) throw new Error(`Já existe um item de custo com o código "${dup.Code}" (${dup.Name}).`);
}

async function assertCostItemsInOrg(db: Db, organizationId: string, ids: number[]): Promise<void> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return;
  const n = await db.costItem.count({ where: { Id: { in: unique }, OrganizationId: organizationId } });
  if (n !== unique.length) throw new Error("Item de custo não encontrado.");
}

/** Só material "single" da org tem composição — kit soma os filhos. */
async function assertSingleMaterialInOrg(
  organizationId: string,
  baseId: number
): Promise<{ Id: number; CostQuantity: number }> {
  const bm = await prisma.baseMaterial.findFirst({
    where: { Id: baseId, OrganizationId: organizationId },
    select: { Id: true, Type: true, CostQuantity: true },
  });
  if (!bm) throw new Error("Material não encontrado.");
  if (bm.Type === "kit") throw new Error("Kit não tem composição — o custo é a soma dos sub-itens.");
  return { Id: bm.Id, CostQuantity: bm.CostQuantity };
}

// ─── Gravações em lote (uma query, N linhas) ────────────────────────────

/** Preço de N insumos neste empreendimento num INSERT … ON CONFLICT só (último vence). */
async function upsertPrices(
  db: Db,
  projectId: number,
  rows: { itemId: number; preco: number | null }[]
): Promise<void> {
  const byItem = new Map<number, number | null>();
  for (const r of rows) byItem.set(r.itemId, materialCostToCents(assertPreco(r.preco)));
  if (byItem.size === 0) return;
  const values = [...byItem].map(
    ([itemId, cents]) => Prisma.sql`(${projectId}, ${itemId}, ${cents}::integer)`
  );
  await db.$executeRaw`
    INSERT INTO "EnterpriseCostItemPrice" ("EnterpriseId", "CostItemId", "UnitPriceInCents")
    VALUES ${Prisma.join(values)}
    ON CONFLICT ("EnterpriseId", "CostItemId")
    DO UPDATE SET "UnitPriceInCents" = EXCLUDED."UnitPriceInCents", "UpdatedAt" = now()`;
}

interface CompositionRowInput {
  baseId: number;
  itemId: number;
  qtd: number;
  position: number;
}

/**
 * Linhas de composição num INSERT … ON CONFLICT só: insumo já presente no
 * material só tem o quantitativo atualizado (mantém a posição). Pares
 * repetidos na entrada são de-duplicados (último vence) — o Postgres recusa
 * afetar a mesma linha duas vezes no mesmo comando.
 */
async function upsertCompositionRows(db: Db, rows: CompositionRowInput[]): Promise<void> {
  const byPair = new Map<string, CompositionRowInput>();
  for (const r of rows) byPair.set(`${r.baseId}:${r.itemId}`, r);
  if (byPair.size === 0) return;
  const values = [...byPair.values()].map(
    (r) => Prisma.sql`(${r.baseId}, ${r.itemId}, ${r.qtd}::double precision, ${r.position})`
  );
  await db.$executeRaw`
    INSERT INTO "MaterialCompositionItem" ("BaseMaterialId", "CostItemId", "Quantity", "Position")
    VALUES ${Prisma.join(values)}
    ON CONFLICT ("BaseMaterialId", "CostItemId")
    DO UPDATE SET "Quantity" = EXCLUDED."Quantity"`;
}

/**
 * Resolve cada linha da grade para um CostItem id — criando os novos de uma
 * vez e gravando o preço deste empreendimento quando veio — DENTRO da
 * transação do chamador. Poucas queries, independentes do número de linhas.
 */
async function resolveLinesTx(
  tx: Db,
  organizationId: string,
  projectId: number,
  lines: CostItemLineInput[]
): Promise<{ itemId: number; qtd: number }[]> {
  if (lines.length === 0) throw new Error("Nenhuma linha para adicionar.");

  // 1. Valida e separa existentes × novos (sem banco).
  const resolved: (number | null)[] = lines.map(() => null);
  const existingIds: number[] = [];
  const novos: { idx: number; code: string | null; nome: string; unidade: Unidade }[] = [];
  lines.forEach((line, idx) => {
    if (line.itemId != null) {
      existingIds.push(line.itemId);
      resolved[idx] = line.itemId;
    } else if (line.novo) {
      novos.push({
        idx,
        code: normCode(line.novo.codigo),
        nome: assertNome(line.novo.nome),
        unidade: assertUnidade(line.novo.unidade),
      });
    } else {
      throw new Error("Linha inválida: informe um item existente ou um novo.");
    }
    if (line.qtd !== undefined) assertQtd(line.qtd);
    if (line.preco !== undefined) assertPreco(line.preco);
  });

  // 2. Existentes pertencem à org (1 query); códigos novos livres (1 query).
  await assertCostItemsInOrg(tx, organizationId, existingIds);
  const codes = novos.flatMap((n) => (n.code === null ? [] : [n.code]));
  const repetido = codes.find((c, i) => codes.indexOf(c) !== i);
  if (repetido !== undefined) throw new Error(`Código "${repetido}" repetido na grade.`);
  await assertCodesFree(tx, organizationId, codes);

  // 3. Cria os novos num INSERT só (RETURNING devolve na ordem dos VALUES).
  if (novos.length > 0) {
    const created = await tx.costItem.createManyAndReturn({
      data: novos.map((n) => ({
        OrganizationId: organizationId,
        Code: n.code,
        Name: n.nome,
        Unit: n.unidade,
      })),
      select: { Id: true },
    });
    if (created.length !== novos.length) throw new Error("Falha ao criar os itens de custo.");
    novos.forEach((n, i) => {
      resolved[n.idx] = created[i]!.Id;
    });
  }

  // 4. Preços deste empreendimento (1 query).
  await upsertPrices(
    tx,
    projectId,
    lines.flatMap((line, idx) =>
      line.preco !== undefined ? [{ itemId: resolved[idx]!, preco: line.preco }] : []
    )
  );

  return lines.map((line, idx) => ({ itemId: resolved[idx]!, qtd: assertQtd(line.qtd ?? 1) }));
}

// ─── Itens de custo ─────────────────────────────────────────────────────

/** Grade "Adicionar itens" da aba Itens de custo: cria/atualiza vários de uma vez. */
export async function createCostItems(
  organizationId: string,
  projectId: number,
  lines: CostItemLineInput[]
): Promise<CostItemRow[]> {
  await assertEnterprise(organizationId, projectId);
  const resolved = await prisma.$transaction(
    (tx) => resolveLinesTx(tx, organizationId, projectId, lines),
    TX_OPTS
  );
  return rowsByIds(projectId, [...new Set(resolved.map((r) => r.itemId))]);
}

/** Identidade (org) e/ou preço (empreendimento) de um insumo — um campo por blur. */
export async function updateCostItem(
  organizationId: string,
  projectId: number,
  itemId: number,
  patch: CostItemPatch
): Promise<CostItemRow> {
  await assertEnterprise(organizationId, projectId);
  await assertCostItemsInOrg(prisma, organizationId, [itemId]);

  const data: Prisma.CostItemUpdateInput = {};
  if (patch.codigo !== undefined) {
    const code = normCode(patch.codigo);
    if (code !== null) await assertCodesFree(prisma, organizationId, [code], itemId);
    data.Code = code;
  }
  if (patch.nome !== undefined) data.Name = assertNome(patch.nome);
  if (patch.unidade !== undefined) data.Unit = assertUnidade(patch.unidade);
  if (Object.keys(data).length > 0) await prisma.costItem.update({ where: { Id: itemId }, data });
  if (patch.preco !== undefined) await upsertPrices(prisma, projectId, [{ itemId, preco: patch.preco }]);

  const row = await prisma.costItem.findUniqueOrThrow({
    where: { Id: itemId },
    include: rowInclude(projectId),
  });
  return toRow(row);
}

/** Apaga o insumo da org: preços e linhas de composição vão junto (cascade). */
export async function deleteCostItem(organizationId: string, itemId: number): Promise<void> {
  await assertCostItemsInOrg(prisma, organizationId, [itemId]);
  await prisma.costItem.delete({ where: { Id: itemId } });
}

// ─── Composição de um material ──────────────────────────────────────────

/** Uma operação sobre a composição de UM material do catálogo (ver ComposicaoOp). */
export async function runComposicaoOp(
  organizationId: string,
  projectId: number,
  baseId: number,
  body: ComposicaoOp
): Promise<void> {
  await assertEnterprise(organizationId, projectId);
  const source = await assertSingleMaterialInOrg(organizationId, baseId);

  switch (body.op) {
    case "addLines": {
      await prisma.$transaction(async (tx) => {
        const resolved = await resolveLinesTx(tx, organizationId, projectId, body.lines);
        const start = await tx.materialCompositionItem.count({ where: { BaseMaterialId: baseId } });
        await upsertCompositionRows(
          tx,
          resolved.map((r, i) => ({ baseId, itemId: r.itemId, qtd: r.qtd, position: start + i }))
        );
      }, TX_OPTS);
      return;
    }
    case "updateLine": {
      const r = await prisma.materialCompositionItem.updateMany({
        where: { Id: body.lineId, BaseMaterialId: baseId },
        data: { Quantity: assertQtd(body.qtd) },
      });
      if (r.count === 0) throw new Error("Linha de composição não encontrada.");
      return;
    }
    case "removeLine": {
      const r = await prisma.materialCompositionItem.deleteMany({
        where: { Id: body.lineId, BaseMaterialId: baseId },
      });
      if (r.count === 0) throw new Error("Linha de composição não encontrada.");
      return;
    }
    case "reorder": {
      // Transação em lote (array): sem timeout interativo, um round-trip só.
      await prisma.$transaction(
        body.orderedIds.map((id, i) =>
          prisma.materialCompositionItem.updateMany({
            where: { Id: id, BaseMaterialId: baseId },
            data: { Position: i },
          })
        )
      );
      return;
    }
    case "setCostQuantity": {
      await prisma.baseMaterial.update({
        where: { Id: baseId },
        data: { CostQuantity: assertQtd(body.custoQtd) },
      });
      return;
    }
    case "applyTo": {
      const targetIds = [...new Set(body.targetBaseIds)].filter((id) => id !== baseId);
      if (targetIds.length === 0) throw new Error("Escolha ao menos um material de destino.");
      const targets = await prisma.baseMaterial.findMany({
        where: { Id: { in: targetIds }, OrganizationId: organizationId, Type: "single" },
        select: { Id: true },
      });
      if (targets.length !== targetIds.length) throw new Error("Material de destino não encontrado.");
      // Insumo repetido na prévia: último vence (o Postgres recusa duas linhas iguais num INSERT).
      const byItem = new Map<number, number>();
      for (const l of body.lines) byItem.set(l.itemId, assertQtd(l.qtd));
      const lines = [...byItem].map(([itemId, qtd]) => ({ itemId, qtd }));
      await assertCostItemsInOrg(prisma, organizationId, lines.map((l) => l.itemId));

      await prisma.$transaction(async (tx) => {
        if (body.mode === "substituir") {
          await tx.materialCompositionItem.deleteMany({ where: { BaseMaterialId: { in: targetIds } } });
          await tx.materialCompositionItem.createMany({
            data: targetIds.flatMap((tid) =>
              lines.map((l, i) => ({
                BaseMaterialId: tid,
                CostItemId: l.itemId,
                Quantity: l.qtd,
                Position: i,
              }))
            ),
          });
        } else {
          // Mesclar: novos entram depois dos existentes de cada destino (1 groupBy + 1 upsert).
          const counts = await tx.materialCompositionItem.groupBy({
            by: ["BaseMaterialId"],
            where: { BaseMaterialId: { in: targetIds } },
            _count: { _all: true },
          });
          const startOf = new Map(counts.map((c) => [c.BaseMaterialId, c._count._all]));
          await upsertCompositionRows(
            tx,
            targetIds.flatMap((tid) =>
              lines.map((l, i) => ({
                baseId: tid,
                itemId: l.itemId,
                qtd: l.qtd,
                position: (startOf.get(tid) ?? 0) + i,
              }))
            )
          );
        }
        if (body.copiarCustoQtd) {
          await tx.baseMaterial.updateMany({
            where: { Id: { in: targetIds } },
            data: { CostQuantity: source.CostQuantity },
          });
        }
      }, TX_OPTS);
      return;
    }
    default: {
      const never: never = body;
      throw new Error(`Operação inválida: ${JSON.stringify(never)}`);
    }
  }
}
