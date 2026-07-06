// Store mock em memória — a camada de dados da Fase 1. Todas as funções são
// async e clonam dados nas bordas (structuredClone) para simular a fronteira
// de serialização: na Fase 10 estas MESMAS assinaturas passam a chamar as
// rotas /api/* via httpGet/httpSend, sem tocar nas telas.
import { TAX_COLUMNS_DEFAULT } from "@/shared/constants/budget";
import type {
  Ambiente,
  BudgetColumn,
  BudgetVersion,
  Comment,
  Componente,
  Kit,
  Material,
  Project,
  Tipologia,
  UnitGroup,
  VersionChanges,
} from "@/shared/types/domain";

import { createSeed, type SeedData } from "./seed";

let db: SeedData = createSeed();

/** Restaura o seed original (uso em testes). */
export function resetStore(): void {
  db = createSeed();
}

function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function findTipologia(id: string): Tipologia {
  const tip = db.tipologias.find((t) => t.id === id);
  if (!tip) throw new Error("Tipologia não encontrada.");
  return tip;
}

function findAmbiente(tipologiaId: string, ambienteId: string): Ambiente {
  const amb = findTipologia(tipologiaId).ambientes.find((a) => a.id === ambienteId);
  if (!amb) throw new Error("Ambiente não encontrado.");
  return amb;
}

function findComponente(
  tipologiaId: string,
  ambienteId: string,
  componenteId: string
): Componente {
  const comp = findAmbiente(tipologiaId, ambienteId).componentes.find(
    (c) => c.id === componenteId
  );
  if (!comp) throw new Error("Componente não encontrado.");
  return comp;
}

/** Data/hora atual no formato do mock: "DD/MM/AAAA HH:mm". */
function nowBR(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
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

export async function listProjects(): Promise<Project[]> {
  return clone(db.projects);
}

export async function getProject(id: string): Promise<Project | null> {
  const p = db.projects.find((x) => x.id === id);
  return p ? clone(p) : null;
}

export async function updateProject(id: string, patch: ProjectPatch): Promise<Project> {
  const p = db.projects.find((x) => x.id === id);
  if (!p) throw new Error("Empreendimento não encontrado.");
  Object.assign(p, clone(patch));
  return clone(p);
}

export async function getBudgetColumns(projectId: string): Promise<BudgetColumn[]> {
  const p = db.projects.find((x) => x.id === projectId);
  return clone(p?.taxColumns ?? TAX_COLUMNS_DEFAULT);
}

export async function updateBudgetColumns(
  projectId: string,
  cols: BudgetColumn[]
): Promise<BudgetColumn[]> {
  const p = db.projects.find((x) => x.id === projectId);
  if (!p) throw new Error("Empreendimento não encontrado.");
  p.taxColumns = clone(cols);
  return clone(p.taxColumns);
}

// ─── Materiais ────────────────────────────────────────────────────────

export type MaterialInput = Omit<Material, "id">;

export async function listMateriais(): Promise<Material[]> {
  return clone(db.materiais);
}

export async function createMaterial(input: MaterialInput): Promise<Material> {
  const mat: Material = { id: genId("mat"), ...clone(input) };
  db.materiais.push(mat);
  return clone(mat);
}

/** Criação em lote (importação CSV) — na Fase 10 vira um único POST. */
export async function createMateriais(inputs: MaterialInput[]): Promise<Material[]> {
  const created = inputs.map((input): Material => ({ id: genId("mat"), ...clone(input) }));
  db.materiais.push(...created);
  return clone(created);
}

export async function updateMaterial(
  id: string,
  patch: Partial<MaterialInput>
): Promise<Material> {
  const mat = db.materiais.find((m) => m.id === id);
  if (!mat) throw new Error("Material não encontrado.");
  Object.assign(mat, clone(patch));
  return clone(mat);
}

export async function deleteMaterial(id: string): Promise<void> {
  const idx = db.materiais.findIndex((m) => m.id === id);
  if (idx === -1) throw new Error("Material não encontrado.");
  db.materiais.splice(idx, 1);
}

// ─── Kits ─────────────────────────────────────────────────────────────

export type KitInput = Omit<Kit, "id" | "tipo">;

export async function listKits(): Promise<Kit[]> {
  return clone(db.kits);
}

export async function createKit(input: KitInput): Promise<Kit> {
  const kit: Kit = { id: genId("kit"), tipo: "kit", ...clone(input) };
  db.kits.push(kit);
  return clone(kit);
}

export async function updateKit(id: string, patch: Partial<KitInput>): Promise<Kit> {
  const kit = db.kits.find((k) => k.id === id);
  if (!kit) throw new Error("Kit não encontrado.");
  Object.assign(kit, clone(patch));
  return clone(kit);
}

export async function deleteKit(id: string): Promise<void> {
  const idx = db.kits.findIndex((k) => k.id === id);
  if (idx === -1) throw new Error("Kit não encontrado.");
  db.kits.splice(idx, 1);
}

// ─── Tipologias ───────────────────────────────────────────────────────

export type TipologiaInput = Pick<Tipologia, "nome" | "metragem" | "descricao" | "unidades">;

export async function listTipologias(): Promise<Tipologia[]> {
  return clone(db.tipologias);
}

export async function getTipologia(id: string): Promise<Tipologia | null> {
  const tip = db.tipologias.find((t) => t.id === id);
  return tip ? clone(tip) : null;
}

export async function createTipologia(input: TipologiaInput): Promise<Tipologia> {
  const tip: Tipologia = { id: genId("t"), ...clone(input), status: "incompleta", ambientes: [] };
  db.tipologias.push(tip);
  return clone(tip);
}

export async function updateTipologia(
  id: string,
  patch: Partial<TipologiaInput & Pick<Tipologia, "status">>
): Promise<Tipologia> {
  const tip = findTipologia(id);
  Object.assign(tip, clone(patch));
  return clone(tip);
}

export async function deleteTipologia(id: string): Promise<void> {
  const idx = db.tipologias.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error("Tipologia não encontrada.");
  db.tipologias.splice(idx, 1);
}

/** Clona a árvore inteira (ambientes/componentes) com ids novos. */
export async function duplicateTipologia(id: string): Promise<Tipologia> {
  const src = findTipologia(id);
  const copy = clone(src);
  copy.id = genId("t");
  copy.nome = `${src.nome} (cópia)`;
  copy.ambientes = copy.ambientes.map((amb) => ({
    ...amb,
    id: genId("amb"),
    componentes: amb.componentes.map((c) => ({ ...c, id: genId("c") })),
  }));
  db.tipologias.push(copy);
  return clone(copy);
}

// ─── Ambientes ────────────────────────────────────────────────────────

export type AmbienteInput = Pick<Ambiente, "nome"> &
  Partial<Pick<Ambiente, "icon" | "imagem" | "local">>;

export async function createAmbiente(
  tipologiaId: string,
  input: AmbienteInput
): Promise<Ambiente> {
  const tip = findTipologia(tipologiaId);
  const amb: Ambiente = { id: genId("amb"), ...clone(input), componentes: [] };
  tip.ambientes.push(amb);
  return clone(amb);
}

export async function updateAmbiente(
  tipologiaId: string,
  ambienteId: string,
  patch: Partial<AmbienteInput>
): Promise<Ambiente> {
  const amb = findAmbiente(tipologiaId, ambienteId);
  Object.assign(amb, clone(patch));
  return clone(amb);
}

export async function deleteAmbiente(tipologiaId: string, ambienteId: string): Promise<void> {
  const tip = findTipologia(tipologiaId);
  const idx = tip.ambientes.findIndex((a) => a.id === ambienteId);
  if (idx === -1) throw new Error("Ambiente não encontrado.");
  tip.ambientes.splice(idx, 1);
  // Desvincula esta tipologia do grupo compartilhado, se houver.
  const sid = db.ambShared[ambienteId];
  if (sid !== undefined) {
    delete db.ambShared[ambienteId];
    const reg = db.sharedReg[sid];
    if (reg) reg.tips = reg.tips.filter((id) => id !== tipologiaId);
  }
}

export async function cloneAmbiente(
  tipologiaId: string,
  ambienteId: string
): Promise<Ambiente> {
  const tip = findTipologia(tipologiaId);
  const src = findAmbiente(tipologiaId, ambienteId);
  const copy = clone(src);
  copy.id = genId("amb");
  copy.nome = `${src.nome} (cópia)`;
  copy.componentes = copy.componentes.map((c) => ({ ...c, id: genId("c") }));
  tip.ambientes.push(copy);
  return clone(copy);
}

export async function reorderAmbientes(
  tipologiaId: string,
  orderedIds: string[]
): Promise<void> {
  const tip = findTipologia(tipologiaId);
  const byId = new Map(tip.ambientes.map((a) => [a.id, a]));
  if (orderedIds.length !== tip.ambientes.length || orderedIds.some((id) => !byId.has(id))) {
    throw new Error("Ordem de ambientes inválida.");
  }
  tip.ambientes = orderedIds.map((id) => byId.get(id)!);
}

// ─── Componentes ──────────────────────────────────────────────────────

export type ComponenteInput = Pick<Componente, "nome" | "unidade" | "qtd" | "rt"> &
  Partial<Pick<Componente, "ghost" | "ordem" | "padrao">>;

export async function createComponente(
  tipologiaId: string,
  ambienteId: string,
  input: ComponenteInput
): Promise<Componente> {
  const amb = findAmbiente(tipologiaId, ambienteId);
  const { padrao, ...rest } = input;
  const comp: Componente = {
    id: genId("c"),
    ...clone(rest),
    padrao: padrao ?? null,
    upgrades: [],
    taxaEspecifica: null,
  };
  amb.componentes.push(comp);
  return clone(comp);
}

export async function updateComponente(
  tipologiaId: string,
  ambienteId: string,
  componenteId: string,
  patch: Partial<ComponenteInput>
): Promise<Componente> {
  const comp = findComponente(tipologiaId, ambienteId, componenteId);
  Object.assign(comp, clone(patch));
  return clone(comp);
}

export async function deleteComponente(
  tipologiaId: string,
  ambienteId: string,
  componenteId: string
): Promise<void> {
  const amb = findAmbiente(tipologiaId, ambienteId);
  const idx = amb.componentes.findIndex((c) => c.id === componenteId);
  if (idx === -1) throw new Error("Componente não encontrado.");
  amb.componentes.splice(idx, 1);
}

export async function reorderComponentes(
  tipologiaId: string,
  ambienteId: string,
  orderedIds: string[]
): Promise<void> {
  const amb = findAmbiente(tipologiaId, ambienteId);
  const byId = new Map(amb.componentes.map((c) => [c.id, c]));
  if (orderedIds.length !== amb.componentes.length || orderedIds.some((id) => !byId.has(id))) {
    throw new Error("Ordem de componentes inválida.");
  }
  amb.componentes = orderedIds.map((id) => byId.get(id)!);
}

export async function setPadrao(
  tipologiaId: string,
  ambienteId: string,
  componenteId: string,
  padraoId: string | null
): Promise<Componente> {
  const comp = findComponente(tipologiaId, ambienteId, componenteId);
  comp.padrao = padraoId;
  return clone(comp);
}

export async function addUpgrade(
  tipologiaId: string,
  ambienteId: string,
  componenteId: string,
  upgradeId: string
): Promise<Componente> {
  const comp = findComponente(tipologiaId, ambienteId, componenteId);
  if (!comp.upgrades.includes(upgradeId)) comp.upgrades.push(upgradeId);
  return clone(comp);
}

/** Troca o material de uma opção preservando a posição no array (ups[i] = novo). */
export async function replaceUpgrade(
  tipologiaId: string,
  ambienteId: string,
  componenteId: string,
  oldId: string,
  newId: string
): Promise<Componente> {
  const comp = findComponente(tipologiaId, ambienteId, componenteId);
  const i = comp.upgrades.indexOf(oldId);
  if (i >= 0) comp.upgrades[i] = newId;
  else if (!comp.upgrades.includes(newId)) comp.upgrades.push(newId);
  if (comp.kitQtds && oldId !== newId) delete comp.kitQtds[oldId];
  return clone(comp);
}

export async function removeUpgrade(
  tipologiaId: string,
  ambienteId: string,
  componenteId: string,
  upgradeId: string
): Promise<Componente> {
  const comp = findComponente(tipologiaId, ambienteId, componenteId);
  comp.upgrades = comp.upgrades.filter((u) => u !== upgradeId);
  if (comp.kitQtds) delete comp.kitQtds[upgradeId];
  return clone(comp);
}

/** Grava os quantitativos dos sub-itens de um kit para o componente. */
export async function setKitQtds(
  tipologiaId: string,
  ambienteId: string,
  componenteId: string,
  kitId: string,
  qtds: Record<string, number>
): Promise<Componente> {
  const comp = findComponente(tipologiaId, ambienteId, componenteId);
  comp.kitQtds = { ...comp.kitQtds, [kitId]: clone(qtds) };
  return clone(comp);
}

// ─── Compartilhamento de ambientes entre tipologias ──────────────────
// Fase 5 do plano: ao vincular, clona os componentes e registra o grupo
// (sincronização real de edições fica para depois — §12).

export interface SharedInfo {
  /** shareId → tipologias participantes. */
  sharedReg: Record<string, { tips: string[] }>;
  /** ambienteId → shareId. */
  ambShared: Record<string, string>;
}

export async function getSharedInfo(): Promise<SharedInfo> {
  return clone({ sharedReg: db.sharedReg, ambShared: db.ambShared });
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
  const target = findTipologia(targetTipologiaId);
  const srcAmb = findAmbiente(srcTipologiaId, srcAmbienteId);
  const sid = db.ambShared[srcAmbienteId] ?? `sh-${srcAmbienteId}`;

  const copy = clone(srcAmb);
  copy.id = genId("amb");
  copy.componentes = copy.componentes.map((c) => ({ ...c, id: genId("c") }));
  target.ambientes.push(copy);

  db.ambShared[copy.id] = sid;
  db.ambShared[srcAmbienteId] = sid;
  const reg = db.sharedReg[sid] ?? { tips: [] };
  reg.tips = Array.from(new Set([...reg.tips, srcTipologiaId, targetTipologiaId]));
  db.sharedReg[sid] = reg;

  return clone(copy);
}

// ─── Unit groups / Torres ─────────────────────────────────────────────

export type UnitGroupInput = Omit<UnitGroup, "id">;

export async function listUnitGroups(): Promise<UnitGroup[]> {
  return clone(db.unitGroups);
}

export async function createUnitGroup(input: UnitGroupInput): Promise<UnitGroup> {
  const group: UnitGroup = { id: genId("ug"), ...clone(input) };
  db.unitGroups.push(group);
  return clone(group);
}

export async function updateUnitGroup(
  id: string,
  patch: Partial<UnitGroupInput>
): Promise<UnitGroup> {
  const group = db.unitGroups.find((g) => g.id === id);
  if (!group) throw new Error("Grupo de unidades não encontrado.");
  Object.assign(group, clone(patch));
  return clone(group);
}

export async function deleteUnitGroup(id: string): Promise<void> {
  const idx = db.unitGroups.findIndex((g) => g.id === id);
  if (idx === -1) throw new Error("Grupo de unidades não encontrado.");
  db.unitGroups.splice(idx, 1);
}

export async function listTorres(): Promise<string[]> {
  return clone(db.torres);
}

// ─── Versions ─────────────────────────────────────────────────────────

export interface VersionInput {
  summary: string;
  createdBy: string;
  changes: VersionChanges;
}

export async function listVersions(): Promise<BudgetVersion[]> {
  return clone(db.versions);
}

export async function createVersion(input: VersionInput): Promise<BudgetVersion> {
  const version: BudgetVersion = {
    id: genId("v"),
    label: `v${db.versions.length + 1}`,
    createdAt: nowBR().replace(" ", " às "),
    isCurrent: true,
    ...clone(input),
  };
  db.versions.forEach((v) => {
    v.isCurrent = false;
  });
  db.versions.unshift(version);
  return clone(version);
}

/** Marca a versão como atual (snapshot/restore real de estado é Fase 7, §12). */
export async function restoreVersion(id: string): Promise<BudgetVersion> {
  const version = db.versions.find((v) => v.id === id);
  if (!version) throw new Error("Versão não encontrada.");
  db.versions.forEach((v) => {
    v.isCurrent = v.id === id;
  });
  return clone(version);
}

// ─── Comments (rowKey = `${compId}-${optId}`) ─────────────────────────

export interface CommentInput {
  autor: Comment["autor"];
  texto: string;
}

export async function getComments(rowKey: string): Promise<Comment[]> {
  return clone(db.comments[rowKey] ?? []);
}

export async function appendComment(rowKey: string, input: CommentInput): Promise<Comment> {
  const comment: Comment = { ...clone(input), data: nowBR() };
  const thread = db.comments[rowKey];
  if (thread) thread.push(comment);
  else db.comments[rowKey] = [comment];
  return clone(comment);
}

// ─── Pending items ────────────────────────────────────────────────────

export async function listPendingItems(): Promise<string[]> {
  return clone(db.pendingItems);
}

export async function addPendingItem(key: string): Promise<void> {
  if (!db.pendingItems.includes(key)) db.pendingItems.push(key);
}

export async function removePendingItem(key: string): Promise<void> {
  db.pendingItems = db.pendingItems.filter((k) => k !== key);
}
