// Store de servidor (Fase 3 — realinhado ao schema relacional) — a única
// camada que fala Prisma/Postgres. As rotas /api/* são os únicos consumidores;
// cada função recebe organizationId explícito (vem da sessão; o cliente nunca
// envia org) e ids de domínio em `number` (as rotas parseiam string→Int na borda).
//
// Modelo: Enterprise → Blueprint ⇄ Room (via BlueprintRoom) → RoomComponent
// (paleta compartilhada) com Options (Material → BaseMaterial). Quantidade/RT e
// quantitativos de kit variam POR PLANTA em BlueprintRoomComponent / MaterialKitUsage.
// Catálogo = BaseMaterial (Type single|kit) + MaterialKitItem, escopado por Organization.
//
// Nota (beta): o domínio é single-Enterprise por org (onboarding = 1 org = 1
// empreendimento). `activeEnterprise*` resolve o empreendimento âncora (o mais
// antigo). Escopo multi-empreendimento entra quando o produto precisar.
//
// Conversões de borda:
//   custo reais↔cents: fromCents(null|0 → 0); toCentsOrNull(reais>0 ? round : null).
//   "pendente" NÃO é mais uma tabela — deriva de CostMaterialInCents IS NULL (custo 0).
import { randomUUID } from "crypto";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { assertMediaFileInOrg } from "@/lib/server/media";
import { resolveMediaUrl } from "@/lib/server/mediaRules";
import { TAX_COLUMNS_DEFAULT } from "@/shared/constants/budget";
import type {
  Ambiente,
  ImagemVinculada,
  BudgetColumn,
  BudgetVersion,
  CategoriaCatalogo,
  Comment,
  Componente,
  FillLink,
  FillLinkCampos,
  Kit,
  KitItem,
  Material,
  MaterialOption,
  PortalFill,
  Project,
  RoomShape,
  Tipologia,
  TipologiaStatus,
  Torre,
  Unidade,
  UnitGroup,
  VersionChanges,
} from "@/shared/types/domain";

// ─── Utilidades de borda ────────────────────────────────────────────────

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

/** Centavos (nullable) → reais (0 quando NULL/pendente). */
function fromCents(cents: number | null | undefined): number {
  return cents == null ? 0 : cents / 100;
}

/** Reais → centavos inteiros; 0/negativo vira NULL (= pendente/sem custo). */
function toCentsOrNull(reais: number): number | null {
  return reais > 0 ? Math.round(reais * 100) : null;
}

/** Nome de arquivo derivado de uma URL de imagem (o schema guarda só a URL). */
function imageName(url: string): string {
  const seg = (url.split("?")[0] ?? "").split("/").pop() ?? "";
  return seg || "imagem";
}

function isFkRestrict(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003";
}

// ─── Imagem de entidade (media center) ──────────────────────────────────

type MediaFileRow = Prisma.MediaFileGetPayload<object>;

/**
 * Linha (MediaFile + coluna legada) → ImagemVinculada do domínio.
 *
 * Só reporta mediaFileId quando o arquivo está ATIVO: se foi excluído, a URL
 * resolvida é a legada, e devolver o id de um arquivo morto faria o picker
 * exibir um vínculo que não existe mais.
 */
function toImagem(
  media: MediaFileRow | null,
  legacyUrl: string | null
): ImagemVinculada | null {
  const active = media && media.Status === "Active" ? media : null;
  const url = resolveMediaUrl(media, legacyUrl);
  if (!url) return null;
  return { name: active?.DisplayName ?? imageName(url), url, mediaFileId: active?.Id };
}

/**
 * ImagemVinculada → colunas do banco. Três casos, e o terceiro é o que morde:
 *   - null            → remove os dois
 *   - com mediaFileId → vincula e zera a legada (substituir descarta a antiga,
 *     senão excluir a nova ressuscitaria a velha, o que ninguém espera)
 *   - só url (legada) → PRESERVA a legada. Uma entidade antiga editada devolve
 *     a imagem sem mediaFileId; zerar aqui apagaria a imagem dela.
 */
function imageColumns(
  imagem: ImagemVinculada | null | undefined
): { legacyUrl: string | null; mediaFileId: number | null } {
  if (imagem == null) return { legacyUrl: null, mediaFileId: null };
  if (imagem.mediaFileId != null) return { legacyUrl: null, mediaFileId: imagem.mediaFileId };
  return { legacyUrl: imagem.url, mediaFileId: null };
}

/** Impede vincular um MediaFile de OUTRA organização (CLAUDE.md: toda linha é
 *  org-scoped). Sem isto, um request forjado leria a URL de arquivo alheio. */
async function assertImagemInOrg(
  organizationId: string,
  imagem: ImagemVinculada | null | undefined
): Promise<void> {
  if (imagem?.mediaFileId != null) {
    await assertMediaFileInOrg(organizationId, imagem.mediaFileId);
  }
}

// ─── Empreendimento âncora (single-Enterprise por org no beta) ──────────

async function activeEnterpriseIdOrNull(organizationId: string): Promise<number | null> {
  const e = await prisma.enterprise.findFirst({
    where: { OrganizationId: organizationId },
    orderBy: { CreatedAt: "asc" },
    select: { Id: true },
  });
  return e?.Id ?? null;
}

async function activeEnterpriseId(organizationId: string): Promise<number> {
  const id = await activeEnterpriseIdOrNull(organizationId);
  if (id == null) throw new Error("Nenhum empreendimento encontrado.");
  return id;
}

/**
 * Empreendimento âncora da org (MVP single-project): o mais antigo criado.
 * null se a org ainda não tem empreendimento. Mantém o nome legado usado pelo
 * portal e por submitPortalFills.
 */
export async function getActiveProjectId(organizationId: string): Promise<number | null> {
  return activeEnterpriseIdOrNull(organizationId);
}

// ─── Categorias de catálogo (MaterialCategory por org) ──────────────────

// Match case-insensitive em todos os caminhos: sem unique no banco, é o que
// impede o CSV com "piso" de duplicar a categoria "Piso".
async function findCategoryByName(organizationId: string, nome: string) {
  return prisma.materialCategory.findFirst({
    where: { OrganizationId: organizationId, Name: { equals: nome, mode: "insensitive" } },
    select: { Id: true },
  });
}

async function resolveCategoryId(organizationId: string, categoria: string): Promise<number> {
  const existing = await findCategoryByName(organizationId, categoria);
  if (existing) return existing.Id;
  const created = await prisma.materialCategory.create({
    data: { OrganizationId: organizationId, Name: categoria, ColorScheme: "gray" },
    select: { Id: true },
  });
  return created.Id;
}

export type CategoriaInput = { nome: string; cor: string };

const CATEGORY_INCLUDE = {
  _count: { select: { BaseMaterials: true } },
} satisfies Prisma.MaterialCategoryInclude;
type CategoryRow = Prisma.MaterialCategoryGetPayload<{ include: typeof CATEGORY_INCLUDE }>;

function toCategoria(row: CategoryRow): CategoriaCatalogo {
  return {
    id: row.Id,
    nome: row.Name,
    cor: row.ColorScheme ?? "gray",
    usos: row._count.BaseMaterials,
  };
}

export async function listCategorias(organizationId: string): Promise<CategoriaCatalogo[]> {
  const rows = await prisma.materialCategory.findMany({
    where: { OrganizationId: organizationId },
    include: CATEGORY_INCLUDE,
    orderBy: { Name: "asc" },
  });
  return rows.map(toCategoria);
}

export async function createCategoria(
  organizationId: string,
  input: CategoriaInput
): Promise<CategoriaCatalogo> {
  const nome = input.nome.trim();
  if (nome === "") throw new Error("Informe o nome da categoria.");
  if (await findCategoryByName(organizationId, nome))
    throw new Error("Já existe uma categoria com esse nome.");
  const row = await prisma.materialCategory.create({
    data: { OrganizationId: organizationId, Name: nome, ColorScheme: input.cor },
    include: CATEGORY_INCLUDE,
  });
  return toCategoria(row);
}

export async function updateCategoria(
  organizationId: string,
  id: number,
  patch: Partial<CategoriaInput>
): Promise<CategoriaCatalogo> {
  const exists = await prisma.materialCategory.findFirst({
    where: { Id: id, OrganizationId: organizationId },
    select: { Id: true },
  });
  if (!exists) throw new Error("Categoria não encontrada.");
  const data: Prisma.MaterialCategoryUpdateInput = {};
  if (patch.nome !== undefined) {
    const nome = patch.nome.trim();
    if (nome === "") throw new Error("Informe o nome da categoria.");
    const dupe = await findCategoryByName(organizationId, nome);
    if (dupe && dupe.Id !== id) throw new Error("Já existe uma categoria com esse nome.");
    data.Name = nome;
  }
  if (patch.cor !== undefined) data.ColorScheme = patch.cor;
  const row = await prisma.materialCategory.update({
    where: { Id: id },
    data,
    include: CATEGORY_INCLUDE,
  });
  return toCategoria(row);
}

export async function deleteCategoria(organizationId: string, id: number): Promise<void> {
  const exists = await prisma.materialCategory.findFirst({
    where: { Id: id, OrganizationId: organizationId },
    select: { Id: true },
  });
  if (!exists) throw new Error("Categoria não encontrada.");
  // FK BaseMaterial.CategoryId é SetNull: materiais ficam "sem categoria".
  await prisma.materialCategory.delete({ where: { Id: id } });
}

// ─── Mapeadores: linha do banco → domínio ──────────────────────────────

const ENTERPRISE_INCLUDE = { BudgetColumns: true } satisfies Prisma.EnterpriseInclude;
type EnterpriseRow = Prisma.EnterpriseGetPayload<{ include: typeof ENTERPRISE_INCLUDE }>;

function toBudgetColumn(row: Prisma.BudgetColumnGetPayload<object>): BudgetColumn {
  return { id: row.Id, nome: row.Name, kind: row.Kind, expr: row.Expr, visivel: row.Visible };
}

function toProject(row: EnterpriseRow): Project {
  return {
    id: row.Id,
    nome: row.Name,
    torre: row.TowerLabel ?? "",
    incorporadora: row.Developer ?? "",
    status: row.Status,
    enviadoEm: row.SubmittedAtLabel,
    prazo: row.DeadlineLabel,
    publicadoEm: row.PublishedAtLabel,
    totalItens: row.TotalItems,
    itensPreenchidos: row.FilledItems,
    taxColumns:
      row.BudgetColumns.length > 0
        ? [...row.BudgetColumns].sort((a, b) => a.Position - b.Position).map(toBudgetColumn)
        : undefined,
  };
}

/** Include reusado por todo caminho que monta um Material.
 *  `MediaFile` é obrigatório: toMaterial o exige, então esquecê-lo em algum
 *  caller vira erro de tipo em vez de imagem sumindo em runtime. */
const BASE_MATERIAL_INCLUDE = {
  Category: true,
  MediaFile: true,
} satisfies Prisma.BaseMaterialInclude;
type BaseMaterialRow = Prisma.BaseMaterialGetPayload<{ include: typeof BASE_MATERIAL_INCLUDE }>;

// KitItems mapeia para KitItem inline (sem imagem no domínio), então o
// ChildMaterial aqui não precisa de MediaFile.
const KIT_INCLUDE = {
  Category: true,
  KitItems: { include: { ChildMaterial: { include: { Category: true } } } },
} satisfies Prisma.BaseMaterialInclude;
type KitRow = Prisma.BaseMaterialGetPayload<{ include: typeof KIT_INCLUDE }>;

function toMaterial(row: BaseMaterialRow): Material {
  return {
    id: row.Id,
    codigo: row.ReferenceCode,
    nome: row.Name,
    fabricante: row.Manufacturer ?? "",
    categoria: row.Category?.Name ?? "",
    custoMat: fromCents(row.CostMaterialInCents),
    custoMO: fromCents(row.CostLaborInCents),
    imagem: toImagem(row.MediaFile, row.ImagePreviewUrl),
  };
}

function toKit(row: KitRow): Kit {
  const itens: KitItem[] = [...row.KitItems]
    .sort((a, b) => a.Position - b.Position)
    .map((ki) => ({
      id: ki.Id,
      materialId: ki.ChildMaterialId,
      nome: ki.ChildMaterial.Name,
      fabricante: ki.ChildMaterial.Manufacturer ?? "",
      // Fallback para o Unit do material: kits antigos (antes da coluna
      // MaterialKitItem.Unit) mantêm a unidade que exibiam.
      unidade: (ki.Unit ?? ki.ChildMaterial.Unit ?? "und") as Unidade,
      custoMat: fromCents(ki.ChildMaterial.CostMaterialInCents),
      custoMO: fromCents(ki.ChildMaterial.CostLaborInCents),
    }));
  return {
    id: row.Id,
    codigo: row.ReferenceCode,
    nome: row.Name,
    categoria: row.Category?.Name ?? "",
    itens,
  };
}

// Árvore de uma planta (Blueprint) em duas camadas: paleta compartilhada
// (Room→RoomComponent→Options→BaseMaterial) + overrides por planta
// (BlueprintRoomComponent + MaterialKitUsage).
/** Include do Room reusado por todos os caminhos que montam um Ambiente. */
const ROOM_INCLUDE = {
  RoomComponents: {
    include: { Options: { include: { BaseMaterial: true } } },
  },
} satisfies Prisma.RoomInclude;

const BLUEPRINT_INCLUDE = {
  BlueprintRooms: {
    include: {
      Room: { include: ROOM_INCLUDE },
      Components: { include: { KitUsages: true } },
    },
  },
} satisfies Prisma.BlueprintInclude;
type BlueprintRow = Prisma.BlueprintGetPayload<{ include: typeof BLUEPRINT_INCLUDE }>;
type BlueprintRoomRow = BlueprintRow["BlueprintRooms"][number];
type RoomComponentRow = BlueprintRoomRow["Room"]["RoomComponents"][number];
type OptionRow = RoomComponentRow["Options"][number];
type BrcRow = BlueprintRoomRow["Components"][number];

function toMaterialOption(m: OptionRow, defaultMaterialId: number | null): MaterialOption {
  return {
    id: m.Id,
    baseId: m.BaseMaterialId,
    isKit: m.BaseMaterial.Type === "kit",
    isDefault: m.Id === defaultMaterialId,
    ordem: m.Position,
  };
}

function toComponente(rc: RoomComponentRow, brc: BrcRow | undefined): Componente {
  const options = [...rc.Options]
    .sort((a, b) => a.Position - b.Position)
    .map((m) => toMaterialOption(m, rc.DefaultMaterialId));
  const kitQtds: Record<number, number> = {};
  if (brc) for (const ku of brc.KitUsages) kitQtds[ku.KitItemId] = ku.UsageQuantity;
  return {
    id: rc.Id,
    nome: rc.Name,
    unidade: rc.Unit as Unidade,
    instanceId: brc?.Id ?? 0,
    qtd: brc?.UsageQuantity ?? 0,
    rt: brc?.TechnicalReservePct ?? 0,
    padrao: rc.DefaultMaterialId,
    options,
    ghost: rc.IsGhost,
    ordem: rc.Position,
    kitQtds,
  };
}

function toAmbiente(br: BlueprintRoomRow): Ambiente {
  const brcByRc = new Map(br.Components.map((c) => [c.RoomComponentId, c]));
  const componentes = [...br.Room.RoomComponents]
    .sort((a, b) => a.Position - b.Position)
    .map((rc) => toComponente(rc, brcByRc.get(rc.Id)));
  return {
    id: br.Room.Id,
    blueprintRoomId: br.Id,
    nome: br.Room.Name,
    icon: br.Room.Icon ?? undefined,
    local: (br.Polygon as unknown as RoomShape | null) ?? null,
    componentes,
  };
}

function toTipologia(bp: BlueprintRow): Tipologia {
  return {
    id: bp.Id,
    nome: bp.Name,
    metragem: bp.AreaSqM ?? 0,
    descricao: bp.Description,
    unidades: bp.UnitCount,
    status: bp.Status,
    ambientes: [...bp.BlueprintRooms].sort((a, b) => a.Position - b.Position).map(toAmbiente),
  };
}

// ─── Finders escopados por org (traversal até Enterprise.OrganizationId) ─

async function findBlueprintRow(organizationId: string, id: number): Promise<BlueprintRow> {
  const bp = await prisma.blueprint.findFirst({
    where: { Id: id, Enterprise: { OrganizationId: organizationId } },
    include: BLUEPRINT_INCLUDE,
  });
  if (!bp) throw new Error("Tipologia não encontrada.");
  return bp;
}

async function assertBlueprint(organizationId: string, id: number): Promise<number> {
  const bp = await prisma.blueprint.findFirst({
    where: { Id: id, Enterprise: { OrganizationId: organizationId } },
    select: { Id: true, EnterpriseId: true },
  });
  if (!bp) throw new Error("Tipologia não encontrada.");
  return bp.EnterpriseId;
}

type BlueprintRoomCtx = { id: number; roomId: number; enterpriseId: number };

async function findBlueprintRoomCtx(
  organizationId: string,
  blueprintId: number,
  blueprintRoomId: number
): Promise<BlueprintRoomCtx> {
  const br = await prisma.blueprintRoom.findFirst({
    where: {
      Id: blueprintRoomId,
      BlueprintId: blueprintId,
      Blueprint: { Enterprise: { OrganizationId: organizationId } },
    },
    select: { Id: true, RoomId: true, Room: { select: { EnterpriseId: true } } },
  });
  if (!br) throw new Error("Ambiente não encontrado.");
  return { id: br.Id, roomId: br.RoomId, enterpriseId: br.Room.EnterpriseId };
}

type RoomComponentCtx = { id: number; roomId: number; enterpriseId: number; defaultMaterialId: number | null };

async function findRoomComponentCtx(
  organizationId: string,
  roomComponentId: number
): Promise<RoomComponentCtx> {
  const rc = await prisma.roomComponent.findFirst({
    where: { Id: roomComponentId, Room: { Enterprise: { OrganizationId: organizationId } } },
    select: {
      Id: true,
      RoomId: true,
      DefaultMaterialId: true,
      Room: { select: { EnterpriseId: true } },
    },
  });
  if (!rc) throw new Error("Componente não encontrado.");
  return {
    id: rc.Id,
    roomId: rc.RoomId,
    enterpriseId: rc.Room.EnterpriseId,
    defaultMaterialId: rc.DefaultMaterialId,
  };
}

/** BlueprintRoomComponent da instância (planta + componente), criando se faltar. */
async function ensureBrc(
  ctx: BlueprintRoomCtx,
  roomComponentId: number,
  qtd = 0,
  rt = 0
): Promise<number> {
  const brc = await prisma.blueprintRoomComponent.upsert({
    where: { BlueprintRoomId_RoomComponentId: { BlueprintRoomId: ctx.id, RoomComponentId: roomComponentId } },
    update: {},
    create: { BlueprintRoomId: ctx.id, RoomComponentId: roomComponentId, UsageQuantity: qtd, TechnicalReservePct: rt },
    select: { Id: true },
  });
  return brc.Id;
}

/** Retorna o Componente (mapeado) de um RoomComponent nesta planta. */
async function reloadComponente(
  organizationId: string,
  blueprintRoomId: number,
  roomComponentId: number
): Promise<Componente> {
  const rc = await prisma.roomComponent.findFirst({
    where: { Id: roomComponentId, Room: { Enterprise: { OrganizationId: organizationId } } },
    include: { Options: { include: { BaseMaterial: true } } },
  });
  if (!rc) throw new Error("Componente não encontrado.");
  const brc = await prisma.blueprintRoomComponent.findUnique({
    where: { BlueprintRoomId_RoomComponentId: { BlueprintRoomId: blueprintRoomId, RoomComponentId: roomComponentId } },
    include: { KitUsages: true },
  });
  return toComponente(rc, brc ?? undefined);
}

async function nextPosition(current: number | null | undefined): Promise<number> {
  return (current ?? -1) + 1;
}

// ─── Projects (Enterprise) ──────────────────────────────────────────────

// TowerLabel NÃO entra no patch: é derivado das torres em updateTorres
// (escritor único — evita o label divergir da lista real).
export type ProjectPatch = Partial<
  Pick<
    Project,
    | "nome"
    | "status"
    | "enviadoEm"
    | "prazo"
    | "totalItens"
    | "itensPreenchidos"
  >
>;

function projectPatchToData(patch: ProjectPatch): Prisma.EnterpriseUpdateInput {
  const data: Prisma.EnterpriseUpdateInput = {};
  if (patch.nome !== undefined) data.Name = patch.nome;
  if (patch.status !== undefined) data.Status = patch.status;
  if (patch.enviadoEm !== undefined) data.SubmittedAtLabel = patch.enviadoEm;
  if (patch.prazo !== undefined) data.DeadlineLabel = patch.prazo;
  if (patch.totalItens !== undefined) data.TotalItems = patch.totalItens;
  if (patch.itensPreenchidos !== undefined) data.FilledItems = patch.itensPreenchidos;
  return data;
}

export async function listProjects(organizationId: string): Promise<Project[]> {
  const rows = await prisma.enterprise.findMany({
    where: { OrganizationId: organizationId },
    include: ENTERPRISE_INCLUDE,
    orderBy: { CreatedAt: "asc" },
  });
  return rows.map(toProject);
}

export async function getProject(organizationId: string, id: number): Promise<Project | null> {
  const row = await prisma.enterprise.findFirst({
    where: { Id: id, OrganizationId: organizationId },
    include: ENTERPRISE_INCLUDE,
  });
  return row ? toProject(row) : null;
}

export async function updateProject(
  organizationId: string,
  id: number,
  patch: ProjectPatch
): Promise<Project> {
  const exists = await prisma.enterprise.findFirst({ where: { Id: id, OrganizationId: organizationId } });
  if (!exists) throw new Error("Empreendimento não encontrado.");
  const row = await prisma.enterprise.update({
    where: { Id: id },
    data: projectPatchToData(patch),
    include: ENTERPRISE_INCLUDE,
  });
  return toProject(row);
}

export async function publishProject(organizationId: string, id: number): Promise<Project> {
  const exists = await prisma.enterprise.findFirst({ where: { Id: id, OrganizationId: organizationId } });
  if (!exists) throw new Error("Empreendimento não encontrado.");
  const row = await prisma.enterprise.update({
    where: { Id: id },
    data: { Status: "publicado", PublishedAtLabel: nowBR() },
    include: ENTERPRISE_INCLUDE,
  });
  return toProject(row);
}

// ─── Budget columns (Enterprise) ────────────────────────────────────────

export async function getBudgetColumns(
  organizationId: string,
  projectId: number
): Promise<BudgetColumn[]> {
  await assertEnterprise(organizationId, projectId);
  const rows = await prisma.budgetColumn.findMany({
    where: { EnterpriseId: projectId },
    orderBy: { Position: "asc" },
  });
  return rows.length > 0 ? rows.map(toBudgetColumn) : TAX_COLUMNS_DEFAULT.map((c) => ({ ...c }));
}

export async function updateBudgetColumns(
  organizationId: string,
  projectId: number,
  cols: BudgetColumn[]
): Promise<BudgetColumn[]> {
  await assertEnterprise(organizationId, projectId);
  await prisma.$transaction([
    prisma.budgetColumn.deleteMany({ where: { EnterpriseId: projectId } }),
    prisma.budgetColumn.createMany({
      data: cols.map((c, i) => ({
        EnterpriseId: projectId,
        Name: c.nome,
        Kind: c.kind,
        Expr: c.expr,
        Visible: c.visivel,
        Position: i,
      })),
    }),
  ]);
  return getBudgetColumns(organizationId, projectId);
}

async function assertEnterprise(organizationId: string, id: number): Promise<void> {
  const e = await prisma.enterprise.findFirst({
    where: { Id: id, OrganizationId: organizationId },
    select: { Id: true },
  });
  if (!e) throw new Error("Empreendimento não encontrado.");
}

// ─── Materiais (BaseMaterial Type="single") ─────────────────────────────

export type MaterialInput = Omit<Material, "id">;

export async function listMateriais(organizationId: string): Promise<Material[]> {
  const rows = await prisma.baseMaterial.findMany({
    where: { OrganizationId: organizationId, Type: "single" },
    include: BASE_MATERIAL_INCLUDE,
    orderBy: { Id: "asc" },
  });
  return rows.map(toMaterial);
}

async function baseMaterialCreateData(
  organizationId: string,
  input: MaterialInput,
  categoryId: number
): Promise<Prisma.BaseMaterialCreateManyInput> {
  // O guard mora AQUI, não nos callers: createMaterial e createMateriais
  // convergem nesta função, e a versão anterior guardava só o singular — o
  // POST /api/materiais com body em array furava o escopo de org.
  await assertImagemInOrg(organizationId, input.imagem);
  const { legacyUrl, mediaFileId } = imageColumns(input.imagem);
  return {
    OrganizationId: organizationId,
    CategoryId: categoryId,
    Type: "single",
    ReferenceCode: input.codigo,
    Name: input.nome,
    Manufacturer: input.fabricante,
    CostMaterialInCents: toCentsOrNull(input.custoMat),
    CostLaborInCents: toCentsOrNull(input.custoMO),
    ImagePreviewUrl: legacyUrl,
    MediaFileId: mediaFileId,
  };
}

export async function createMaterial(
  organizationId: string,
  input: MaterialInput
): Promise<Material> {
  // Sem assertImagemInOrg aqui — baseMaterialCreateData já guarda.
  const categoryId = await resolveCategoryId(organizationId, input.categoria);
  const row = await prisma.baseMaterial.create({
    data: await baseMaterialCreateData(organizationId, input, categoryId),
    include: BASE_MATERIAL_INCLUDE,
  });
  return toMaterial(row);
}

export async function createMateriais(
  organizationId: string,
  inputs: MaterialInput[]
): Promise<Material[]> {
  // Resolve as categorias distintas de uma vez (evita N find-or-create).
  const catByName = new Map<string, number>();
  for (const cat of new Set(inputs.map((i) => i.categoria))) {
    catByName.set(cat, await resolveCategoryId(organizationId, cat));
  }
  const data = await Promise.all(
    inputs.map((input) => baseMaterialCreateData(organizationId, input, catByName.get(input.categoria)!))
  );
  const rows = await prisma.baseMaterial.createManyAndReturn({
    data,
    include: BASE_MATERIAL_INCLUDE,
  });
  return rows.map(toMaterial);
}

export async function updateMaterial(
  organizationId: string,
  id: number,
  patch: Partial<MaterialInput>
): Promise<Material> {
  const exists = await prisma.baseMaterial.findFirst({
    where: { Id: id, OrganizationId: organizationId },
    select: { Id: true },
  });
  if (!exists) throw new Error("Material não encontrado.");
  await assertImagemInOrg(organizationId, patch.imagem);
  const data: Prisma.BaseMaterialUpdateInput = {};
  if (patch.codigo !== undefined) data.ReferenceCode = patch.codigo;
  if (patch.nome !== undefined) data.Name = patch.nome;
  if (patch.fabricante !== undefined) data.Manufacturer = patch.fabricante;
  if (patch.custoMat !== undefined) data.CostMaterialInCents = toCentsOrNull(patch.custoMat);
  if (patch.custoMO !== undefined) data.CostLaborInCents = toCentsOrNull(patch.custoMO);
  if (patch.categoria !== undefined) {
    data.Category = { connect: { Id: await resolveCategoryId(organizationId, patch.categoria) } };
  }
  if (patch.imagem !== undefined) {
    const { legacyUrl, mediaFileId } = imageColumns(patch.imagem);
    data.ImagePreviewUrl = legacyUrl;
    // Input "checked" (Category usa connect), então a FK também vai por relação.
    data.MediaFile = mediaFileId === null ? { disconnect: true } : { connect: { Id: mediaFileId } };
  }
  const row = await prisma.baseMaterial.update({
    where: { Id: id },
    data,
    include: BASE_MATERIAL_INCLUDE,
  });
  return toMaterial(row);
}

export async function deleteMaterial(organizationId: string, id: number): Promise<void> {
  const exists = await prisma.baseMaterial.findFirst({
    where: { Id: id, OrganizationId: organizationId },
    select: { Id: true },
  });
  if (!exists) throw new Error("Material não encontrado.");
  try {
    await prisma.baseMaterial.delete({ where: { Id: id } });
  } catch (e) {
    if (isFkRestrict(e)) throw new Error("Material em uso; remova as opções/kits que o utilizam.");
    throw e;
  }
}

// ─── Kits (BaseMaterial Type="kit" + MaterialKitItem) ───────────────────

export type KitInput = Omit<Kit, "id">;

export async function listKits(organizationId: string): Promise<Kit[]> {
  const rows = await prisma.baseMaterial.findMany({
    where: { OrganizationId: organizationId, Type: "kit" },
    include: KIT_INCLUDE,
    orderBy: { Id: "asc" },
  });
  return rows.map(toKit);
}

async function loadKit(id: number): Promise<Kit> {
  const row = await prisma.baseMaterial.findUnique({ where: { Id: id }, include: KIT_INCLUDE });
  if (!row) throw new Error("Kit não encontrado.");
  return toKit(row);
}

export async function createKit(organizationId: string, input: KitInput): Promise<Kit> {
  const categoryId = await resolveCategoryId(organizationId, input.categoria);
  const row = await prisma.baseMaterial.create({
    data: {
      OrganizationId: organizationId,
      CategoryId: categoryId,
      Type: "kit",
      ReferenceCode: input.codigo,
      Name: input.nome,
      KitItems: {
        create: input.itens.map((it, i) => ({
          ChildMaterialId: it.materialId,
          Position: i,
          Unit: it.unidade || null, // "" nunca persiste — cai no fallback do material
        })),
      },
    },
    select: { Id: true },
  });
  return loadKit(row.Id);
}

export async function updateKit(
  organizationId: string,
  id: number,
  patch: Partial<KitInput>
): Promise<Kit> {
  const exists = await prisma.baseMaterial.findFirst({
    where: { Id: id, OrganizationId: organizationId, Type: "kit" },
    select: { Id: true },
  });
  if (!exists) throw new Error("Kit não encontrado.");
  const data: Prisma.BaseMaterialUpdateInput = {};
  if (patch.codigo !== undefined) data.ReferenceCode = patch.codigo;
  if (patch.nome !== undefined) data.Name = patch.nome;
  if (patch.categoria !== undefined) {
    data.Category = { connect: { Id: await resolveCategoryId(organizationId, patch.categoria) } };
  }
  await prisma.baseMaterial.update({ where: { Id: id }, data });
  if (patch.itens !== undefined) {
    // Recompõe os sub-itens (substitui a composição). Cascade limpa os KitItems
    // antigos e seus MaterialKitUsage por planta.
    await prisma.$transaction([
      prisma.materialKitItem.deleteMany({ where: { ParentMaterialId: id } }),
      prisma.materialKitItem.createMany({
        data: patch.itens.map((it, i) => ({
          ParentMaterialId: id,
          ChildMaterialId: it.materialId,
          Position: i,
          Unit: it.unidade || null, // "" nunca persiste — cai no fallback do material
        })),
      }),
    ]);
  }
  return loadKit(id);
}

export async function deleteKit(organizationId: string, id: number): Promise<void> {
  const exists = await prisma.baseMaterial.findFirst({
    where: { Id: id, OrganizationId: organizationId, Type: "kit" },
    select: { Id: true },
  });
  if (!exists) throw new Error("Kit não encontrado.");
  try {
    await prisma.baseMaterial.delete({ where: { Id: id } });
  } catch (e) {
    if (isFkRestrict(e)) throw new Error("Kit em uso; remova as opções que o utilizam.");
    throw e;
  }
}

// ─── Tipologias (Blueprint) ─────────────────────────────────────────────

export type TipologiaInput = Pick<Tipologia, "nome" | "metragem" | "descricao" | "unidades">;

export async function listTipologias(organizationId: string): Promise<Tipologia[]> {
  const enterpriseId = await activeEnterpriseIdOrNull(organizationId);
  if (enterpriseId == null) return [];
  const rows = await prisma.blueprint.findMany({
    where: { EnterpriseId: enterpriseId },
    include: BLUEPRINT_INCLUDE,
    orderBy: { Position: "asc" },
  });
  return rows.map(toTipologia);
}

export async function getTipologia(organizationId: string, id: number): Promise<Tipologia | null> {
  const row = await prisma.blueprint.findFirst({
    where: { Id: id, Enterprise: { OrganizationId: organizationId } },
    include: BLUEPRINT_INCLUDE,
  });
  return row ? toTipologia(row) : null;
}

export async function createTipologia(
  organizationId: string,
  input: TipologiaInput
): Promise<Tipologia> {
  const enterpriseId = await activeEnterpriseId(organizationId);
  const agg = await prisma.blueprint.aggregate({
    where: { EnterpriseId: enterpriseId },
    _max: { Position: true },
  });
  const row = await prisma.blueprint.create({
    data: {
      EnterpriseId: enterpriseId,
      Name: input.nome,
      Description: input.descricao,
      AreaSqM: input.metragem,
      UnitCount: input.unidades,
      Status: "incompleta",
      Position: await nextPosition(agg._max.Position),
    },
    include: BLUEPRINT_INCLUDE,
  });
  return toTipologia(row);
}

export async function updateTipologia(
  organizationId: string,
  id: number,
  patch: Partial<TipologiaInput & { status: TipologiaStatus }>
): Promise<Tipologia> {
  await assertBlueprint(organizationId, id);
  const data: Prisma.BlueprintUpdateInput = {};
  if (patch.nome !== undefined) data.Name = patch.nome;
  if (patch.descricao !== undefined) data.Description = patch.descricao;
  if (patch.metragem !== undefined) data.AreaSqM = patch.metragem;
  if (patch.unidades !== undefined) data.UnitCount = patch.unidades;
  if (patch.status !== undefined) data.Status = patch.status;
  const row = await prisma.blueprint.update({
    where: { Id: id },
    data,
    include: BLUEPRINT_INCLUDE,
  });
  return toTipologia(row);
}

export async function deleteTipologia(organizationId: string, id: number): Promise<void> {
  const enterpriseId = await assertBlueprint(organizationId, id);
  // Apaga a planta (cascade → BlueprintRoom/BRC/KitUsage). Depois remove Rooms
  // órfãos (que não aparecem em nenhuma outra planta) — cascade limpa seus
  // RoomComponents/Options.
  await prisma.blueprint.delete({ where: { Id: id } });
  await prisma.room.deleteMany({ where: { EnterpriseId: enterpriseId, BlueprintRooms: { none: {} } } });
}

/** Clona a planta inteira como cópia INDEPENDENTE (Rooms/componentes/opções novos). */
export async function duplicateTipologia(organizationId: string, id: number): Promise<Tipologia> {
  const src = await findBlueprintRow(organizationId, id);
  const agg = await prisma.blueprint.aggregate({
    where: { EnterpriseId: src.EnterpriseId },
    _max: { Position: true },
  });
  const copy = await prisma.blueprint.create({
    data: {
      EnterpriseId: src.EnterpriseId,
      Name: `${src.Name} (cópia)`,
      Description: src.Description,
      AreaSqM: src.AreaSqM,
      UnitCount: src.UnitCount,
      Status: src.Status,
      Position: await nextPosition(agg._max.Position),
    },
    select: { Id: true },
  });
  for (const br of [...src.BlueprintRooms].sort((a, b) => a.Position - b.Position)) {
    await cloneBlueprintRoomInto(copy.Id, src.EnterpriseId, br, br.Position);
  }
  return toTipologia(await findBlueprintRow(organizationId, copy.Id));
}

/**
 * Clona um BlueprintRoom (Room + componentes + opções + BRC/kitUsage) para uma
 * planta destino como cópia independente. Resolve a FK circular em 2 passos
 * (componente sem default → opções → seta DefaultMaterialId).
 */
async function cloneBlueprintRoomInto(
  targetBlueprintId: number,
  enterpriseId: number,
  br: BlueprintRoomRow,
  position: number
): Promise<void> {
  const room = await prisma.room.create({
    data: {
      EnterpriseId: enterpriseId,
      Name: br.Room.Name,
      Icon: br.Room.Icon,
    },
    select: { Id: true },
  });
  const newBr = await prisma.blueprintRoom.create({
    data: {
      BlueprintId: targetBlueprintId,
      RoomId: room.Id,
      Position: position,
      Polygon: br.Polygon ?? Prisma.JsonNull,
    },
    select: { Id: true },
  });
  const brcByRc = new Map(br.Components.map((c) => [c.RoomComponentId, c]));
  for (const rc of [...br.Room.RoomComponents].sort((a, b) => a.Position - b.Position)) {
    const newRc = await prisma.roomComponent.create({
      data: {
        RoomId: room.Id,
        Name: rc.Name,
        Unit: rc.Unit,
        IsGhost: rc.IsGhost,
        Position: rc.Position,
      },
      select: { Id: true },
    });
    let newDefaultId: number | null = null;
    const optIdMap = new Map<number, number>(); // KitItem lookup usa BaseMaterial; aqui mapeamos option→option
    for (const opt of [...rc.Options].sort((a, b) => a.Position - b.Position)) {
      const created = await prisma.material.create({
        data: {
          RoomComponentId: newRc.Id,
          RoomId: room.Id,
          EnterpriseId: enterpriseId,
          BaseMaterialId: opt.BaseMaterialId,
          Position: opt.Position,
          IsDefault: opt.IsDefault,
          PriceInCents: opt.PriceInCents,
          Name: opt.Name,
        },
        select: { Id: true },
      });
      optIdMap.set(opt.Id, created.Id);
      if (rc.DefaultMaterialId === opt.Id) newDefaultId = created.Id;
    }
    if (newDefaultId != null) {
      await prisma.roomComponent.update({ where: { Id: newRc.Id }, data: { DefaultMaterialId: newDefaultId } });
    }
    const srcBrc = brcByRc.get(rc.Id);
    if (srcBrc) {
      const newBrc = await prisma.blueprintRoomComponent.create({
        data: {
          BlueprintRoomId: newBr.Id,
          RoomComponentId: newRc.Id,
          UsageQuantity: srcBrc.UsageQuantity,
          TechnicalReservePct: srcBrc.TechnicalReservePct,
        },
        select: { Id: true },
      });
      if (srcBrc.KitUsages.length > 0) {
        await prisma.materialKitUsage.createMany({
          data: srcBrc.KitUsages.map((ku) => ({
            BlueprintRoomComponentId: newBrc.Id,
            KitItemId: ku.KitItemId,
            UsageQuantity: ku.UsageQuantity,
          })),
        });
      }
    }
  }
}

// ─── Ambientes (Room + BlueprintRoom) ───────────────────────────────────

export type AmbienteInput = Pick<Ambiente, "nome"> & Partial<Pick<Ambiente, "icon" | "local">>;

export async function createAmbiente(
  organizationId: string,
  tipologiaId: number,
  input: AmbienteInput
): Promise<Ambiente> {
  const enterpriseId = await assertBlueprint(organizationId, tipologiaId);
  const agg = await prisma.blueprintRoom.aggregate({
    where: { BlueprintId: tipologiaId },
    _max: { Position: true },
  });
  const room = await prisma.room.create({
    data: {
      EnterpriseId: enterpriseId,
      Name: input.nome,
      Icon: input.icon ?? null,
    },
    select: { Id: true },
  });
  const br = await prisma.blueprintRoom.create({
    data: {
      BlueprintId: tipologiaId,
      RoomId: room.Id,
      Position: await nextPosition(agg._max.Position),
      Polygon: json(input.local),
    },
    include: {
      Room: { include: ROOM_INCLUDE },
      Components: { include: { KitUsages: true } },
    },
  });
  return toAmbiente(br);
}

export async function updateAmbiente(
  organizationId: string,
  tipologiaId: number,
  blueprintRoomId: number,
  patch: Partial<AmbienteInput>
): Promise<Ambiente> {
  const ctx = await findBlueprintRoomCtx(organizationId, tipologiaId, blueprintRoomId);
  // nome/icon são do Room (compartilhado); local é por planta (BlueprintRoom).
  const roomData: Prisma.RoomUncheckedUpdateInput = {};
  if (patch.nome !== undefined) roomData.Name = patch.nome;
  if (patch.icon !== undefined) roomData.Icon = patch.icon ?? null;
  if (Object.keys(roomData).length > 0) {
    await prisma.room.update({ where: { Id: ctx.roomId }, data: roomData });
  }
  if (patch.local !== undefined) {
    await prisma.blueprintRoom.update({
      where: { Id: blueprintRoomId },
      data: { Polygon: json(patch.local) ?? Prisma.JsonNull },
    });
  }
  const br = await prisma.blueprintRoom.findUniqueOrThrow({
    where: { Id: blueprintRoomId },
    include: {
      Room: { include: ROOM_INCLUDE },
      Components: { include: { KitUsages: true } },
    },
  });
  return toAmbiente(br);
}

export async function deleteAmbiente(
  organizationId: string,
  tipologiaId: number,
  blueprintRoomId: number
): Promise<void> {
  const ctx = await findBlueprintRoomCtx(organizationId, tipologiaId, blueprintRoomId);
  await prisma.blueprintRoom.delete({ where: { Id: blueprintRoomId } });
  // Se o Room não aparece mais em nenhuma planta, remove-o (cascade limpa a paleta).
  const remaining = await prisma.blueprintRoom.count({ where: { RoomId: ctx.roomId } });
  if (remaining === 0) await prisma.room.delete({ where: { Id: ctx.roomId } });
}

/** Duplica o ambiente NESTA planta como cópia independente (Room novo). */
export async function cloneAmbiente(
  organizationId: string,
  tipologiaId: number,
  blueprintRoomId: number
): Promise<Ambiente> {
  await findBlueprintRoomCtx(organizationId, tipologiaId, blueprintRoomId);
  const src = await prisma.blueprintRoom.findUniqueOrThrow({
    where: { Id: blueprintRoomId },
    include: {
      Room: { include: ROOM_INCLUDE },
      Components: { include: { KitUsages: true } },
    },
  });
  const enterpriseId = src.Room.EnterpriseId;
  const agg = await prisma.blueprintRoom.aggregate({
    where: { BlueprintId: tipologiaId },
    _max: { Position: true },
  });
  // Renomeia o Room clonado ("(cópia)") preservando o resto da árvore.
  const clonedName = `${src.Room.Name} (cópia)`;
  const srcWithName: BlueprintRoomRow = { ...src, Room: { ...src.Room, Name: clonedName } };
  await cloneBlueprintRoomInto(tipologiaId, enterpriseId, srcWithName, await nextPosition(agg._max.Position));
  const created = await prisma.blueprintRoom.findFirst({
    where: { BlueprintId: tipologiaId, Room: { Name: clonedName } },
    orderBy: { Id: "desc" },
    include: {
      Room: { include: ROOM_INCLUDE },
      Components: { include: { KitUsages: true } },
    },
  });
  if (!created) throw new Error("Falha ao clonar ambiente.");
  return toAmbiente(created);
}

export async function reorderAmbientes(
  organizationId: string,
  tipologiaId: number,
  orderedIds: number[]
): Promise<void> {
  await assertBlueprint(organizationId, tipologiaId);
  const rooms = await prisma.blueprintRoom.findMany({
    where: { BlueprintId: tipologiaId },
    select: { Id: true },
  });
  const atuais = new Set(rooms.map((r) => r.Id));
  if (orderedIds.length !== atuais.size || orderedIds.some((id) => !atuais.has(id))) {
    throw new Error("Ordem de ambientes inválida.");
  }
  await prisma.$transaction(
    orderedIds.map((id, i) => prisma.blueprintRoom.update({ where: { Id: id }, data: { Position: i } }))
  );
}

// ─── Componentes (RoomComponent + BlueprintRoomComponent) ───────────────

export interface ComponenteInput {
  nome: string;
  unidade: Unidade;
  qtd: number;
  rt: number;
  ghost?: boolean;
  ordem?: number;
  /** BaseMaterial a semear como opção default (crédito). */
  padraoBaseId?: number | null;
}

export async function createComponente(
  organizationId: string,
  tipologiaId: number,
  blueprintRoomId: number,
  input: ComponenteInput
): Promise<Componente> {
  const ctx = await findBlueprintRoomCtx(organizationId, tipologiaId, blueprintRoomId);
  const agg = await prisma.roomComponent.aggregate({
    where: { RoomId: ctx.roomId },
    _max: { Position: true },
  });
  const rc = await prisma.roomComponent.create({
    data: {
      RoomId: ctx.roomId,
      Name: input.nome,
      Unit: input.unidade,
      IsGhost: input.ghost ?? false,
      Position: input.ordem ?? (await nextPosition(agg._max.Position)),
    },
    select: { Id: true },
  });
  // Opção default opcional (paleta compartilhada).
  if (input.padraoBaseId != null) {
    const opt = await prisma.material.create({
      data: {
        RoomComponentId: rc.Id,
        RoomId: ctx.roomId,
        EnterpriseId: ctx.enterpriseId,
        BaseMaterialId: input.padraoBaseId,
        Position: 0,
        IsDefault: true,
      },
      select: { Id: true },
    });
    await prisma.roomComponent.update({ where: { Id: rc.Id }, data: { DefaultMaterialId: opt.Id } });
  }
  // Instância por planta para cada aparição do Room (a paleta propaga; a qtd varia).
  const brs = await prisma.blueprintRoom.findMany({
    where: { RoomId: ctx.roomId },
    select: { Id: true },
  });
  await prisma.blueprintRoomComponent.createMany({
    data: brs.map((br) => ({
      BlueprintRoomId: br.Id,
      RoomComponentId: rc.Id,
      UsageQuantity: input.qtd,
      TechnicalReservePct: input.rt,
    })),
  });
  return reloadComponente(organizationId, blueprintRoomId, rc.Id);
}

export async function updateComponente(
  organizationId: string,
  tipologiaId: number,
  blueprintRoomId: number,
  componenteId: number,
  patch: Partial<Pick<ComponenteInput, "nome" | "unidade" | "qtd" | "rt" | "ghost" | "ordem">>
): Promise<Componente> {
  const ctx = await findBlueprintRoomCtx(organizationId, tipologiaId, blueprintRoomId);
  await assertComponentInRoom(componenteId, ctx.roomId);
  // Campos da paleta (RoomComponent, compartilhados) vs. por planta (BRC).
  const rcData: Prisma.RoomComponentUpdateInput = {};
  if (patch.nome !== undefined) rcData.Name = patch.nome;
  if (patch.unidade !== undefined) rcData.Unit = patch.unidade;
  if (patch.ghost !== undefined) rcData.IsGhost = patch.ghost;
  if (patch.ordem !== undefined) rcData.Position = patch.ordem;
  if (Object.keys(rcData).length > 0) {
    await prisma.roomComponent.update({ where: { Id: componenteId }, data: rcData });
  }
  if (patch.qtd !== undefined || patch.rt !== undefined) {
    await ensureBrc(ctx, componenteId);
    await prisma.blueprintRoomComponent.update({
      where: { BlueprintRoomId_RoomComponentId: { BlueprintRoomId: ctx.id, RoomComponentId: componenteId } },
      data: {
        ...(patch.qtd !== undefined ? { UsageQuantity: patch.qtd } : {}),
        ...(patch.rt !== undefined ? { TechnicalReservePct: patch.rt } : {}),
      },
    });
  }
  return reloadComponente(organizationId, blueprintRoomId, componenteId);
}

async function assertComponentInRoom(roomComponentId: number, roomId: number): Promise<void> {
  const rc = await prisma.roomComponent.findFirst({
    where: { Id: roomComponentId, RoomId: roomId },
    select: { Id: true },
  });
  if (!rc) throw new Error("Componente não encontrado.");
}

export async function deleteComponente(
  organizationId: string,
  tipologiaId: number,
  blueprintRoomId: number,
  componenteId: number
): Promise<void> {
  const ctx = await findBlueprintRoomCtx(organizationId, tipologiaId, blueprintRoomId);
  const res = await prisma.roomComponent.deleteMany({ where: { Id: componenteId, RoomId: ctx.roomId } });
  if (res.count === 0) throw new Error("Componente não encontrado.");
}

export async function reorderComponentes(
  organizationId: string,
  tipologiaId: number,
  blueprintRoomId: number,
  orderedIds: number[]
): Promise<void> {
  const ctx = await findBlueprintRoomCtx(organizationId, tipologiaId, blueprintRoomId);
  const comps = await prisma.roomComponent.findMany({
    where: { RoomId: ctx.roomId },
    select: { Id: true },
  });
  const atuais = new Set(comps.map((c) => c.Id));
  if (orderedIds.length !== atuais.size || orderedIds.some((id) => !atuais.has(id))) {
    throw new Error("Ordem de componentes inválida.");
  }
  await prisma.$transaction(
    orderedIds.map((id, i) => prisma.roomComponent.update({ where: { Id: id }, data: { Position: i } }))
  );
}

// ─── Operações de opção (setPadrao / add / replace / remove / kitQtds) ──

/** Opção (Material) de um BaseMaterial num componente — cria se faltar. */
async function ensureOption(ctx: RoomComponentCtx, baseMaterialId: number): Promise<number> {
  const opt = await prisma.material.upsert({
    where: { RoomComponentId_BaseMaterialId: { RoomComponentId: ctx.id, BaseMaterialId: baseMaterialId } },
    update: {},
    create: {
      RoomComponentId: ctx.id,
      RoomId: ctx.roomId,
      EnterpriseId: ctx.enterpriseId,
      BaseMaterialId: baseMaterialId,
      Position: await nextOptionPosition(ctx.id),
    },
    select: { Id: true },
  });
  return opt.Id;
}

async function nextOptionPosition(roomComponentId: number): Promise<number> {
  const agg = await prisma.material.aggregate({
    where: { RoomComponentId: roomComponentId },
    _max: { Position: true },
  });
  return (agg._max.Position ?? -1) + 1;
}

/** Define o material default (crédito). padraoBaseId = BaseMaterial escolhido; null limpa. */
export async function setPadrao(
  organizationId: string,
  tipologiaId: number,
  blueprintRoomId: number,
  componenteId: number,
  padraoBaseId: number | null
): Promise<Componente> {
  await findBlueprintRoomCtx(organizationId, tipologiaId, blueprintRoomId);
  const ctx = await findRoomComponentCtx(organizationId, componenteId);
  if (padraoBaseId == null) {
    await prisma.roomComponent.update({ where: { Id: ctx.id }, data: { DefaultMaterialId: null } });
    await prisma.material.updateMany({ where: { RoomComponentId: ctx.id }, data: { IsDefault: false } });
    return reloadComponente(organizationId, blueprintRoomId, componenteId);
  }
  const optId = await ensureOption(ctx, padraoBaseId);
  await prisma.$transaction([
    prisma.material.updateMany({ where: { RoomComponentId: ctx.id }, data: { IsDefault: false } }),
    prisma.material.update({ where: { Id: optId }, data: { IsDefault: true } }),
    prisma.roomComponent.update({ where: { Id: ctx.id }, data: { DefaultMaterialId: optId } }),
  ]);
  return reloadComponente(organizationId, blueprintRoomId, componenteId);
}

/** Adiciona uma opção (upgrade) referenciando um BaseMaterial do catálogo. */
export async function addUpgrade(
  organizationId: string,
  tipologiaId: number,
  blueprintRoomId: number,
  componenteId: number,
  upgradeBaseId: number
): Promise<Componente> {
  await findBlueprintRoomCtx(organizationId, tipologiaId, blueprintRoomId);
  const ctx = await findRoomComponentCtx(organizationId, componenteId);
  await ensureOption(ctx, upgradeBaseId);
  return reloadComponente(organizationId, blueprintRoomId, componenteId);
}

/** Troca o BaseMaterial de uma opção existente (oldOptionId → newBaseId), preservando a posição. */
export async function replaceUpgrade(
  organizationId: string,
  tipologiaId: number,
  blueprintRoomId: number,
  componenteId: number,
  oldOptionId: number,
  newBaseId: number
): Promise<Componente> {
  await findBlueprintRoomCtx(organizationId, tipologiaId, blueprintRoomId);
  const ctx = await findRoomComponentCtx(organizationId, componenteId);
  const old = await prisma.material.findFirst({
    where: { Id: oldOptionId, RoomComponentId: ctx.id },
    select: { Id: true, Position: true },
  });
  if (!old) throw new Error("Opção não encontrada.");
  const dup = await prisma.material.findUnique({
    where: { RoomComponentId_BaseMaterialId: { RoomComponentId: ctx.id, BaseMaterialId: newBaseId } },
    select: { Id: true },
  });
  if (dup && dup.Id !== oldOptionId) {
    // Novo BaseMaterial já é opção: remove a antiga (o default segue via FK SetNull).
    await prisma.material.delete({ where: { Id: oldOptionId } });
  } else {
    await prisma.material.update({ where: { Id: oldOptionId }, data: { BaseMaterialId: newBaseId } });
  }
  return reloadComponente(organizationId, blueprintRoomId, componenteId);
}

/** Remove uma opção (por id de linha Material). Se era default, a FK SetNull limpa. */
export async function removeUpgrade(
  organizationId: string,
  tipologiaId: number,
  blueprintRoomId: number,
  componenteId: number,
  optionId: number
): Promise<Componente> {
  await findBlueprintRoomCtx(organizationId, tipologiaId, blueprintRoomId);
  const ctx = await findRoomComponentCtx(organizationId, componenteId);
  const res = await prisma.material.deleteMany({ where: { Id: optionId, RoomComponentId: ctx.id } });
  if (res.count === 0) throw new Error("Opção não encontrada.");
  return reloadComponente(organizationId, blueprintRoomId, componenteId);
}

/** Grava os quantitativos de sub-itens de kit desta planta (keyed por KitItem id). */
export async function setKitQtds(
  organizationId: string,
  tipologiaId: number,
  blueprintRoomId: number,
  componenteId: number,
  qtds: Record<number, number>
): Promise<Componente> {
  const ctx = await findBlueprintRoomCtx(organizationId, tipologiaId, blueprintRoomId);
  await assertComponentInRoom(componenteId, ctx.roomId);
  const brcId = await ensureBrc(ctx, componenteId);
  const entries = Object.entries(qtds);
  if (entries.length > 0) {
    await prisma.$transaction(
      entries.map(([kitItemId, q]) =>
        prisma.materialKitUsage.upsert({
          where: {
            BlueprintRoomComponentId_KitItemId: {
              BlueprintRoomComponentId: brcId,
              KitItemId: Number(kitItemId),
            },
          },
          update: { UsageQuantity: q },
          create: { BlueprintRoomComponentId: brcId, KitItemId: Number(kitItemId), UsageQuantity: q },
        })
      )
    );
  }
  return reloadComponente(organizationId, blueprintRoomId, componenteId);
}

// ─── Compartilhamento de ambientes (derivado de BlueprintRoom) ──────────

export interface SharedInfo {
  /** shareId (String(roomId)) → tipologias participantes (String(blueprintId)). */
  sharedReg: Record<string, { tips: string[] }>;
  /** String(roomId) → shareId (String(roomId)) para rooms em ≥2 plantas. */
  ambShared: Record<string, string>;
}

export async function getSharedInfo(organizationId: string): Promise<SharedInfo> {
  const enterpriseId = await activeEnterpriseIdOrNull(organizationId);
  const sharedReg: Record<string, { tips: string[] }> = {};
  const ambShared: Record<string, string> = {};
  if (enterpriseId == null) return { sharedReg, ambShared };
  const rooms = await prisma.room.findMany({
    where: { EnterpriseId: enterpriseId },
    select: { Id: true, BlueprintRooms: { select: { BlueprintId: true } } },
  });
  for (const room of rooms) {
    if (room.BlueprintRooms.length < 2) continue; // "compartilhado" = aparece em ≥2 plantas
    const shareId = String(room.Id);
    sharedReg[shareId] = { tips: room.BlueprintRooms.map((br) => String(br.BlueprintId)) };
    ambShared[shareId] = shareId;
  }
  return { sharedReg, ambShared };
}

/**
 * Compartilha um ambiente de outra planta na planta alvo: insere um BlueprintRoom
 * apontando para o MESMO Room (sem clonar) e cria os BRC copiando qtd/RT/kitUsage
 * da aparição de origem. A paleta passa a propagar entre as plantas por construção.
 */
export async function linkAmbiente(
  organizationId: string,
  targetTipologiaId: number,
  srcBlueprintRoomId: number
): Promise<Ambiente> {
  await assertBlueprint(organizationId, targetTipologiaId);
  const src = await prisma.blueprintRoom.findFirst({
    where: { Id: srcBlueprintRoomId, Blueprint: { Enterprise: { OrganizationId: organizationId } } },
    include: {
      Room: { select: { Id: true, RoomComponents: { select: { Id: true } } } },
      Components: { include: { KitUsages: true } },
    },
  });
  if (!src) throw new Error("Ambiente de origem não encontrado.");
  const existing = await prisma.blueprintRoom.findUnique({
    where: { BlueprintId_RoomId: { BlueprintId: targetTipologiaId, RoomId: src.Room.Id } },
    select: { Id: true },
  });
  if (existing) throw new Error("Ambiente já compartilhado nesta tipologia.");

  const agg = await prisma.blueprintRoom.aggregate({
    where: { BlueprintId: targetTipologiaId },
    _max: { Position: true },
  });
  const newBr = await prisma.blueprintRoom.create({
    data: {
      BlueprintId: targetTipologiaId,
      RoomId: src.Room.Id,
      Position: await nextPosition(agg._max.Position),
      Polygon: src.Polygon ?? Prisma.JsonNull,
    },
    select: { Id: true },
  });
  // Um BRC por componente do Room, copiando qtd/RT (e kitUsage) da origem.
  const srcBrcByRc = new Map(src.Components.map((c) => [c.RoomComponentId, c]));
  for (const rc of src.Room.RoomComponents) {
    const srcBrc = srcBrcByRc.get(rc.Id);
    const newBrc = await prisma.blueprintRoomComponent.create({
      data: {
        BlueprintRoomId: newBr.Id,
        RoomComponentId: rc.Id,
        UsageQuantity: srcBrc?.UsageQuantity ?? 0,
        TechnicalReservePct: srcBrc?.TechnicalReservePct ?? 0,
      },
      select: { Id: true },
    });
    if (srcBrc && srcBrc.KitUsages.length > 0) {
      await prisma.materialKitUsage.createMany({
        data: srcBrc.KitUsages.map((ku) => ({
          BlueprintRoomComponentId: newBrc.Id,
          KitItemId: ku.KitItemId,
          UsageQuantity: ku.UsageQuantity,
        })),
      });
    }
  }
  const created = await prisma.blueprintRoom.findUniqueOrThrow({
    where: { Id: newBr.Id },
    include: {
      Room: { include: ROOM_INCLUDE },
      Components: { include: { KitUsages: true } },
    },
  });
  return toAmbiente(created);
}

// ─── Unit groups / Torres (Enterprise) ──────────────────────────────────

export type UnitGroupInput = Omit<UnitGroup, "id">;

async function resolveTowerId(enterpriseId: number, name: string): Promise<number | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const existing = await prisma.tower.findFirst({
    where: { EnterpriseId: enterpriseId, Name: trimmed },
    select: { Id: true },
  });
  if (existing) return existing.Id;
  const agg = await prisma.tower.aggregate({ where: { EnterpriseId: enterpriseId }, _max: { Position: true } });
  const created = await prisma.tower.create({
    data: { EnterpriseId: enterpriseId, Name: trimmed, Position: await nextPosition(agg._max.Position) },
    select: { Id: true },
  });
  return created.Id;
}

type UnitGroupRow = Prisma.UnitGroupGetPayload<{ include: { Tower: true } }>;
function toUnitGroup(row: UnitGroupRow): UnitGroup {
  return { id: row.Id, nome: row.Name, torre: row.Tower?.Name ?? "", unidades: row.UnitNumbers };
}

export async function listUnitGroups(organizationId: string): Promise<UnitGroup[]> {
  const enterpriseId = await activeEnterpriseIdOrNull(organizationId);
  if (enterpriseId == null) return [];
  const rows = await prisma.unitGroup.findMany({
    where: { EnterpriseId: enterpriseId },
    include: { Tower: true },
    orderBy: { Id: "asc" },
  });
  return rows.map(toUnitGroup);
}

export async function createUnitGroup(
  organizationId: string,
  input: UnitGroupInput
): Promise<UnitGroup> {
  const enterpriseId = await activeEnterpriseId(organizationId);
  const towerId = await resolveTowerId(enterpriseId, input.torre);
  const row = await prisma.unitGroup.create({
    data: { EnterpriseId: enterpriseId, Name: input.nome, TowerId: towerId, UnitNumbers: input.unidades },
    include: { Tower: true },
  });
  return toUnitGroup(row);
}

export async function updateUnitGroup(
  organizationId: string,
  id: number,
  patch: Partial<UnitGroupInput>
): Promise<UnitGroup> {
  const exists = await prisma.unitGroup.findFirst({
    where: { Id: id, Enterprise: { OrganizationId: organizationId } },
    select: { Id: true, EnterpriseId: true },
  });
  if (!exists) throw new Error("Grupo de unidades não encontrado.");
  const data: Prisma.UnitGroupUpdateInput = {};
  if (patch.nome !== undefined) data.Name = patch.nome;
  if (patch.unidades !== undefined) data.UnitNumbers = patch.unidades;
  if (patch.torre !== undefined) {
    const towerId = await resolveTowerId(exists.EnterpriseId, patch.torre);
    data.Tower = towerId == null ? { disconnect: true } : { connect: { Id: towerId } };
  }
  const row = await prisma.unitGroup.update({ where: { Id: id }, data, include: { Tower: true } });
  return toUnitGroup(row);
}

export async function deleteUnitGroup(organizationId: string, id: number): Promise<void> {
  const res = await prisma.unitGroup.deleteMany({
    where: { Id: id, Enterprise: { OrganizationId: organizationId } },
  });
  if (res.count === 0) throw new Error("Grupo de unidades não encontrado.");
}

export async function listTorres(organizationId: string): Promise<Torre[]> {
  const enterpriseId = await activeEnterpriseIdOrNull(organizationId);
  if (enterpriseId == null) return [];
  const rows = await prisma.tower.findMany({
    where: { EnterpriseId: enterpriseId },
    orderBy: { Position: "asc" },
  });
  return rows.map((r) => ({ id: r.Id, nome: r.Name }));
}

export type TorreInput = { id: number | null; nome: string };

/** Rótulo de exibição do dashboard, derivado da lista de torres. */
function towerLabel(nomes: string[]): string | null {
  if (nomes.length === 0) return null;
  if (nomes.length === 1) return nomes[0]!;
  return `${nomes.length} torres`;
}

/**
 * Reconcilia a lista COMPLETA de torres do empreendimento âncora — por id, não
 * delete-all+recreate: UnitGroup.TowerId (SetNull) perderia o vínculo dos
 * grupos a cada salvamento. Grupos de torres removidas caem em "Sem torre
 * definida" (comportamento do FK).
 */
export async function updateTorres(
  organizationId: string,
  items: TorreInput[]
): Promise<Torre[]> {
  const enterpriseId = await activeEnterpriseId(organizationId);

  const normalized = items
    .map((t) => ({ id: t.id, nome: t.nome.trim() }))
    .filter((t) => t.nome !== "");
  const seen = new Set<string>();
  for (const t of normalized) {
    const key = t.nome.toLowerCase();
    if (seen.has(key)) throw new Error("Nomes de torre duplicados.");
    seen.add(key);
  }

  const current = await prisma.tower.findMany({
    where: { EnterpriseId: enterpriseId },
    select: { Id: true },
  });
  const currentIds = new Set(current.map((t) => t.Id));
  for (const t of normalized) {
    if (t.id != null && !currentIds.has(t.id)) throw new Error("Torre não encontrada.");
  }

  const keptIds = new Set(normalized.flatMap((t) => (t.id != null ? [t.id] : [])));
  const removedIds = [...currentIds].filter((id) => !keptIds.has(id));

  await prisma.$transaction([
    ...(removedIds.length > 0
      ? [prisma.tower.deleteMany({ where: { Id: { in: removedIds } } })]
      : []),
    ...normalized.flatMap((t, i) =>
      t.id != null
        ? [prisma.tower.update({ where: { Id: t.id }, data: { Name: t.nome, Position: i } })]
        : [
            prisma.tower.create({
              data: { EnterpriseId: enterpriseId, Name: t.nome, Position: i },
            }),
          ]
    ),
    prisma.enterprise.update({
      where: { Id: enterpriseId },
      data: { TowerLabel: towerLabel(normalized.map((t) => t.nome)) },
    }),
  ]);

  return listTorres(organizationId);
}

// ─── Versions (BudgetVersion) ───────────────────────────────────────────

export interface VersionInput {
  summary: string;
  createdBy: string;
  changes: VersionChanges;
}

function toVersion(row: Prisma.BudgetVersionGetPayload<object>): BudgetVersion {
  return {
    id: row.Id,
    label: row.Label,
    createdAt: row.CreatedAtLabel,
    createdBy: row.CreatedBy,
    isCurrent: row.IsCurrent,
    summary: row.Summary,
    changes: row.Changes as unknown as VersionChanges,
  };
}

export async function listVersions(organizationId: string): Promise<BudgetVersion[]> {
  const enterpriseId = await activeEnterpriseIdOrNull(organizationId);
  if (enterpriseId == null) return [];
  const rows = await prisma.budgetVersion.findMany({
    where: { EnterpriseId: enterpriseId },
    orderBy: { Position: "asc" },
  });
  return rows.map(toVersion);
}

export async function createVersion(
  organizationId: string,
  input: VersionInput
): Promise<BudgetVersion> {
  const enterpriseId = await activeEnterpriseId(organizationId);
  const count = await prisma.budgetVersion.count({ where: { EnterpriseId: enterpriseId } });
  const agg = await prisma.budgetVersion.aggregate({
    where: { EnterpriseId: enterpriseId },
    _min: { Position: true },
  });
  const [, row] = await prisma.$transaction([
    prisma.budgetVersion.updateMany({ where: { EnterpriseId: enterpriseId }, data: { IsCurrent: false } }),
    prisma.budgetVersion.create({
      data: {
        EnterpriseId: enterpriseId,
        Label: `v${count + 1}`,
        CreatedAtLabel: nowBR().replace(" ", " às "),
        CreatedBy: input.createdBy,
        IsCurrent: true,
        Summary: input.summary,
        Changes: json(input.changes) ?? {},
        Position: (agg._min.Position ?? 1) - 1, // nova versão vem primeiro na lista
      },
    }),
  ]);
  return toVersion(row);
}

export async function restoreVersion(
  organizationId: string,
  id: number
): Promise<BudgetVersion> {
  const exists = await prisma.budgetVersion.findFirst({
    where: { Id: id, Enterprise: { OrganizationId: organizationId } },
    select: { Id: true, EnterpriseId: true },
  });
  if (!exists) throw new Error("Versão não encontrada.");
  const [, row] = await prisma.$transaction([
    prisma.budgetVersion.updateMany({ where: { EnterpriseId: exists.EnterpriseId }, data: { IsCurrent: false } }),
    prisma.budgetVersion.update({ where: { Id: id }, data: { IsCurrent: true } }),
  ]);
  return toVersion(row);
}

// ─── Comments (rowKey = String(optionId) → Comment.MaterialId) ──────────

export interface CommentInput {
  autor: Comment["autor"];
  autorNome?: string;
  texto: string;
}

function parseRowKey(rowKey: string): number {
  const id = Number(rowKey);
  if (!Number.isFinite(id)) throw new Error("Comentário inválido.");
  return id;
}

function toComment(row: {
  Author: Comment["autor"];
  AuthorName: string | null;
  Text: string;
  DateLabel: string;
}): Comment {
  return {
    autor: row.Author,
    autorNome: row.AuthorName ?? undefined,
    texto: row.Text,
    data: row.DateLabel,
  };
}

export async function getComments(organizationId: string, rowKey: string): Promise<Comment[]> {
  const materialId = parseRowKey(rowKey);
  const rows = await prisma.comment.findMany({
    where: { MaterialId: materialId, Enterprise: { OrganizationId: organizationId } },
    orderBy: { CreatedAt: "asc" },
  });
  return rows.map(toComment);
}

/** Todas as threads (contadores por linha) — keyed por String(MaterialId). */
export async function listCommentThreads(
  organizationId: string
): Promise<Record<string, Comment[]>> {
  const enterpriseId = await activeEnterpriseIdOrNull(organizationId);
  const threads: Record<string, Comment[]> = {};
  if (enterpriseId == null) return threads;
  const rows = await prisma.comment.findMany({
    where: { EnterpriseId: enterpriseId },
    orderBy: { CreatedAt: "asc" },
  });
  for (const r of rows) {
    const key = String(r.MaterialId);
    (threads[key] ??= []).push(toComment(r));
  }
  return threads;
}

export async function appendComment(
  organizationId: string,
  rowKey: string,
  input: CommentInput
): Promise<Comment> {
  const materialId = parseRowKey(rowKey);
  const mat = await prisma.material.findFirst({
    where: { Id: materialId, Enterprise: { OrganizationId: organizationId } },
    select: { EnterpriseId: true },
  });
  if (!mat) throw new Error("Opção não encontrada.");
  const row = await prisma.comment.create({
    data: {
      MaterialId: materialId,
      EnterpriseId: mat.EnterpriseId,
      Author: input.autor,
      AuthorName: input.autorNome ?? null,
      Text: input.texto,
      DateLabel: nowBR(),
    },
  });
  return toComment(row);
}

// ─── Links de preenchimento + portal do terceiro ──────────────────────

export type FillLinkInput = Pick<FillLink, "tipologiaIds" | "campos" | "prazo" | "senha">;

function toFillLink(row: Prisma.FillLinkGetPayload<object>): FillLink {
  return {
    id: row.Id,
    token: row.Token,
    tipologiaIds: row.BlueprintIds,
    campos: row.Fields as unknown as FillLinkCampos,
    prazo: row.DeadlineLabel,
    senha: row.Password,
    criadoEm: row.CreatedAtLabel,
  };
}

export async function createFillLink(
  organizationId: string,
  input: FillLinkInput
): Promise<FillLink> {
  const enterpriseId = await activeEnterpriseId(organizationId);
  const row = await prisma.fillLink.create({
    data: {
      EnterpriseId: enterpriseId,
      // Token = único controle de acesso das rotas PÚBLICAS do portal: CSPRNG
      // (UUID v4, 122 bits), nunca Math.random.
      Token: randomUUID(),
      BlueprintIds: input.tipologiaIds,
      Fields: json(input.campos) ?? {},
      DeadlineLabel: input.prazo,
      Password: input.senha,
      CreatedAtLabel: nowBR(),
    },
  });
  return toFillLink(row);
}

/** Resolução do token do portal — PÚBLICA (retorna também a org do link). */
export async function getFillLinkByToken(
  token: string
): Promise<{ link: FillLink; organizationId: string } | null> {
  const row = await prisma.fillLink.findUnique({
    where: { Token: token },
    include: { Enterprise: { select: { OrganizationId: true } } },
  });
  return row ? { link: toFillLink(row), organizationId: row.Enterprise.OrganizationId } : null;
}

export async function getPortalFills(
  organizationId: string
): Promise<Record<string, PortalFill>> {
  const enterpriseId = await activeEnterpriseIdOrNull(organizationId);
  const fills: Record<string, PortalFill> = {};
  if (enterpriseId == null) return fills;
  const rows = await prisma.portalFill.findMany({ where: { EnterpriseId: enterpriseId } });
  for (const r of rows) fills[String(r.BaseMaterialId)] = { mat: r.Mat, mo: r.Mo, comment: r.Comment };
  return fills;
}

/**
 * BaseMaterials preenchíveis pelas plantas do link — o escopo do que o portal do
 * terceiro pode LER e PREENCHER. Inclui o material das opções (single) e, para
 * opções kit, cada sub-item (o custo vive no sub-material do catálogo).
 */
export async function getPortalMaterialIds(
  organizationId: string,
  tipologiaIds: number[]
): Promise<Set<number>> {
  const blueprints = await prisma.blueprint.findMany({
    where: { Id: { in: tipologiaIds }, Enterprise: { OrganizationId: organizationId } },
    select: {
      BlueprintRooms: {
        select: {
          Room: {
            select: {
              RoomComponents: {
                select: {
                  Options: {
                    select: {
                      BaseMaterialId: true,
                      BaseMaterial: {
                        select: { Type: true, KitItems: { select: { ChildMaterialId: true } } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  const ids = new Set<number>();
  for (const bp of blueprints) {
    for (const br of bp.BlueprintRooms) {
      for (const rc of br.Room.RoomComponents) {
        for (const opt of rc.Options) {
          if (opt.BaseMaterial.Type === "kit") {
            for (const ki of opt.BaseMaterial.KitItems) ids.add(ki.ChildMaterialId);
          } else {
            ids.add(opt.BaseMaterialId);
          }
        }
      }
    }
  }
  return ids;
}

/**
 * Espelha os comentários deixados pela construtora no portal como comentários
 * `construtora` nas threads das opções (Material) que usam cada material base.
 * Assinado com o nome informado no portal. Idempotente: não recria um comentário
 * de mesmo texto já presente na thread (o link é reeditável).
 */
async function syncConstrutoraComments(
  organizationId: string,
  enterpriseId: number,
  scoped: [string, PortalFill][],
  authorName?: string
): Promise<void> {
  const withComments = scoped.filter(([, f]) => (f.comment ?? "").trim() !== "");
  if (withComments.length === 0) return;

  const baseIds = withComments.map(([baseId]) => Number(baseId));
  const options = await prisma.material.findMany({
    where: { BaseMaterialId: { in: baseIds }, EnterpriseId: enterpriseId, Enterprise: { OrganizationId: organizationId } },
    select: { Id: true, BaseMaterialId: true },
  });
  const optionsByBase = new Map<number, number[]>();
  for (const o of options) {
    const arr = optionsByBase.get(o.BaseMaterialId) ?? [];
    arr.push(o.Id);
    optionsByBase.set(o.BaseMaterialId, arr);
  }

  const nome = (authorName ?? "").trim();
  const rows: Prisma.CommentCreateManyInput[] = [];
  for (const [baseIdStr, f] of withComments) {
    const text = f.comment.trim();
    for (const optId of optionsByBase.get(Number(baseIdStr)) ?? []) {
      rows.push({
        MaterialId: optId,
        EnterpriseId: enterpriseId,
        Author: "construtora",
        AuthorName: nome || null,
        Text: text,
        DateLabel: nowBR(),
      });
    }
  }
  if (rows.length === 0) return;

  // Dedup contra comentários da construtora já gravados (mesma opção + texto).
  const existing = await prisma.comment.findMany({
    where: { EnterpriseId: enterpriseId, Author: "construtora", MaterialId: { in: rows.map((r) => r.MaterialId) } },
    select: { MaterialId: true, Text: true },
  });
  const seen = new Set(existing.map((e) => `${e.MaterialId}::${e.Text}`));
  const toCreate = rows.filter((r) => !seen.has(`${r.MaterialId}::${r.Text}`));
  if (toCreate.length > 0) await prisma.comment.createMany({ data: toCreate });
}

/**
 * "Enviar preenchimento" do portal: grava os fills, aplica os custos ao catálogo
 * (BaseMaterial) e move o empreendimento ativo para "em_revisao". A pendência
 * some por construção (custo deixa de ser NULL). Retorna quantos foram aplicados.
 */
export async function submitPortalFills(
  organizationId: string,
  fills: Record<string, PortalFill>,
  allowedBaseMaterialIds: Set<number>,
  authorName?: string
): Promise<number> {
  const enterpriseId = await activeEnterpriseId(organizationId);

  // Escopo do link: descarta fills fora das plantas liberadas.
  const scoped = Object.entries(fills).filter(([baseId]) => allowedBaseMaterialIds.has(Number(baseId)));

  await prisma.$transaction([
    prisma.portalFill.deleteMany({ where: { EnterpriseId: enterpriseId } }),
    prisma.portalFill.createMany({
      data: scoped.map(([baseId, f]) => ({
        EnterpriseId: enterpriseId,
        BaseMaterialId: Number(baseId),
        Mat: f.mat,
        Mo: f.mo,
        Comment: f.comment,
      })),
    }),
  ]);

  // Comentários da construtora → threads das opções que usam o material base.
  // (o portal coleta por BaseMaterialId; a thread é por opção/Material.Id).
  await syncConstrutoraComments(organizationId, enterpriseId, scoped, authorName);

  // Aplica os custos preenchidos (> 0) ao catálogo, em paralelo.
  const paraAplicar = scoped.filter(([, f]) => parseFloat(f.mat) > 0);
  const resultados = await Promise.all(
    paraAplicar.map(async ([baseId, fill]) => {
      const res = await prisma.baseMaterial.updateMany({
        where: { Id: Number(baseId), OrganizationId: organizationId },
        data: {
          CostMaterialInCents: toCentsOrNull(parseFloat(fill.mat)),
          CostLaborInCents: toCentsOrNull(parseFloat(fill.mo) > 0 ? parseFloat(fill.mo) : 0),
        },
      });
      return res.count > 0;
    })
  );
  const applied = resultados.filter(Boolean).length;

  if (applied > 0) {
    await prisma.enterprise.update({ where: { Id: enterpriseId }, data: { Status: "em_revisao" } });
  }
  return applied;
}
