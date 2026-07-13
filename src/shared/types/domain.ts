// Modelo de domínio do Planner — realinhado ao schema relacional (API-aligned).
// O BANCO usa nomes PascalCase/ids Int (Enterprise/Blueprint/Room/RoomComponent/
// Material/BaseMaterial); estes tipos TS são a camada interna do app: mantêm os
// nomes de entidade do planner (Project/Tipologia/Ambiente/Componente/Material/
// Kit) e mudam só os SHAPES forçados pela normalização — ids numéricos, opções
// como linhas (não array polimórfico), quantidade por planta, custo no catálogo.
// Os mappers do store traduzem DB↔domínio. Custos em BRL (número; 0 = pendente).
import type { Categoria } from "@/shared/constants/categorias";
import type { Unidade } from "@/shared/constants/unidades";

export type { Categoria } from "@/shared/constants/categorias";
export type { Unidade } from "@/shared/constants/unidades";

// ─── Catálogo (BaseMaterial: single | kit) ──────────────────────────────

/** Sub-item de um kit (composição de catálogo — MaterialKitItem). */
export interface KitItem {
  /** MaterialKitItem id. */
  id: number;
  /** BaseMaterial filho (o material do sub-item). */
  materialId: number;
  nome: string;
  fabricante: string;
  unidade: Unidade;
  /** Custo do sub-material (R$/unidade; 0 = pendente). */
  custoMat: number;
  custoMO: number;
}

/** Material avulso do catálogo (BaseMaterial Type="single"). */
export interface Material {
  id: number;
  codigo: string;
  nome: string;
  fabricante: string;
  categoria: Categoria;
  unidade: Unidade;
  /** Custo de material (R$/unidade; 0 = pendente = custo NULL no banco). */
  custoMat: number;
  /** Custo de mão de obra (R$/unidade; 0 = pendente). */
  custoMO: number;
}

/** Kit do catálogo (BaseMaterial Type="kit"); custo = soma dos sub-itens. */
export interface Kit {
  id: number;
  codigo: string;
  nome: string;
  categoria: Categoria;
  /** Sub-itens (composição). */
  itens: KitItem[];
}

/** Item de catálogo unificado (Material ou Kit) — para telas que listam ambos. */
export type CatalogEntity =
  | ({ isKit: false } & Material)
  | ({ isKit: true } & Kit);

// ─── Estrutura: Componente / Ambiente / Tipologia (por planta) ──────────

/** Opção de material de um componente (linha Material; era item de upgrades[]). */
export interface MaterialOption {
  /** Material id (linha de opção). */
  id: number;
  /** BaseMaterial referenciado (resolve custo/nome no catálogo). */
  baseId: number;
  /** É um kit? (BaseMaterial.Type === "kit") */
  isKit: boolean;
  isDefault: boolean;
  ordem: number;
}

/**
 * Componente resolvido PARA UMA PLANTA: a paleta (opções + default) é
 * compartilhada (RoomComponent); a quantidade/RT vêm da instância por planta
 * (BlueprintRoomComponent).
 */
export interface Componente {
  /** RoomComponent id (paleta compartilhada). */
  id: number;
  nome: string;
  unidade: Unidade;
  /** BlueprintRoomComponent id (instância por planta) — alvo de qtd/RT/kitQtds. */
  instanceId: number;
  /** Quantidade nesta planta. */
  qtd: number;
  /** Reserva técnica (%) nesta planta → qtdComRT = qtd * (1 + rt/100). */
  rt: number;
  /** Opção default (crédito) — Material option id. */
  padrao: number | null;
  /** Opções oferecidas (padrão + upgrades). */
  options: MaterialOption[];
  /** Componente "fantasma". */
  ghost: boolean;
  ordem: number;
  /** kitItemId → quantitativo do sub-item, nesta planta (era kitQtds). */
  kitQtds: Record<number, number>;
}

/** Posição de um ambiente na planta (rect/poly). */
export type RoomShape =
  | { type: "rect"; x: number; y: number; w: number; h: number }
  | { type: "poly"; pts: [number, number][] };

export interface AmbienteImagem {
  name: string;
  url: string;
}

/** Ambiente (Room) resolvido para uma planta (via BlueprintRoom). */
export interface Ambiente {
  /** Room id (compartilhado entre plantas). */
  id: number;
  /** BlueprintRoom id (a aparição do room NESTA planta). */
  blueprintRoomId: number;
  nome: string;
  componentes: Componente[];
  icon?: string;
  imagem?: AmbienteImagem | null;
  local?: RoomShape | null;
}

export type TipologiaStatus = "completa" | "incompleta";

/** Tipologia (Blueprint). */
export interface Tipologia {
  id: number;
  nome: string;
  metragem: number;
  descricao: string;
  unidades: number;
  status: TipologiaStatus;
  ambientes: Ambiente[];
}

export interface UnitGroup {
  id: number;
  nome: string;
  torre: string;
  unidades: string[];
}

export type ColumnKind = "free" | "rowTotal" | "rowAvg";

/** Coluna configurável do Construtor de Preço. */
export interface BudgetColumn {
  id: number;
  nome: string;
  kind: ColumnKind;
  /** Expressão padrão: número fixo ou fórmula iniciada por "=". */
  expr: string;
  visivel: boolean;
}

export interface Comment {
  autor: "construtora" | "incorporadora";
  texto: string;
  /** "DD/MM/AAAA HH:mm". */
  data: string;
}

export interface Change {
  tipo: "adicionado" | "alterado" | "removido";
  desc: string;
}

export interface VersionChanges {
  materiais: Change[];
  custos: Change[];
  taxas: Change[];
  tipologias: Change[];
}

export interface BudgetVersion {
  id: number;
  /** "v1", "v2"… */
  label: string;
  createdAt: string;
  createdBy: string;
  isCurrent: boolean;
  summary: string;
  changes: VersionChanges;
}

/** Campos que o terceiro pode preencher via link. */
export interface FillLinkCampos {
  mat: boolean;
  mo: boolean;
  comment: boolean;
}

/** Link tokenizado de preenchimento de custos. */
export interface FillLink {
  id: number;
  /** Segmento da URL /portal/[token]. */
  token: string;
  /** Blueprints (tipologias) liberados. */
  tipologiaIds: number[];
  campos: FillLinkCampos;
  prazo: string | null;
  senha: string | null;
  criadoEm: string;
}

/** Preenchimento do terceiro por material de catálogo (strings de input). */
export interface PortalFill {
  mat: string;
  mo: string;
  comment: string;
}

export type ProjectStatus =
  | "rascunho"
  | "em_preenchimento"
  | "em_revisao"
  | "publicado";

export interface ProjectTaxas {
  construtora: number;
  incc: number;
  incorporadora: number;
}

/** Empreendimento (Enterprise). */
export interface Project {
  id: number;
  nome: string;
  torre: string;
  incorporadora: string;
  construtora: string;
  status: ProjectStatus;
  enviadoEm: string | null;
  prazo: string | null;
  publicadoEm?: string | null;
  totalItens: number;
  itensPreenchidos: number;
  inccBase?: string;
  emailConstrutora?: string;
  /** Taxas globais legadas (fonte viva são as taxColumns). */
  taxas?: ProjectTaxas;
  taxColumns?: BudgetColumn[];
}
