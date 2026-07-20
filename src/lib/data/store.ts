// Camada de dados do cliente (Fase 3/4 — realinhada) — as MESMAS assinaturas do
// store de servidor, agora chamando as rotas /api/* via httpGet/httpSend. Ids de
// domínio em `number`; a organização vem da sessão no servidor (o cliente nunca
// envia org). Pendência não é mais uma tabela — deriva do custo (custo 0).
import { httpGet, httpSend } from "@/lib/api/http";
import type {
  Ambiente,
  BudgetColumn,
  BudgetVersion,
  CategoriaCatalogo,
  Comment,
  Componente,
  CostComponentKind,
  CostComponentSide,
  FillLink,
  Kit,
  Material,
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
  >
>;

export async function listProjects(): Promise<Project[]> {
  return httpGet<Project[]>("/api/projects");
}

export async function getProject(id: number): Promise<Project | null> {
  return httpGet<Project | null>(`/api/projects/${id}`);
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

export type TipologiaInput = Pick<Tipologia, "nome" | "metragem" | "descricao" | "unidades">;

export async function listTipologias(): Promise<Tipologia[]> {
  return httpGet<Tipologia[]>("/api/tipologias");
}

export async function getTipologia(id: number): Promise<Tipologia | null> {
  return httpGet<Tipologia | null>(`/api/tipologias/${id}`);
}

export async function createTipologia(input: TipologiaInput): Promise<Tipologia> {
  return httpSend<Tipologia, TipologiaInput>("/api/tipologias", "POST", input);
}

export async function updateTipologia(
  id: number,
  patch: Partial<TipologiaInput & Pick<Tipologia, "status">>
): Promise<Tipologia> {
  return httpSend<Tipologia, Partial<TipologiaInput & { status: TipologiaStatus }>>(
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
  | { op: "replaceUpgrade"; optionId: number; newBaseId: number }
  | { op: "removeUpgrade"; optionId: number }
  | { op: "setKitQtds"; qtds: Record<number, number> };

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

/** Grava os quantitativos de sub-itens de kit desta planta (keyed por KitItem id). */
export async function setKitQtds(
  tipologiaId: number,
  ambienteId: number,
  componenteId: number,
  qtds: Record<number, number>
): Promise<Componente> {
  return opcao(tipologiaId, ambienteId, componenteId, { op: "setKitQtds", qtds });
}

// ─── Componentes de custo (satélites) ────────────────────────────────

/** Dados de um componente de custo novo (definição + quantitativo desta planta). */
export interface CostComponentInput {
  nome: string;
  tipo: CostComponentKind;
  baseId: number | null;
  unidade: Unidade;
  lado: CostComponentSide;
  qtd: number;
}

type CustoBody =
  | ({ op: "add" } & CostComponentInput)
  | { op: "update"; costItemId: number; patch: Partial<Omit<CostComponentInput, "qtd">> }
  | { op: "remove"; costItemId: number }
  | { op: "setQtds"; qtds: Record<number, number> }
  | { op: "reorder"; orderedIds: number[] };

function custoComponente(
  tipologiaId: number,
  ambienteId: number,
  componenteId: number,
  body: CustoBody
): Promise<Componente> {
  return httpSend<Componente, CustoBody>(
    `/api/tipologias/${tipologiaId}/ambientes/${ambienteId}/componentes/${componenteId}/componentes-custo`,
    "POST",
    body
  );
}

export async function addCostComponent(
  tipologiaId: number,
  ambienteId: number,
  componenteId: number,
  input: CostComponentInput
): Promise<Componente> {
  return custoComponente(tipologiaId, ambienteId, componenteId, { op: "add", ...input });
}

/** Edita a DEFINIÇÃO — vale para todas as tipologias que usam o ambiente. */
export async function updateCostComponent(
  tipologiaId: number,
  ambienteId: number,
  componenteId: number,
  costItemId: number,
  patch: Partial<Omit<CostComponentInput, "qtd">>
): Promise<Componente> {
  return custoComponente(tipologiaId, ambienteId, componenteId, { op: "update", costItemId, patch });
}

export async function removeCostComponent(
  tipologiaId: number,
  ambienteId: number,
  componenteId: number,
  costItemId: number
): Promise<Componente> {
  return custoComponente(tipologiaId, ambienteId, componenteId, { op: "remove", costItemId });
}

/** Quantitativos desta planta (keyed por id de componente de custo). */
export async function setCostQtds(
  tipologiaId: number,
  ambienteId: number,
  componenteId: number,
  qtds: Record<number, number>
): Promise<Componente> {
  return custoComponente(tipologiaId, ambienteId, componenteId, { op: "setQtds", qtds });
}

export async function reorderCostComponents(
  tipologiaId: number,
  ambienteId: number,
  componenteId: number,
  orderedIds: number[]
): Promise<Componente> {
  return custoComponente(tipologiaId, ambienteId, componenteId, { op: "reorder", orderedIds });
}

// ─── Compartilhamento de ambientes entre tipologias ──────────────────

export interface SharedInfo {
  /** shareId (String(roomId)) → tipologias participantes. */
  sharedReg: Record<string, { tips: string[] }>;
  /** String(roomId) → shareId. */
  ambShared: Record<string, string>;
}

export async function getSharedInfo(): Promise<SharedInfo> {
  return httpGet<SharedInfo>("/api/shared-ambientes");
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

export type UnitGroupInput = Omit<UnitGroup, "id">;

export async function listUnitGroups(): Promise<UnitGroup[]> {
  return httpGet<UnitGroup[]>("/api/unit-groups");
}

export async function createUnitGroup(input: UnitGroupInput): Promise<UnitGroup> {
  return httpSend<UnitGroup, UnitGroupInput>("/api/unit-groups", "POST", input);
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

export async function listTorres(): Promise<Torre[]> {
  return httpGet<Torre[]>("/api/torres");
}

/** Reconcilia a lista completa de torres do empreendimento âncora. */
export async function updateTorres(items: TorreInput[]): Promise<Torre[]> {
  return httpSend<Torre[], TorreInput[]>("/api/torres", "PUT", items);
}

// ─── Versions ─────────────────────────────────────────────────────────

export interface VersionInput {
  summary: string;
  createdBy: string;
  changes: VersionChanges;
}

export async function listVersions(): Promise<BudgetVersion[]> {
  return httpGet<BudgetVersion[]>("/api/versions");
}

export async function createVersion(input: VersionInput): Promise<BudgetVersion> {
  return httpSend<BudgetVersion, VersionInput>("/api/versions", "POST", input);
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
export async function listCommentThreads(): Promise<Record<string, Comment[]>> {
  return httpGet<Record<string, Comment[]>>("/api/comments");
}

export async function appendComment(rowKey: string, input: CommentInput): Promise<Comment> {
  return httpSend<Comment, { rowKey: string; input: CommentInput }>("/api/comments", "POST", {
    rowKey,
    input,
  });
}

// ─── Links de preenchimento (o portal usa /api/portal/[token]) ────────

export type FillLinkInput = Pick<FillLink, "tipologiaIds" | "campos" | "prazo" | "senha">;

export async function createFillLink(input: FillLinkInput): Promise<FillLink> {
  return httpSend<FillLink, FillLinkInput>("/api/fill-links", "POST", input);
}
