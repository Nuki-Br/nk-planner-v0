// Store de servidor (Fase 10) — port 1:1 do store mock (src/lib/data/store.ts)
// para Prisma/Postgres, com organizationId explícito em toda função. As rotas
// /api/* são os únicos consumidores; as assinaturas e mensagens de erro
// espelham o mock para a troca da camada de dados ser transparente.
//
// Nota (beta): o domínio é escopado por ORG (não por projeto), como no mock —
// o "projeto ativo" é o p001 e a trava de publicação olha para ele
// (ACTIVE_PROJECT_ID). Escopo por projeto entra quando houver multiprojeto.
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { TAX_COLUMNS_DEFAULT } from "@/shared/constants/budget";
import type {
  Ambiente,
  AmbienteImagem,
  BudgetColumn,
  BudgetVersion,
  Categoria,
  Comment,
  Componente,
  FillLink,
  FillLinkCampos,
  Kit,
  Material,
  PortalFill,
  Project,
  ProjectTaxas,
  RoomShape,
  Tipologia,
  TipologiaStatus,
  Unidade,
  UnitGroup,
  VersionChanges,
} from "@/shared/types/domain";

export const ACTIVE_PROJECT_ID = "p001";

function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/** Data/hora atual no formato de exibição: "DD/MM/AAAA HH:mm". */
function nowBR(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Interfaces do domínio → coluna Json do Prisma. */
function json<T extends object>(v: T | null | undefined): Prisma.InputJsonValue | undefined {
  return v == null ? undefined : (v as unknown as Prisma.InputJsonValue);
}

/** Trava da Fase 9: projeto ativo publicado ⇒ somente leitura. */
async function assertEditable(organizationId: string): Promise<void> {
  const p = await prisma.project.findFirst({
    where: { id: ACTIVE_PROJECT_ID, organizationId },
    select: { status: true },
  });
  if (p?.status === "publicado") {
    throw new Error("Empreendimento publicado — somente leitura.");
  }
}

// ─── Mapeadores linha do banco → domínio ──────────────────────────────

type ProjectRow = Prisma.ProjectGetPayload<{ include: { taxColumns: true } }>;
type ComponenteRow = Prisma.ComponenteGetPayload<object>;
type AmbienteRow = Prisma.AmbienteGetPayload<{ include: { componentes: true } }>;
type TipologiaRow = Prisma.TipologiaGetPayload<{
  include: { ambientes: { include: { componentes: true } } };
}>;

function toBudgetColumn(row: Prisma.BudgetColumnGetPayload<object>): BudgetColumn {
  return { id: row.id, nome: row.nome, kind: row.kind, expr: row.expr, visivel: row.visivel };
}

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    nome: row.nome,
    torre: row.torre,
    incorporadora: row.incorporadora,
    construtora: row.construtora,
    status: row.status,
    enviadoEm: row.enviadoEm,
    prazo: row.prazo,
    publicadoEm: row.publicadoEm,
    totalItens: row.totalItens,
    itensPreenchidos: row.itensPreenchidos,
    inccBase: row.inccBase ?? undefined,
    emailConstrutora: row.emailConstrutora ?? undefined,
    taxas: (row.taxas as unknown as ProjectTaxas | null) ?? undefined,
    taxColumns:
      row.taxColumns.length > 0
        ? [...row.taxColumns].sort((a, b) => a.ordem - b.ordem).map(toBudgetColumn)
        : undefined,
  };
}

function toMaterial(row: Prisma.MaterialGetPayload<object>): Material {
  return {
    id: row.id,
    codigo: row.codigo,
    nome: row.nome,
    fabricante: row.fabricante,
    categoria: row.categoria as Categoria,
    unidade: row.unidade as Unidade,
    custoMat: row.custoMat,
    custoMO: row.custoMO,
  };
}

function toKit(row: Prisma.KitGetPayload<object>): Kit {
  return {
    id: row.id,
    tipo: "kit",
    codigo: row.codigo,
    nome: row.nome,
    categoria: row.categoria as Categoria,
    itens: row.itens,
  };
}

function toComponente(row: ComponenteRow): Componente {
  return {
    id: row.id,
    nome: row.nome,
    unidade: row.unidade as Unidade,
    qtd: row.qtd,
    rt: row.rt,
    padrao: row.padrao,
    upgrades: row.upgrades,
    taxaEspecifica: null,
    ghost: row.ghost || undefined,
    ordem: row.ordem,
    kitQtds:
      (row.kitQtds as unknown as Record<string, Record<string, number>> | null) ?? undefined,
  };
}

function toAmbiente(row: AmbienteRow): Ambiente {
  return {
    id: row.id,
    nome: row.nome,
    icon: row.icon ?? undefined,
    imagem: (row.imagem as unknown as AmbienteImagem | null) ?? null,
    local: (row.local as unknown as RoomShape | null) ?? null,
    componentes: [...row.componentes].sort((a, b) => a.ordem - b.ordem).map(toComponente),
  };
}

function toTipologia(row: TipologiaRow): Tipologia {
  return {
    id: row.id,
    nome: row.nome,
    metragem: row.metragem,
    descricao: row.descricao,
    unidades: row.unidades,
    status: row.status,
    ambientes: [...row.ambientes].sort((a, b) => a.ordem - b.ordem).map(toAmbiente),
  };
}

const TIP_INCLUDE = {
  ambientes: { include: { componentes: true } },
} satisfies Prisma.TipologiaInclude;

async function findTipologia(organizationId: string, id: string): Promise<TipologiaRow> {
  const tip = await prisma.tipologia.findFirst({
    where: { id, organizationId },
    include: TIP_INCLUDE,
  });
  if (!tip) throw new Error("Tipologia não encontrada.");
  return tip;
}

async function findAmbiente(
  organizationId: string,
  tipologiaId: string,
  ambienteId: string
): Promise<AmbienteRow> {
  const amb = await prisma.ambiente.findFirst({
    where: { id: ambienteId, tipologiaId, organizationId },
    include: { componentes: true },
  });
  if (!amb) throw new Error("Ambiente não encontrado.");
  return amb;
}

async function findComponente(
  organizationId: string,
  ambienteId: string,
  componenteId: string
): Promise<ComponenteRow> {
  const comp = await prisma.componente.findFirst({
    where: { id: componenteId, ambienteId, organizationId },
  });
  if (!comp) throw new Error("Componente não encontrado.");
  return comp;
}

// ─── Projects ─────────────────────────────────────────────────────────

export type ProjectPatch = Partial<
  Pick<
    Project,
    | "nome"
    | "torre"
    | "construtora"
    | "status"
    | "enviadoEm"
    | "prazo"
    | "inccBase"
    | "emailConstrutora"
    | "taxas"
    | "totalItens"
    | "itensPreenchidos"
  >
>;

export async function listProjects(organizationId: string): Promise<Project[]> {
  const rows = await prisma.project.findMany({
    where: { organizationId },
    include: { taxColumns: true },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toProject);
}

export async function getProject(organizationId: string, id: string): Promise<Project | null> {
  const row = await prisma.project.findFirst({
    where: { id, organizationId },
    include: { taxColumns: true },
  });
  return row ? toProject(row) : null;
}

export async function updateProject(
  organizationId: string,
  id: string,
  patch: ProjectPatch
): Promise<Project> {
  await assertEditable(organizationId);
  const exists = await prisma.project.findFirst({ where: { id, organizationId } });
  if (!exists) throw new Error("Empreendimento não encontrado.");
  const { taxas, ...rest } = patch;
  const row = await prisma.project.update({
    where: { id },
    data: { ...rest, ...(taxas !== undefined ? { taxas: json(taxas) } : {}) },
    include: { taxColumns: true },
  });
  return toProject(row);
}

export async function publishProject(organizationId: string, id: string): Promise<Project> {
  const exists = await prisma.project.findFirst({ where: { id, organizationId } });
  if (!exists) throw new Error("Empreendimento não encontrado.");
  const row = await prisma.project.update({
    where: { id },
    data: { status: "publicado", publicadoEm: nowBR() },
    include: { taxColumns: true },
  });
  return toProject(row);
}

export async function getBudgetColumns(
  organizationId: string,
  projectId: string
): Promise<BudgetColumn[]> {
  const rows = await prisma.budgetColumn.findMany({
    where: { projectId, organizationId },
    orderBy: { ordem: "asc" },
  });
  return rows.length > 0 ? rows.map(toBudgetColumn) : TAX_COLUMNS_DEFAULT.map((c) => ({ ...c }));
}

export async function updateBudgetColumns(
  organizationId: string,
  projectId: string,
  cols: BudgetColumn[]
): Promise<BudgetColumn[]> {
  await assertEditable(organizationId);
  const p = await prisma.project.findFirst({ where: { id: projectId, organizationId } });
  if (!p) throw new Error("Empreendimento não encontrado.");
  await prisma.$transaction([
    prisma.budgetColumn.deleteMany({ where: { projectId, organizationId } }),
    prisma.budgetColumn.createMany({
      data: cols.map((c, i) => ({ ...c, projectId, ordem: i, organizationId })),
    }),
  ]);
  return getBudgetColumns(organizationId, projectId);
}

// ─── Materiais ────────────────────────────────────────────────────────

export type MaterialInput = Omit<Material, "id">;

export async function listMateriais(organizationId: string): Promise<Material[]> {
  const rows = await prisma.material.findMany({
    where: { organizationId },
    orderBy: { id: "asc" },
  });
  return rows.map(toMaterial);
}

export async function createMaterial(
  organizationId: string,
  input: MaterialInput
): Promise<Material> {
  await assertEditable(organizationId);
  const row = await prisma.material.create({
    data: { id: genId("mat"), ...input, organizationId },
  });
  return toMaterial(row);
}

export async function createMateriais(
  organizationId: string,
  inputs: MaterialInput[]
): Promise<Material[]> {
  await assertEditable(organizationId);
  const data = inputs.map((input) => ({ id: genId("mat"), ...input, organizationId }));
  await prisma.material.createMany({ data });
  const rows = await prisma.material.findMany({
    where: { id: { in: data.map((d) => d.id) } },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return data.map((d) => toMaterial(byId.get(d.id)!));
}

export async function updateMaterial(
  organizationId: string,
  id: string,
  patch: Partial<MaterialInput>
): Promise<Material> {
  await assertEditable(organizationId);
  const exists = await prisma.material.findFirst({ where: { id, organizationId } });
  if (!exists) throw new Error("Material não encontrado.");
  const row = await prisma.material.update({ where: { id }, data: patch });
  return toMaterial(row);
}

export async function deleteMaterial(organizationId: string, id: string): Promise<void> {
  await assertEditable(organizationId);
  const res = await prisma.material.deleteMany({ where: { id, organizationId } });
  if (res.count === 0) throw new Error("Material não encontrado.");
}

// ─── Kits ─────────────────────────────────────────────────────────────

export type KitInput = Omit<Kit, "id" | "tipo">;

export async function listKits(organizationId: string): Promise<Kit[]> {
  const rows = await prisma.kit.findMany({ where: { organizationId }, orderBy: { id: "asc" } });
  return rows.map(toKit);
}

export async function createKit(organizationId: string, input: KitInput): Promise<Kit> {
  await assertEditable(organizationId);
  const row = await prisma.kit.create({ data: { id: genId("kit"), ...input, organizationId } });
  return toKit(row);
}

export async function updateKit(
  organizationId: string,
  id: string,
  patch: Partial<KitInput>
): Promise<Kit> {
  await assertEditable(organizationId);
  const exists = await prisma.kit.findFirst({ where: { id, organizationId } });
  if (!exists) throw new Error("Kit não encontrado.");
  const row = await prisma.kit.update({ where: { id }, data: patch });
  return toKit(row);
}

export async function deleteKit(organizationId: string, id: string): Promise<void> {
  await assertEditable(organizationId);
  const res = await prisma.kit.deleteMany({ where: { id, organizationId } });
  if (res.count === 0) throw new Error("Kit não encontrado.");
}

// ─── Tipologias ───────────────────────────────────────────────────────

export type TipologiaInput = Pick<Tipologia, "nome" | "metragem" | "descricao" | "unidades">;

export async function listTipologias(organizationId: string): Promise<Tipologia[]> {
  const rows = await prisma.tipologia.findMany({
    where: { organizationId },
    include: TIP_INCLUDE,
    orderBy: { ordem: "asc" },
  });
  return rows.map(toTipologia);
}

export async function getTipologia(
  organizationId: string,
  id: string
): Promise<Tipologia | null> {
  const row = await prisma.tipologia.findFirst({
    where: { id, organizationId },
    include: TIP_INCLUDE,
  });
  return row ? toTipologia(row) : null;
}

async function nextOrdem(
  agg: { _max: { ordem: number | null } }
): Promise<number> {
  return (agg._max.ordem ?? -1) + 1;
}

export async function createTipologia(
  organizationId: string,
  input: TipologiaInput
): Promise<Tipologia> {
  await assertEditable(organizationId);
  const agg = await prisma.tipologia.aggregate({
    where: { organizationId },
    _max: { ordem: true },
  });
  const row = await prisma.tipologia.create({
    data: {
      id: genId("t"),
      ...input,
      status: "incompleta",
      ordem: await nextOrdem(agg),
      organizationId,
    },
    include: TIP_INCLUDE,
  });
  return toTipologia(row);
}

export async function updateTipologia(
  organizationId: string,
  id: string,
  patch: Partial<TipologiaInput & { status: TipologiaStatus }>
): Promise<Tipologia> {
  await assertEditable(organizationId);
  await findTipologia(organizationId, id);
  const row = await prisma.tipologia.update({
    where: { id },
    data: patch,
    include: TIP_INCLUDE,
  });
  return toTipologia(row);
}

export async function deleteTipologia(organizationId: string, id: string): Promise<void> {
  await assertEditable(organizationId);
  const res = await prisma.tipologia.deleteMany({ where: { id, organizationId } });
  if (res.count === 0) throw new Error("Tipologia não encontrada.");
}

/** Clona a árvore inteira (ambientes/componentes) com ids novos. */
export async function duplicateTipologia(
  organizationId: string,
  id: string
): Promise<Tipologia> {
  await assertEditable(organizationId);
  const src = await findTipologia(organizationId, id);
  const agg = await prisma.tipologia.aggregate({
    where: { organizationId },
    _max: { ordem: true },
  });
  const row = await prisma.tipologia.create({
    data: {
      id: genId("t"),
      nome: `${src.nome} (cópia)`,
      metragem: src.metragem,
      descricao: src.descricao,
      unidades: src.unidades,
      status: src.status,
      ordem: await nextOrdem(agg),
      organizationId,
      ambientes: {
        create: src.ambientes.map((amb) => ({
          id: genId("amb"),
          nome: amb.nome,
          icon: amb.icon,
          imagem: amb.imagem ?? undefined,
          local: amb.local ?? undefined,
          ordem: amb.ordem,
          organizationId,
          componentes: {
            create: amb.componentes.map((c) => ({
              id: genId("c"),
              nome: c.nome,
              unidade: c.unidade,
              qtd: c.qtd,
              rt: c.rt,
              padrao: c.padrao,
              upgrades: c.upgrades,
              taxaEspecifica: c.taxaEspecifica ?? undefined,
              ghost: c.ghost,
              ordem: c.ordem,
              kitQtds: c.kitQtds ?? undefined,
              organizationId,
            })),
          },
        })),
      },
    },
    include: TIP_INCLUDE,
  });
  return toTipologia(row);
}

// ─── Ambientes ────────────────────────────────────────────────────────

export type AmbienteInput = Pick<Ambiente, "nome"> &
  Partial<Pick<Ambiente, "icon" | "imagem" | "local">>;

export async function createAmbiente(
  organizationId: string,
  tipologiaId: string,
  input: AmbienteInput
): Promise<Ambiente> {
  await assertEditable(organizationId);
  await findTipologia(organizationId, tipologiaId);
  const agg = await prisma.ambiente.aggregate({
    where: { tipologiaId, organizationId },
    _max: { ordem: true },
  });
  const row = await prisma.ambiente.create({
    data: {
      id: genId("amb"),
      tipologiaId,
      nome: input.nome,
      icon: input.icon ?? null,
      imagem: json(input.imagem),
      local: json(input.local),
      ordem: await nextOrdem(agg),
      organizationId,
    },
    include: { componentes: true },
  });
  return toAmbiente(row);
}

export async function updateAmbiente(
  organizationId: string,
  tipologiaId: string,
  ambienteId: string,
  patch: Partial<AmbienteInput>
): Promise<Ambiente> {
  await assertEditable(organizationId);
  await findAmbiente(organizationId, tipologiaId, ambienteId);
  const { imagem, local, ...rest } = patch;
  const row = await prisma.ambiente.update({
    where: { id: ambienteId },
    data: {
      ...rest,
      ...(imagem !== undefined ? { imagem: json(imagem) ?? Prisma.JsonNull } : {}),
      ...(local !== undefined ? { local: json(local) ?? Prisma.JsonNull } : {}),
    },
    include: { componentes: true },
  });
  return toAmbiente(row);
}

export async function deleteAmbiente(
  organizationId: string,
  tipologiaId: string,
  ambienteId: string
): Promise<void> {
  await assertEditable(organizationId);
  await findAmbiente(organizationId, tipologiaId, ambienteId);
  await prisma.$transaction([
    // Desvincula do grupo compartilhado, se houver (como no mock).
    prisma.ambienteShared.deleteMany({ where: { ambienteId, organizationId } }),
    prisma.ambiente.delete({ where: { id: ambienteId } }),
  ]);
}

export async function cloneAmbiente(
  organizationId: string,
  tipologiaId: string,
  ambienteId: string
): Promise<Ambiente> {
  await assertEditable(organizationId);
  const src = await findAmbiente(organizationId, tipologiaId, ambienteId);
  const agg = await prisma.ambiente.aggregate({
    where: { tipologiaId, organizationId },
    _max: { ordem: true },
  });
  const row = await prisma.ambiente.create({
    data: {
      id: genId("amb"),
      tipologiaId,
      nome: `${src.nome} (cópia)`,
      icon: src.icon,
      imagem: src.imagem ?? undefined,
      local: src.local ?? undefined,
      ordem: await nextOrdem(agg),
      organizationId,
      componentes: {
        create: src.componentes.map((c) => ({
          id: genId("c"),
          nome: c.nome,
          unidade: c.unidade,
          qtd: c.qtd,
          rt: c.rt,
          padrao: c.padrao,
          upgrades: c.upgrades,
          taxaEspecifica: c.taxaEspecifica ?? undefined,
          ghost: c.ghost,
          ordem: c.ordem,
          kitQtds: c.kitQtds ?? undefined,
          organizationId,
        })),
      },
    },
    include: { componentes: true },
  });
  return toAmbiente(row);
}

export async function reorderAmbientes(
  organizationId: string,
  tipologiaId: string,
  orderedIds: string[]
): Promise<void> {
  await assertEditable(organizationId);
  const tip = await findTipologia(organizationId, tipologiaId);
  const atuais = new Set(tip.ambientes.map((a) => a.id));
  if (orderedIds.length !== atuais.size || orderedIds.some((id) => !atuais.has(id))) {
    throw new Error("Ordem de ambientes inválida.");
  }
  await prisma.$transaction(
    orderedIds.map((id, i) =>
      prisma.ambiente.update({ where: { id }, data: { ordem: i } })
    )
  );
}

// ─── Componentes ──────────────────────────────────────────────────────

export type ComponenteInput = Pick<Componente, "nome" | "unidade" | "qtd" | "rt"> &
  Partial<Pick<Componente, "ghost" | "ordem" | "padrao">>;

export async function createComponente(
  organizationId: string,
  tipologiaId: string,
  ambienteId: string,
  input: ComponenteInput
): Promise<Componente> {
  await assertEditable(organizationId);
  await findAmbiente(organizationId, tipologiaId, ambienteId);
  const agg = await prisma.componente.aggregate({
    where: { ambienteId, organizationId },
    _max: { ordem: true },
  });
  const { padrao, ordem, ...rest } = input;
  const row = await prisma.componente.create({
    data: {
      id: genId("c"),
      ambienteId,
      ...rest,
      padrao: padrao ?? null,
      upgrades: [],
      ordem: ordem ?? (await nextOrdem(agg)),
      organizationId,
    },
  });
  return toComponente(row);
}

export async function updateComponente(
  organizationId: string,
  tipologiaId: string,
  ambienteId: string,
  componenteId: string,
  patch: Partial<ComponenteInput>
): Promise<Componente> {
  await assertEditable(organizationId);
  await findAmbiente(organizationId, tipologiaId, ambienteId);
  await findComponente(organizationId, ambienteId, componenteId);
  const row = await prisma.componente.update({
    where: { id: componenteId },
    data: patch,
  });
  return toComponente(row);
}

export async function deleteComponente(
  organizationId: string,
  tipologiaId: string,
  ambienteId: string,
  componenteId: string
): Promise<void> {
  await assertEditable(organizationId);
  await findAmbiente(organizationId, tipologiaId, ambienteId);
  const res = await prisma.componente.deleteMany({
    where: { id: componenteId, ambienteId, organizationId },
  });
  if (res.count === 0) throw new Error("Componente não encontrado.");
}

export async function reorderComponentes(
  organizationId: string,
  tipologiaId: string,
  ambienteId: string,
  orderedIds: string[]
): Promise<void> {
  await assertEditable(organizationId);
  const amb = await findAmbiente(organizationId, tipologiaId, ambienteId);
  const atuais = new Set(amb.componentes.map((c) => c.id));
  if (orderedIds.length !== atuais.size || orderedIds.some((id) => !atuais.has(id))) {
    throw new Error("Ordem de componentes inválida.");
  }
  await prisma.$transaction(
    orderedIds.map((id, i) =>
      prisma.componente.update({ where: { id }, data: { ordem: i } })
    )
  );
}

export async function setPadrao(
  organizationId: string,
  tipologiaId: string,
  ambienteId: string,
  componenteId: string,
  padraoId: string | null
): Promise<Componente> {
  await assertEditable(organizationId);
  await findAmbiente(organizationId, tipologiaId, ambienteId);
  await findComponente(organizationId, ambienteId, componenteId);
  const row = await prisma.componente.update({
    where: { id: componenteId },
    data: { padrao: padraoId },
  });
  return toComponente(row);
}

export async function addUpgrade(
  organizationId: string,
  tipologiaId: string,
  ambienteId: string,
  componenteId: string,
  upgradeId: string
): Promise<Componente> {
  await assertEditable(organizationId);
  await findAmbiente(organizationId, tipologiaId, ambienteId);
  const comp = await findComponente(organizationId, ambienteId, componenteId);
  const upgrades = comp.upgrades.includes(upgradeId)
    ? comp.upgrades
    : [...comp.upgrades, upgradeId];
  const row = await prisma.componente.update({
    where: { id: componenteId },
    data: { upgrades },
  });
  return toComponente(row);
}

/** Troca o material de uma opção preservando a posição no array (ups[i] = novo). */
export async function replaceUpgrade(
  organizationId: string,
  tipologiaId: string,
  ambienteId: string,
  componenteId: string,
  oldId: string,
  newId: string
): Promise<Componente> {
  await assertEditable(organizationId);
  await findAmbiente(organizationId, tipologiaId, ambienteId);
  const comp = await findComponente(organizationId, ambienteId, componenteId);
  const upgrades = [...comp.upgrades];
  const i = upgrades.indexOf(oldId);
  if (i >= 0) upgrades[i] = newId;
  else if (!upgrades.includes(newId)) upgrades.push(newId);
  const kitQtds = (comp.kitQtds as unknown as Record<string, Record<string, number>> | null) ?? null;
  if (kitQtds && oldId !== newId) delete kitQtds[oldId];
  const row = await prisma.componente.update({
    where: { id: componenteId },
    data: { upgrades, kitQtds: kitQtds ? json(kitQtds) : Prisma.JsonNull },
  });
  return toComponente(row);
}

export async function removeUpgrade(
  organizationId: string,
  tipologiaId: string,
  ambienteId: string,
  componenteId: string,
  upgradeId: string
): Promise<Componente> {
  await assertEditable(organizationId);
  await findAmbiente(organizationId, tipologiaId, ambienteId);
  const comp = await findComponente(organizationId, ambienteId, componenteId);
  const upgrades = comp.upgrades.filter((u) => u !== upgradeId);
  const kitQtds = (comp.kitQtds as unknown as Record<string, Record<string, number>> | null) ?? null;
  if (kitQtds) delete kitQtds[upgradeId];
  const row = await prisma.componente.update({
    where: { id: componenteId },
    data: { upgrades, kitQtds: kitQtds ? json(kitQtds) : Prisma.JsonNull },
  });
  return toComponente(row);
}

/** Grava os quantitativos dos sub-itens de um kit para o componente. */
export async function setKitQtds(
  organizationId: string,
  tipologiaId: string,
  ambienteId: string,
  componenteId: string,
  kitId: string,
  qtds: Record<string, number>
): Promise<Componente> {
  await assertEditable(organizationId);
  await findAmbiente(organizationId, tipologiaId, ambienteId);
  const comp = await findComponente(organizationId, ambienteId, componenteId);
  const kitQtds = {
    ...((comp.kitQtds as unknown as Record<string, Record<string, number>> | null) ?? {}),
    [kitId]: qtds,
  };
  const row = await prisma.componente.update({
    where: { id: componenteId },
    data: { kitQtds: json(kitQtds) },
  });
  return toComponente(row);
}

// ─── Compartilhamento de ambientes entre tipologias ──────────────────

export interface SharedInfo {
  sharedReg: Record<string, { tips: string[] }>;
  ambShared: Record<string, string>;
}

export async function getSharedInfo(organizationId: string): Promise<SharedInfo> {
  const rows = await prisma.ambienteShared.findMany({ where: { organizationId } });
  const sharedReg: Record<string, { tips: string[] }> = {};
  const ambShared: Record<string, string> = {};
  for (const r of rows) {
    ambShared[r.ambienteId] = r.shareId;
    const reg = sharedReg[r.shareId] ?? { tips: [] };
    if (!reg.tips.includes(r.tipologiaId)) reg.tips.push(r.tipologiaId);
    sharedReg[r.shareId] = reg;
  }
  return { sharedReg, ambShared };
}

/**
 * Vincula um ambiente de outra tipologia à tipologia alvo: clona o ambiente
 * (ids novos) e registra ambos no grupo compartilhado do ambiente fonte.
 */
export async function linkAmbiente(
  organizationId: string,
  targetTipologiaId: string,
  srcTipologiaId: string,
  srcAmbienteId: string
): Promise<Ambiente> {
  await assertEditable(organizationId);
  await findTipologia(organizationId, targetTipologiaId);
  const srcAmb = await findAmbiente(organizationId, srcTipologiaId, srcAmbienteId);
  const existing = await prisma.ambienteShared.findFirst({
    where: { ambienteId: srcAmbienteId, organizationId },
  });
  const sid = existing?.shareId ?? `sh-${srcAmbienteId}`;

  const agg = await prisma.ambiente.aggregate({
    where: { tipologiaId: targetTipologiaId, organizationId },
    _max: { ordem: true },
  });
  const copy = await prisma.ambiente.create({
    data: {
      id: genId("amb"),
      tipologiaId: targetTipologiaId,
      nome: srcAmb.nome,
      icon: srcAmb.icon,
      imagem: srcAmb.imagem ?? undefined,
      local: srcAmb.local ?? undefined,
      ordem: await nextOrdem(agg),
      organizationId,
      componentes: {
        create: srcAmb.componentes.map((c) => ({
          id: genId("c"),
          nome: c.nome,
          unidade: c.unidade,
          qtd: c.qtd,
          rt: c.rt,
          padrao: c.padrao,
          upgrades: c.upgrades,
          taxaEspecifica: c.taxaEspecifica ?? undefined,
          ghost: c.ghost,
          ordem: c.ordem,
          kitQtds: c.kitQtds ?? undefined,
          organizationId,
        })),
      },
    },
    include: { componentes: true },
  });

  await prisma.$transaction([
    prisma.ambienteShared.upsert({
      where: { ambienteId: copy.id },
      update: { shareId: sid, tipologiaId: targetTipologiaId },
      create: {
        ambienteId: copy.id,
        shareId: sid,
        tipologiaId: targetTipologiaId,
        organizationId,
      },
    }),
    prisma.ambienteShared.upsert({
      where: { ambienteId: srcAmbienteId },
      update: { shareId: sid, tipologiaId: srcTipologiaId },
      create: {
        ambienteId: srcAmbienteId,
        shareId: sid,
        tipologiaId: srcTipologiaId,
        organizationId,
      },
    }),
  ]);

  return toAmbiente(copy);
}

// ─── Unit groups / Torres ─────────────────────────────────────────────

export type UnitGroupInput = Omit<UnitGroup, "id">;

export async function listUnitGroups(organizationId: string): Promise<UnitGroup[]> {
  const rows = await prisma.unitGroup.findMany({
    where: { organizationId },
    orderBy: { id: "asc" },
  });
  return rows.map((r) => ({ id: r.id, nome: r.nome, torre: r.torre, unidades: r.unidades }));
}

export async function createUnitGroup(
  organizationId: string,
  input: UnitGroupInput
): Promise<UnitGroup> {
  await assertEditable(organizationId);
  const row = await prisma.unitGroup.create({
    data: { id: genId("ug"), ...input, organizationId },
  });
  return { id: row.id, nome: row.nome, torre: row.torre, unidades: row.unidades };
}

export async function updateUnitGroup(
  organizationId: string,
  id: string,
  patch: Partial<UnitGroupInput>
): Promise<UnitGroup> {
  await assertEditable(organizationId);
  const exists = await prisma.unitGroup.findFirst({ where: { id, organizationId } });
  if (!exists) throw new Error("Grupo de unidades não encontrado.");
  const row = await prisma.unitGroup.update({ where: { id }, data: patch });
  return { id: row.id, nome: row.nome, torre: row.torre, unidades: row.unidades };
}

export async function deleteUnitGroup(organizationId: string, id: string): Promise<void> {
  await assertEditable(organizationId);
  const res = await prisma.unitGroup.deleteMany({ where: { id, organizationId } });
  if (res.count === 0) throw new Error("Grupo de unidades não encontrado.");
}

export async function listTorres(organizationId: string): Promise<string[]> {
  const rows = await prisma.tower.findMany({
    where: { organizationId },
    orderBy: { ordem: "asc" },
  });
  return rows.map((r) => r.nome);
}

// ─── Versions ─────────────────────────────────────────────────────────

export interface VersionInput {
  summary: string;
  createdBy: string;
  changes: VersionChanges;
}

function toVersion(row: Prisma.BudgetVersionGetPayload<object>): BudgetVersion {
  return {
    id: row.id,
    label: row.label,
    createdAt: row.criadoEm,
    createdBy: row.createdBy,
    isCurrent: row.isCurrent,
    summary: row.summary,
    changes: row.changes as unknown as VersionChanges,
  };
}

export async function listVersions(organizationId: string): Promise<BudgetVersion[]> {
  const rows = await prisma.budgetVersion.findMany({
    where: { organizationId },
    orderBy: { ordem: "asc" },
  });
  return rows.map(toVersion);
}

export async function createVersion(
  organizationId: string,
  input: VersionInput
): Promise<BudgetVersion> {
  await assertEditable(organizationId);
  const count = await prisma.budgetVersion.count({ where: { organizationId } });
  const agg = await prisma.budgetVersion.aggregate({
    where: { organizationId },
    _min: { ordem: true },
  });
  const [, row] = await prisma.$transaction([
    prisma.budgetVersion.updateMany({
      where: { organizationId },
      data: { isCurrent: false },
    }),
    prisma.budgetVersion.create({
      data: {
        id: genId("v"),
        label: `v${count + 1}`,
        criadoEm: nowBR().replace(" ", " às "),
        createdBy: input.createdBy,
        isCurrent: true,
        summary: input.summary,
        changes: json(input.changes) ?? {},
        ordem: (agg._min.ordem ?? 1) - 1, // nova versão vem primeiro na lista
        organizationId,
      },
    }),
  ]);
  return toVersion(row);
}

/** Marca a versão como atual (snapshot/restore real de estado — §12). */
export async function restoreVersion(
  organizationId: string,
  id: string
): Promise<BudgetVersion> {
  await assertEditable(organizationId);
  const exists = await prisma.budgetVersion.findFirst({ where: { id, organizationId } });
  if (!exists) throw new Error("Versão não encontrada.");
  const [, row] = await prisma.$transaction([
    prisma.budgetVersion.updateMany({
      where: { organizationId },
      data: { isCurrent: false },
    }),
    prisma.budgetVersion.update({ where: { id }, data: { isCurrent: true } }),
  ]);
  return toVersion(row);
}

// ─── Comments (rowKey = `${compId}-${optId}`) ─────────────────────────

export interface CommentInput {
  autor: Comment["autor"];
  texto: string;
}

export async function getComments(organizationId: string, rowKey: string): Promise<Comment[]> {
  const rows = await prisma.comment.findMany({
    where: { rowKey, organizationId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => ({ autor: r.autor, texto: r.texto, data: r.data }));
}

/** Todas as threads (contadores de comentário por linha nas tabelas). */
export async function listCommentThreads(
  organizationId: string
): Promise<Record<string, Comment[]>> {
  const rows = await prisma.comment.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
  });
  const threads: Record<string, Comment[]> = {};
  for (const r of rows) {
    const thread = threads[r.rowKey] ?? [];
    thread.push({ autor: r.autor, texto: r.texto, data: r.data });
    threads[r.rowKey] = thread;
  }
  return threads;
}

export async function appendComment(
  organizationId: string,
  rowKey: string,
  input: CommentInput
): Promise<Comment> {
  await assertEditable(organizationId);
  const row = await prisma.comment.create({
    data: { rowKey, autor: input.autor, texto: input.texto, data: nowBR(), organizationId },
  });
  return { autor: row.autor, texto: row.texto, data: row.data };
}

// ─── Pending items ────────────────────────────────────────────────────

export async function listPendingItems(organizationId: string): Promise<string[]> {
  const rows = await prisma.pendingItem.findMany({ where: { organizationId } });
  return rows.map((r) => r.key);
}

export async function addPendingItem(organizationId: string, key: string): Promise<void> {
  await assertEditable(organizationId);
  await prisma.pendingItem.upsert({
    where: { key },
    update: {},
    create: { key, organizationId },
  });
}

export async function removePendingItem(organizationId: string, key: string): Promise<void> {
  await assertEditable(organizationId);
  await prisma.pendingItem.deleteMany({ where: { key, organizationId } });
}

// ─── Links de preenchimento + portal do terceiro ──────────────────────

export type FillLinkInput = Pick<FillLink, "tipologiaIds" | "campos" | "prazo" | "senha">;

function toFillLink(row: Prisma.FillLinkGetPayload<object>): FillLink {
  return {
    id: row.id,
    token: row.token,
    tipologiaIds: row.tipologiaIds,
    campos: row.campos as unknown as FillLinkCampos,
    prazo: row.prazo,
    senha: row.senha,
    criadoEm: row.criadoEm,
  };
}

export async function createFillLink(
  organizationId: string,
  input: FillLinkInput
): Promise<FillLink> {
  await assertEditable(organizationId);
  const row = await prisma.fillLink.create({
    data: {
      id: genId("fl"),
      token: Math.random().toString(36).slice(2, 10),
      tipologiaIds: input.tipologiaIds,
      campos: json(input.campos) ?? {},
      prazo: input.prazo,
      senha: input.senha,
      criadoEm: nowBR(),
      organizationId,
    },
  });
  return toFillLink(row);
}

/** Resolução do token do portal — PÚBLICA (retorna também a org do link). */
export async function getFillLinkByToken(
  token: string
): Promise<{ link: FillLink; organizationId: string } | null> {
  const row = await prisma.fillLink.findUnique({ where: { token } });
  return row ? { link: toFillLink(row), organizationId: row.organizationId } : null;
}

export async function getPortalFills(
  organizationId: string
): Promise<Record<string, PortalFill>> {
  const rows = await prisma.portalFill.findMany({ where: { organizationId } });
  const fills: Record<string, PortalFill> = {};
  for (const r of rows) fills[r.materialId] = { mat: r.mat, mo: r.mo, comment: r.comment };
  return fills;
}

/**
 * "Enviar preenchimento" do portal: grava os fills, aplica os custos com
 * material preenchido ao catálogo, limpa as pendências relacionadas e move o
 * projeto ativo para "em_revisao". Retorna quantos materiais foram aplicados.
 */
export async function submitPortalFills(
  organizationId: string,
  fills: Record<string, PortalFill>
): Promise<number> {
  await assertEditable(organizationId);

  await prisma.$transaction([
    prisma.portalFill.deleteMany({ where: { organizationId } }),
    prisma.portalFill.createMany({
      data: Object.entries(fills).map(([materialId, f]) => ({
        materialId,
        mat: f.mat,
        mo: f.mo,
        comment: f.comment,
        organizationId,
      })),
    }),
  ]);

  let applied = 0;
  const pendentes = await prisma.pendingItem.findMany({ where: { organizationId } });
  for (const [materialId, fill] of Object.entries(fills)) {
    const custoMat = parseFloat(fill.mat);
    if (!(custoMat > 0)) continue;
    const res = await prisma.material.updateMany({
      where: { id: materialId, organizationId },
      data: { custoMat, custoMO: parseFloat(fill.mo) > 0 ? parseFloat(fill.mo) : 0 },
    });
    if (res.count === 0) continue;
    applied += 1;
    const keys = pendentes
      .filter((pi) => pi.key.endsWith(`-${materialId}`))
      .map((pi) => pi.key);
    if (keys.length > 0) {
      await prisma.pendingItem.deleteMany({ where: { key: { in: keys }, organizationId } });
    }
  }

  if (applied > 0) {
    await prisma.project.updateMany({
      where: { id: ACTIVE_PROJECT_ID, organizationId },
      data: { status: "em_revisao" },
    });
  }
  return applied;
}
