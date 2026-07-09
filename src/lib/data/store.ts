// Camada de dados do cliente (Fase 10) — as MESMAS assinaturas do store mock
// das fases 1–9, agora chamando as rotas /api/* via httpGet/httpSend. Hooks
// React Query e telas permanecem intocados; a organização vem da sessão no
// servidor (o cliente nunca envia org).
import { httpGet, httpSend } from "@/lib/api/http";
import type {
  Ambiente,
  BudgetColumn,
  BudgetVersion,
  Comment,
  Componente,
  FillLink,
  Kit,
  Material,
  Project,
  Tipologia,
  TipologiaStatus,
  UnitGroup,
  VersionChanges,
} from "@/shared/types/domain";

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

export async function listProjects(): Promise<Project[]> {
  return httpGet<Project[]>("/api/projects");
}

export async function getProject(id: string): Promise<Project | null> {
  return httpGet<Project | null>(`/api/projects/${id}`);
}

export async function updateProject(id: string, patch: ProjectPatch): Promise<Project> {
  return httpSend<Project, ProjectPatch>(`/api/projects/${id}`, "PATCH", patch);
}

/** Publica o orçamento — a partir daí o servidor rejeita qualquer mutação. */
export async function publishProject(id: string): Promise<Project> {
  return httpSend<Project>(`/api/projects/${id}/publish`, "POST");
}

export async function getBudgetColumns(projectId: string): Promise<BudgetColumn[]> {
  return httpGet<BudgetColumn[]>(`/api/projects/${projectId}/columns`);
}

export async function updateBudgetColumns(
  projectId: string,
  cols: BudgetColumn[]
): Promise<BudgetColumn[]> {
  return httpSend<BudgetColumn[], BudgetColumn[]>(
    `/api/projects/${projectId}/columns`,
    "PUT",
    cols
  );
}

// ─── Materiais ────────────────────────────────────────────────────────

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
  id: string,
  patch: Partial<MaterialInput>
): Promise<Material> {
  return httpSend<Material, Partial<MaterialInput>>(`/api/materiais/${id}`, "PATCH", patch);
}

export async function deleteMaterial(id: string): Promise<void> {
  await httpSend<null>(`/api/materiais/${id}`, "DELETE");
}

// ─── Kits ─────────────────────────────────────────────────────────────

export type KitInput = Omit<Kit, "id" | "tipo">;

export async function listKits(): Promise<Kit[]> {
  return httpGet<Kit[]>("/api/kits");
}

export async function createKit(input: KitInput): Promise<Kit> {
  return httpSend<Kit, KitInput>("/api/kits", "POST", input);
}

export async function updateKit(id: string, patch: Partial<KitInput>): Promise<Kit> {
  return httpSend<Kit, Partial<KitInput>>(`/api/kits/${id}`, "PATCH", patch);
}

export async function deleteKit(id: string): Promise<void> {
  await httpSend<null>(`/api/kits/${id}`, "DELETE");
}

// ─── Tipologias ───────────────────────────────────────────────────────

export type TipologiaInput = Pick<Tipologia, "nome" | "metragem" | "descricao" | "unidades">;

export async function listTipologias(): Promise<Tipologia[]> {
  return httpGet<Tipologia[]>("/api/tipologias");
}

export async function getTipologia(id: string): Promise<Tipologia | null> {
  return httpGet<Tipologia | null>(`/api/tipologias/${id}`);
}

export async function createTipologia(input: TipologiaInput): Promise<Tipologia> {
  return httpSend<Tipologia, TipologiaInput>("/api/tipologias", "POST", input);
}

export async function updateTipologia(
  id: string,
  patch: Partial<TipologiaInput & Pick<Tipologia, "status">>
): Promise<Tipologia> {
  return httpSend<Tipologia, Partial<TipologiaInput & { status: TipologiaStatus }>>(
    `/api/tipologias/${id}`,
    "PATCH",
    patch
  );
}

export async function deleteTipologia(id: string): Promise<void> {
  await httpSend<null>(`/api/tipologias/${id}`, "DELETE");
}

/** Clona a árvore inteira (ambientes/componentes) com ids novos. */
export async function duplicateTipologia(id: string): Promise<Tipologia> {
  return httpSend<Tipologia>(`/api/tipologias/${id}/duplicar`, "POST");
}

// ─── Ambientes ────────────────────────────────────────────────────────

export type AmbienteInput = Pick<Ambiente, "nome"> &
  Partial<Pick<Ambiente, "icon" | "imagem" | "local">>;

export async function createAmbiente(
  tipologiaId: string,
  input: AmbienteInput
): Promise<Ambiente> {
  return httpSend<Ambiente, AmbienteInput>(
    `/api/tipologias/${tipologiaId}/ambientes`,
    "POST",
    input
  );
}

export async function updateAmbiente(
  tipologiaId: string,
  ambienteId: string,
  patch: Partial<AmbienteInput>
): Promise<Ambiente> {
  return httpSend<Ambiente, Partial<AmbienteInput>>(
    `/api/tipologias/${tipologiaId}/ambientes/${ambienteId}`,
    "PATCH",
    patch
  );
}

export async function deleteAmbiente(tipologiaId: string, ambienteId: string): Promise<void> {
  await httpSend<null>(`/api/tipologias/${tipologiaId}/ambientes/${ambienteId}`, "DELETE");
}

export async function cloneAmbiente(
  tipologiaId: string,
  ambienteId: string
): Promise<Ambiente> {
  return httpSend<Ambiente>(
    `/api/tipologias/${tipologiaId}/ambientes/${ambienteId}/clonar`,
    "POST"
  );
}

export async function reorderAmbientes(
  tipologiaId: string,
  orderedIds: string[]
): Promise<void> {
  await httpSend<null, { orderedIds: string[] }>(
    `/api/tipologias/${tipologiaId}/ambientes`,
    "PUT",
    { orderedIds }
  );
}

// ─── Componentes ──────────────────────────────────────────────────────

export type ComponenteInput = Pick<Componente, "nome" | "unidade" | "qtd" | "rt"> &
  Partial<Pick<Componente, "ghost" | "ordem" | "padrao">>;

/** Operações de padrão/upgrades/kitQtds — POST único em /opcoes. */
type OpcaoBody =
  | { op: "setPadrao"; padraoId: string | null }
  | { op: "addUpgrade"; upgradeId: string }
  | { op: "replaceUpgrade"; oldId: string; newId: string }
  | { op: "removeUpgrade"; upgradeId: string }
  | { op: "setKitQtds"; kitId: string; qtds: Record<string, number> };

function opcao(
  tipologiaId: string,
  ambienteId: string,
  componenteId: string,
  body: OpcaoBody
): Promise<Componente> {
  return httpSend<Componente, OpcaoBody>(
    `/api/tipologias/${tipologiaId}/ambientes/${ambienteId}/componentes/${componenteId}/opcoes`,
    "POST",
    body
  );
}

export async function createComponente(
  tipologiaId: string,
  ambienteId: string,
  input: ComponenteInput
): Promise<Componente> {
  return httpSend<Componente, ComponenteInput>(
    `/api/tipologias/${tipologiaId}/ambientes/${ambienteId}/componentes`,
    "POST",
    input
  );
}

export async function updateComponente(
  tipologiaId: string,
  ambienteId: string,
  componenteId: string,
  patch: Partial<ComponenteInput>
): Promise<Componente> {
  return httpSend<Componente, Partial<ComponenteInput>>(
    `/api/tipologias/${tipologiaId}/ambientes/${ambienteId}/componentes/${componenteId}`,
    "PATCH",
    patch
  );
}

export async function deleteComponente(
  tipologiaId: string,
  ambienteId: string,
  componenteId: string
): Promise<void> {
  await httpSend<null>(
    `/api/tipologias/${tipologiaId}/ambientes/${ambienteId}/componentes/${componenteId}`,
    "DELETE"
  );
}

export async function reorderComponentes(
  tipologiaId: string,
  ambienteId: string,
  orderedIds: string[]
): Promise<void> {
  await httpSend<null, { orderedIds: string[] }>(
    `/api/tipologias/${tipologiaId}/ambientes/${ambienteId}/componentes`,
    "PUT",
    { orderedIds }
  );
}

export async function setPadrao(
  tipologiaId: string,
  ambienteId: string,
  componenteId: string,
  padraoId: string | null
): Promise<Componente> {
  return opcao(tipologiaId, ambienteId, componenteId, { op: "setPadrao", padraoId });
}

export async function addUpgrade(
  tipologiaId: string,
  ambienteId: string,
  componenteId: string,
  upgradeId: string
): Promise<Componente> {
  return opcao(tipologiaId, ambienteId, componenteId, { op: "addUpgrade", upgradeId });
}

/** Troca o material de uma opção preservando a posição no array (ups[i] = novo). */
export async function replaceUpgrade(
  tipologiaId: string,
  ambienteId: string,
  componenteId: string,
  oldId: string,
  newId: string
): Promise<Componente> {
  return opcao(tipologiaId, ambienteId, componenteId, { op: "replaceUpgrade", oldId, newId });
}

export async function removeUpgrade(
  tipologiaId: string,
  ambienteId: string,
  componenteId: string,
  upgradeId: string
): Promise<Componente> {
  return opcao(tipologiaId, ambienteId, componenteId, { op: "removeUpgrade", upgradeId });
}

/** Grava os quantitativos dos sub-itens de um kit para o componente. */
export async function setKitQtds(
  tipologiaId: string,
  ambienteId: string,
  componenteId: string,
  kitId: string,
  qtds: Record<string, number>
): Promise<Componente> {
  return opcao(tipologiaId, ambienteId, componenteId, { op: "setKitQtds", kitId, qtds });
}

// ─── Compartilhamento de ambientes entre tipologias ──────────────────

export interface SharedInfo {
  /** shareId → tipologias participantes. */
  sharedReg: Record<string, { tips: string[] }>;
  /** ambienteId → shareId. */
  ambShared: Record<string, string>;
}

export async function getSharedInfo(): Promise<SharedInfo> {
  return httpGet<SharedInfo>("/api/shared-ambientes");
}

/**
 * Vincula um ambiente de outra tipologia à tipologia alvo: clona o ambiente
 * (ids novos) e registra ambos no grupo compartilhado do ambiente fonte.
 */
export async function linkAmbiente(
  targetTipologiaId: string,
  srcTipologiaId: string,
  srcAmbienteId: string
): Promise<Ambiente> {
  return httpSend<Ambiente, { srcTipologiaId: string; srcAmbienteId: string }>(
    `/api/tipologias/${targetTipologiaId}/ambientes/vincular`,
    "POST",
    { srcTipologiaId, srcAmbienteId }
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
  id: string,
  patch: Partial<UnitGroupInput>
): Promise<UnitGroup> {
  return httpSend<UnitGroup, Partial<UnitGroupInput>>(
    `/api/unit-groups/${id}`,
    "PATCH",
    patch
  );
}

export async function deleteUnitGroup(id: string): Promise<void> {
  await httpSend<null>(`/api/unit-groups/${id}`, "DELETE");
}

export async function listTorres(): Promise<string[]> {
  return httpGet<string[]>("/api/torres");
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
export async function restoreVersion(id: string): Promise<BudgetVersion> {
  return httpSend<BudgetVersion>(`/api/versions/${id}/restore`, "POST");
}

// ─── Comments (rowKey = `${compId}-${optId}`) ─────────────────────────

export interface CommentInput {
  autor: Comment["autor"];
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

// ─── Pending items ────────────────────────────────────────────────────

export async function listPendingItems(): Promise<string[]> {
  return httpGet<string[]>("/api/pending-items");
}

export async function addPendingItem(key: string): Promise<void> {
  await httpSend<null, { key: string }>("/api/pending-items", "POST", { key });
}

export async function removePendingItem(key: string): Promise<void> {
  await httpSend<null>(`/api/pending-items?key=${encodeURIComponent(key)}`, "DELETE");
}

// ─── Links de preenchimento (o portal usa /api/portal/[token]) ────────

export type FillLinkInput = Pick<FillLink, "tipologiaIds" | "campos" | "prazo" | "senha">;

export async function createFillLink(input: FillLinkInput): Promise<FillLink> {
  return httpSend<FillLink, FillLinkInput>("/api/fill-links", "POST", input);
}
