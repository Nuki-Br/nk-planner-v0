// Camada de dados do cliente (Fase 3/4 — realinhada) — as MESMAS assinaturas do
// store de servidor, agora chamando as rotas /api/* via httpGet/httpSend. Ids de
// domínio em `number`; a organização vem da sessão no servidor (o cliente nunca
// envia org). Pendência não é mais uma tabela — deriva do custo (custo 0).
import type { ProjectPayload } from "@/lib/api/handler";
import { httpGet, httpSend } from "@/lib/api/http";
import type { ComposicaoOp, CostItemLineInput, CostItemPatch } from "@/shared/types/costItems";
import type {
  Ambiente,
  BudgetColumn,
  BudgetVersion,
  CategoriaCatalogo,
  Comment,
  Componente,
  CostItemRow,
  CustoBase,
  CustoBaseRow,
  FillLink,
  Kit,
  Material,
  MaterialPricing,
  MetragemInput,
  PricingDiff,
  Project,
  Tipologia,
  TipologiaStatus,
  Torre,
  Unidade,
  UnitGroup,
  VersionChanges,
} from "@/shared/types/domain";

// ─── Projects ─────────────────────────────────────────────────────────

// `torre` (TowerLabel) não é editável via patch — o rótulo é derivado da
// lista de torres em updateTorres (escritor único).
export type ProjectPatch = Partial<
  Pick<
    Project,
    | "nome"
    | "status"
    | "enviadoEm"
    | "prazo"
    | "totalItens"
    | "itensPreenchidos"
    | "usaDebitoCredito"
  >
>;

export async function listProjects(): Promise<Project[]> {
  return httpGet<Project[]>("/api/projects");
}

export async function getProject(id: number): Promise<Project | null> {
  return httpGet<Project | null>(`/api/projects/${id}`);
}

export interface ProjectInput {
  nome: string;
  /** Nomes das torres, na ordem — criadas na mesma transação do empreendimento. */
  torres: string[];
  /** Ausente = usa débito/crédito (padrão). */
  usaDebitoCredito?: boolean;
}

export async function createProject(input: ProjectInput): Promise<Project> {
  return httpSend<Project, ProjectInput>("/api/projects", "POST", input);
}

export async function updateProject(id: number, patch: ProjectPatch): Promise<Project> {
  return httpSend<Project, ProjectPatch>(`/api/projects/${id}`, "PATCH", patch);
}

/** Marca o planejamento como concluído (status "publicado") — não bloqueia edição. */
export async function publishProject(id: number): Promise<Project> {
  return httpSend<Project>(`/api/projects/${id}/publish`, "POST");
}

export async function getBudgetColumns(projectId: number): Promise<BudgetColumn[]> {
  return httpGet<BudgetColumn[]>(`/api/projects/${projectId}/columns`);
}

export async function updateBudgetColumns(
  projectId: number,
  cols: BudgetColumn[]
): Promise<BudgetColumn[]> {
  return httpSend<BudgetColumn[], BudgetColumn[]>(
    `/api/projects/${projectId}/columns`,
    "PUT",
    cols
  );
}

// ─── Custo base por empreendimento (EnterpriseMaterialCost) ────────────

/** Lista todo material que precisa de custo neste empreendimento. */
export async function listCustosBase(projectId: number): Promise<CustoBaseRow[]> {
  return httpGet<CustoBaseRow[]>(`/api/projects/${projectId}/custos-base`);
}

export interface CustoBaseInput {
  baseId: number;
  /**
   * Omitido = não mexe no campo (a grade grava um campo por vez). `null` volta
   * a pendente; `0` marca "sem custo" (ver CustoBase.custoMat).
   */
  custoMat?: number | null;
  custoMO?: number;
}

/** O PATCH devolve só o que gravou — a composição (catálogo) não muda por aqui. */
export type CustoBaseCore = Pick<CustoBase, "baseId" | "custoMat" | "custoMO">;

export async function saveCustoBase(
  projectId: number,
  input: CustoBaseInput
): Promise<CustoBaseCore> {
  return httpSend<CustoBaseCore, CustoBaseInput>(
    `/api/projects/${projectId}/custos-base`,
    "PATCH",
    input
  );
}

// ─── Itens de custo (CostItem) + composição ─────────────────────────────

/** Insumos da org com o preço deste empreendimento e onde são usados. */
export async function listCostItems(projectId: number): Promise<CostItemRow[]> {
  return httpGet<CostItemRow[]>(`/api/projects/${projectId}/itens-de-custo`);
}

/** Cria/atualiza vários insumos de uma vez (grade "Adicionar itens"). */
export async function createCostItems(
  projectId: number,
  lines: CostItemLineInput[]
): Promise<CostItemRow[]> {
  return httpSend<CostItemRow[], { lines: CostItemLineInput[] }>(
    `/api/projects/${projectId}/itens-de-custo`,
    "POST",
    { lines }
  );
}

/** Identidade (org) e/ou preço (empreendimento) de um insumo — um campo por blur. */
export async function updateCostItem(
  projectId: number,
  itemId: number,
  patch: CostItemPatch
): Promise<CostItemRow> {
  return httpSend<CostItemRow, CostItemPatch>(
    `/api/projects/${projectId}/itens-de-custo/${itemId}`,
    "PATCH",
    patch
  );
}

/** Apaga o insumo da org — some de toda composição que o usa (a UI confirma antes). */
export async function deleteCostItem(projectId: number, itemId: number): Promise<null> {
  return httpSend<null>(`/api/projects/${projectId}/itens-de-custo/${itemId}`, "DELETE");
}

/** Operação sobre a composição de UM material do catálogo (ver ComposicaoOp). */
export async function composicaoOp(
  projectId: number,
  baseId: number,
  body: ComposicaoOp
): Promise<null> {
  return httpSend<null, ComposicaoOp>(
    `/api/projects/${projectId}/custos-base/${baseId}/composicao`,
    "POST",
    body
  );
}

// ─── Precificação (rascunho + publicação) ──────────────────────────────

/** optionId (Material id) → rascunho de precificação. */
export type PricingMap = Record<number, MaterialPricing>;

export async function listPricing(projectId: number): Promise<PricingMap> {
  return httpGet<PricingMap>(`/api/projects/${projectId}/precificacao`);
}

/** `null` limpa o override (volta a herdar); campo omitido não é tocado. */
export interface PricingInput {
  optionId: number;
  valorUnitario?: number | null;
  qtd?: number | null;
  rt?: number | null;
  unidade?: Unidade | null;
  colunas?: Record<string, string>;
}

export async function savePricing(
  projectId: number,
  input: PricingInput
): Promise<MaterialPricing> {
  return httpSend<MaterialPricing, PricingInput>(
    `/api/projects/${projectId}/precificacao`,
    "PATCH",
    input
  );
}

/** O que mudou desde a última publicação (badge + modal de publicar). */
export async function getPricingDiff(projectId: number): Promise<PricingDiff> {
  return httpGet<PricingDiff>(`/api/projects/${projectId}/precificacao/diff`);
}

export interface PublishBudgetInput {
  summary: string;
  createdBy: string;
}

/** Congela o rascunho no Material e cria a versão. */
export async function publishBudget(
  projectId: number,
  input: PublishBudgetInput
): Promise<BudgetVersion> {
  return httpSend<BudgetVersion, PublishBudgetInput>(
    `/api/projects/${projectId}/precificacao/publicar`,
    "POST",
    input
  );
}

// ─── Materiais (BaseMaterial single) ────────────────────────────────────

export type MaterialInput = Omit<Material, "id">;

export async function listMateriais(): Promise<Material[]> {
  return httpGet<Material[]>("/api/materiais");
}

export async function createMaterial(input: MaterialInput): Promise<Material> {
  return httpSend<Material, MaterialInput>("/api/materiais", "POST", input);
}

/** Criação em lote (importação CSV) — um único POST com array. */
export async function createMateriais(inputs: MaterialInput[]): Promise<Material[]> {
  return httpSend<Material[], MaterialInput[]>("/api/materiais", "POST", inputs);
}

export async function updateMaterial(
  id: number,
  patch: Partial<MaterialInput>
): Promise<Material> {
  return httpSend<Material, Partial<MaterialInput>>(`/api/materiais/${id}`, "PATCH", patch);
}

export async function deleteMaterial(id: number): Promise<void> {
  await httpSend<null>(`/api/materiais/${id}`, "DELETE");
}

// ─── Kits (BaseMaterial kit) ────────────────────────────────────────────

export type KitInput = Omit<Kit, "id">;

export async function listKits(): Promise<Kit[]> {
  return httpGet<Kit[]>("/api/kits");
}

export async function createKit(input: KitInput): Promise<Kit> {
  return httpSend<Kit, KitInput>("/api/kits", "POST", input);
}

export async function updateKit(id: number, patch: Partial<KitInput>): Promise<Kit> {
  return httpSend<Kit, Partial<KitInput>>(`/api/kits/${id}`, "PATCH", patch);
}

export async function deleteKit(id: number): Promise<void> {
  await httpSend<null>(`/api/kits/${id}`, "DELETE");
}

// ─── Categorias de catálogo (MaterialCategory) ──────────────────────────

export type CategoriaInput = { nome: string; cor: string };

export async function listCategorias(): Promise<CategoriaCatalogo[]> {
  return httpGet<CategoriaCatalogo[]>("/api/categorias");
}

export async function createCategoria(input: CategoriaInput): Promise<CategoriaCatalogo> {
  return httpSend<CategoriaCatalogo, CategoriaInput>("/api/categorias", "POST", input);
}

export async function updateCategoria(
  id: number,
  patch: Partial<CategoriaInput>
): Promise<CategoriaCatalogo> {
  return httpSend<CategoriaCatalogo, Partial<CategoriaInput>>(
    `/api/categorias/${id}`,
    "PATCH",
    patch
  );
}

export async function deleteCategoria(id: number): Promise<void> {
  await httpSend<null>(`/api/categorias/${id}`, "DELETE");
}

// ─── Tipologias (Blueprint) ─────────────────────────────────────────────

export type TipologiaInput = Pick<Tipologia, "nome" | "metragem" | "descricao"> & {
  /** Grupos de unidades vinculados — a lista completa (substitui a atual). */
  unitGroupIds?: number[];
};
export type TipologiaPatch = Partial<TipologiaInput & { status: TipologiaStatus }>;

export async function listTipologias(projectId: number): Promise<Tipologia[]> {
  return httpGet<Tipologia[]>(`/api/tipologias?projectId=${projectId}`);
}

export async function getTipologia(id: number): Promise<Tipologia | null> {
  return httpGet<Tipologia | null>(`/api/tipologias/${id}`);
}

export async function createTipologia(
  projectId: number,
  input: TipologiaInput
): Promise<Tipologia> {
  return httpSend<Tipologia, ProjectPayload<TipologiaInput>>("/api/tipologias", "POST", {
    projectId,
    input,
  });
}

export async function updateTipologia(
  id: number,
  patch: TipologiaPatch
): Promise<Tipologia> {
  return httpSend<Tipologia, TipologiaPatch>(
    `/api/tipologias/${id}`,
    "PATCH",
    patch
  );
}

export async function deleteTipologia(id: number): Promise<void> {
  await httpSend<null>(`/api/tipologias/${id}`, "DELETE");
}

/** Clona a planta inteira como cópia independente. */
export async function duplicateTipologia(id: number): Promise<Tipologia> {
  return httpSend<Tipologia>(`/api/tipologias/${id}/duplicar`, "POST");
}

// ─── Ambientes (Room + BlueprintRoom; ambienteId = blueprintRoomId) ─────

export type AmbienteInput = Pick<Ambiente, "nome"> & Partial<Pick<Ambiente, "icon" | "local">>;

export async function createAmbiente(
  tipologiaId: number,
  input: AmbienteInput
): Promise<Ambiente> {
  return httpSend<Ambiente, AmbienteInput>(
    `/api/tipologias/${tipologiaId}/ambientes`,
    "POST",
    input
  );
}

export async function updateAmbiente(
  tipologiaId: number,
  ambienteId: number,
  patch: Partial<AmbienteInput>
): Promise<Ambiente> {
  return httpSend<Ambiente, Partial<AmbienteInput>>(
    `/api/tipologias/${tipologiaId}/ambientes/${ambienteId}`,
    "PATCH",
    patch
  );
}

export async function deleteAmbiente(tipologiaId: number, ambienteId: number): Promise<void> {
  await httpSend<null>(`/api/tipologias/${tipologiaId}/ambientes/${ambienteId}`, "DELETE");
}

export async function cloneAmbiente(
  tipologiaId: number,
  ambienteId: number
): Promise<Ambiente> {
  return httpSend<Ambiente>(
    `/api/tipologias/${tipologiaId}/ambientes/${ambienteId}/clonar`,
    "POST"
  );
}

export async function reorderAmbientes(
  tipologiaId: number,
  orderedIds: number[]
): Promise<void> {
  await httpSend<null, { orderedIds: number[] }>(
    `/api/tipologias/${tipologiaId}/ambientes`,
    "PUT",
    { orderedIds }
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

/** Operações de padrão/upgrades/kitQtds — POST único em /opcoes. */
type OpcaoBody =
  | { op: "setPadrao"; padraoBaseId: number | null }
  | { op: "addUpgrade"; baseId: number }
  | { op: "addUpgrades"; baseIds: number[] }
  | { op: "replaceUpgrade"; optionId: number; newBaseId: number }
  | { op: "removeUpgrade"; optionId: number }
  | { op: "setKitQtds"; qtds: Record<number, number | null> };

function opcao(
  tipologiaId: number,
  ambienteId: number,
  componenteId: number,
  body: OpcaoBody
): Promise<Componente> {
  return httpSend<Componente, OpcaoBody>(
    `/api/tipologias/${tipologiaId}/ambientes/${ambienteId}/componentes/${componenteId}/opcoes`,
    "POST",
    body
  );
}

export async function createComponente(
  tipologiaId: number,
  ambienteId: number,
  input: ComponenteInput
): Promise<Componente> {
  return httpSend<Componente, ComponenteInput>(
    `/api/tipologias/${tipologiaId}/ambientes/${ambienteId}/componentes`,
    "POST",
    input
  );
}

export async function updateComponente(
  tipologiaId: number,
  ambienteId: number,
  componenteId: number,
  patch: Partial<ComponenteInput>
): Promise<Componente> {
  return httpSend<Componente, Partial<ComponenteInput>>(
    `/api/tipologias/${tipologiaId}/ambientes/${ambienteId}/componentes/${componenteId}`,
    "PATCH",
    patch
  );
}

/** "Editar metragens": qtd/RT de vários componentes da tipologia num request só. */
export async function updateMetragens(tipologiaId: number, itens: MetragemInput[]): Promise<void> {
  await httpSend<null, { itens: MetragemInput[] }>(
    `/api/tipologias/${tipologiaId}/metragens`,
    "PATCH",
    { itens }
  );
}

export async function deleteComponente(
  tipologiaId: number,
  ambienteId: number,
  componenteId: number
): Promise<void> {
  await httpSend<null>(
    `/api/tipologias/${tipologiaId}/ambientes/${ambienteId}/componentes/${componenteId}`,
    "DELETE"
  );
}

export async function reorderComponentes(
  tipologiaId: number,
  ambienteId: number,
  orderedIds: number[]
): Promise<void> {
  await httpSend<null, { orderedIds: number[] }>(
    `/api/tipologias/${tipologiaId}/ambientes/${ambienteId}/componentes`,
    "PUT",
    { orderedIds }
  );
}

/** Define o material default (crédito). padraoBaseId = BaseMaterial escolhido; null limpa. */
export async function setPadrao(
  tipologiaId: number,
  ambienteId: number,
  componenteId: number,
  padraoBaseId: number | null
): Promise<Componente> {
  return opcao(tipologiaId, ambienteId, componenteId, { op: "setPadrao", padraoBaseId });
}

/** Adiciona uma opção (upgrade) referenciando um BaseMaterial do catálogo. */
export async function addUpgrade(
  tipologiaId: number,
  ambienteId: number,
  componenteId: number,
  baseId: number
): Promise<Componente> {
  return opcao(tipologiaId, ambienteId, componenteId, { op: "addUpgrade", baseId });
}

/** Adiciona várias opções (upgrades) num único POST, na ordem recebida. */
export async function addUpgrades(
  tipologiaId: number,
  ambienteId: number,
  componenteId: number,
  baseIds: number[]
): Promise<Componente> {
  return opcao(tipologiaId, ambienteId, componenteId, { op: "addUpgrades", baseIds });
}

/** Troca o BaseMaterial de uma opção (optionId → newBaseId), preservando a posição. */
export async function replaceUpgrade(
  tipologiaId: number,
  ambienteId: number,
  componenteId: number,
  optionId: number,
  newBaseId: number
): Promise<Componente> {
  return opcao(tipologiaId, ambienteId, componenteId, { op: "replaceUpgrade", optionId, newBaseId });
}

/** Remove uma opção (por id de linha Material). */
export async function removeUpgrade(
  tipologiaId: number,
  ambienteId: number,
  componenteId: number,
  optionId: number
): Promise<Componente> {
  return opcao(tipologiaId, ambienteId, componenteId, { op: "removeUpgrade", optionId });
}

/**
 * Grava os quantitativos de sub-itens de kit desta planta (keyed por KitItem id).
 * `null` apaga: o sub-item volta a herdar a qtd do componente ou fica pendente.
 */
export async function setKitQtds(
  tipologiaId: number,
  ambienteId: number,
  componenteId: number,
  qtds: Record<number, number | null>
): Promise<Componente> {
  return opcao(tipologiaId, ambienteId, componenteId, { op: "setKitQtds", qtds });
}

// ─── Compartilhamento de ambientes entre tipologias ──────────────────

export interface SharedInfo {
  /** shareId (String(roomId)) → tipologias participantes. */
  sharedReg: Record<string, { tips: string[] }>;
  /** String(roomId) → shareId. */
  ambShared: Record<string, string>;
}

export async function getSharedInfo(projectId: number): Promise<SharedInfo> {
  return httpGet<SharedInfo>(`/api/shared-ambientes?projectId=${projectId}`);
}

/**
 * Compartilha um ambiente de outra planta na planta alvo: insere um BlueprintRoom
 * apontando para o MESMO Room (sem clonar). A paleta passa a propagar.
 */
export async function linkAmbiente(
  targetTipologiaId: number,
  srcBlueprintRoomId: number
): Promise<Ambiente> {
  return httpSend<Ambiente, { srcAmbienteId: number }>(
    `/api/tipologias/${targetTipologiaId}/ambientes/vincular`,
    "POST",
    { srcAmbienteId: srcBlueprintRoomId }
  );
}

// ─── Unit groups / Torres ─────────────────────────────────────────────

export type UnitGroupInput = Omit<UnitGroup, "id" | "tipologiaId"> & {
  /** null desvincula; ausente não mexe. */
  tipologiaId?: number | null;
};

export async function listUnitGroups(projectId: number): Promise<UnitGroup[]> {
  return httpGet<UnitGroup[]>(`/api/unit-groups?projectId=${projectId}`);
}

export async function createUnitGroup(
  projectId: number,
  input: UnitGroupInput
): Promise<UnitGroup> {
  return httpSend<UnitGroup, ProjectPayload<UnitGroupInput>>("/api/unit-groups", "POST", {
    projectId,
    input,
  });
}

export async function updateUnitGroup(
  id: number,
  patch: Partial<UnitGroupInput>
): Promise<UnitGroup> {
  return httpSend<UnitGroup, Partial<UnitGroupInput>>(
    `/api/unit-groups/${id}`,
    "PATCH",
    patch
  );
}

export async function deleteUnitGroup(id: number): Promise<void> {
  await httpSend<null>(`/api/unit-groups/${id}`, "DELETE");
}

export type TorreInput = { id: number | null; nome: string };

export async function listTorres(projectId: number): Promise<Torre[]> {
  return httpGet<Torre[]>(`/api/torres?projectId=${projectId}`);
}

/** Reconcilia a lista completa de torres do empreendimento. */
export async function updateTorres(projectId: number, items: TorreInput[]): Promise<Torre[]> {
  return httpSend<Torre[], ProjectPayload<TorreInput[]>>("/api/torres", "PUT", {
    projectId,
    input: items,
  });
}

// ─── Versions ─────────────────────────────────────────────────────────

export interface VersionInput {
  summary: string;
  createdBy: string;
  changes: VersionChanges;
}

export async function listVersions(projectId: number): Promise<BudgetVersion[]> {
  return httpGet<BudgetVersion[]>(`/api/versions?projectId=${projectId}`);
}

export async function createVersion(
  projectId: number,
  input: VersionInput
): Promise<BudgetVersion> {
  return httpSend<BudgetVersion, ProjectPayload<VersionInput>>("/api/versions", "POST", {
    projectId,
    input,
  });
}

/** Marca a versão como atual (snapshot/restore real de estado — §12). */
export async function restoreVersion(id: number): Promise<BudgetVersion> {
  return httpSend<BudgetVersion>(`/api/versions/${id}/restore`, "POST");
}

// ─── Comments (rowKey = String(optionId)) ─────────────────────────────

export interface CommentInput {
  autor: Comment["autor"];
  autorNome?: string;
  texto: string;
}

export async function getComments(rowKey: string): Promise<Comment[]> {
  return httpGet<Comment[]>(`/api/comments?rowKey=${encodeURIComponent(rowKey)}`);
}

/** Todas as threads (contadores de comentário por linha nas tabelas). */
export async function listCommentThreads(
  projectId: number
): Promise<Record<string, Comment[]>> {
  return httpGet<Record<string, Comment[]>>(`/api/comments?projectId=${projectId}`);
}

export async function appendComment(rowKey: string, input: CommentInput): Promise<Comment> {
  return httpSend<Comment, { rowKey: string; input: CommentInput }>("/api/comments", "POST", {
    rowKey,
    input,
  });
}

// ─── Links de preenchimento (o portal usa /api/portal/[token]) ────────

export type FillLinkInput = Pick<FillLink, "tipologiaIds" | "campos" | "prazo" | "senha">;

export async function createFillLink(
  projectId: number,
  input: FillLinkInput
): Promise<FillLink> {
  return httpSend<FillLink, ProjectPayload<FillLinkInput>>("/api/fill-links", "POST", {
    projectId,
    input,
  });
}
