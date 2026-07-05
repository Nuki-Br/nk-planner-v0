// Modelo de domínio do Planner (fonte: docs/plano-mvp-funcional.md §6 +
// docs/prototype-src/data.js). Toda entidade ganha organizationId na Fase 10.
// Preços/custos em BRL (número decimal).
import type { Categoria } from "@/shared/constants/categorias";
import type { Unidade } from "@/shared/constants/unidades";

export type { Categoria } from "@/shared/constants/categorias";
export type { Unidade } from "@/shared/constants/unidades";

export interface Material {
  id: string;
  codigo: string;
  nome: string;
  fabricante: string;
  categoria: Categoria;
  unidade: Unidade;
  /** Custo de material (R$/unidade). */
  custoMat: number;
  /** Custo de mão de obra (R$/unidade). */
  custoMO: number;
}

/** Agrupa materiais avulsos; custo = soma dos sub-itens (sem custo próprio). */
export interface Kit {
  /** Sempre começa com "kit-" (ver isKitId em lib/data/entities). */
  id: string;
  tipo: "kit";
  codigo: string;
  nome: string;
  categoria: Categoria;
  /** Ids de Material. */
  itens: string[];
}

/** Ponto de personalização dentro de um ambiente. */
export interface Componente {
  id: string;
  nome: string;
  unidade: Unidade;
  qtd: number;
  /** Reserva técnica (%) → qtdComRT = qtd * (1 + rt/100). */
  rt: number;
  /** Id de Material/Kit padrão (crédito). */
  padrao: string | null;
  /** Ids de Material/Kit oferecidos como upgrade. */
  upgrades: string[];
  /** Override de taxa por componente — reservado (§6; sem shape definido ainda). */
  taxaEspecifica: null;
  /** Componente "fantasma". */
  ghost?: boolean;
  /** Ordem de renderização. */
  ordem?: number;
  /** kitId → (matId → quantitativo do sub-item). */
  kitQtds?: Record<string, Record<string, number>>;
}

/** Posição de um ambiente na planta (rect/poly) — reservado até haver plantas reais. */
export type RoomShape =
  | { type: "rect"; x: number; y: number; w: number; h: number }
  | { type: "poly"; pts: [number, number][] };

export interface AmbienteImagem {
  name: string;
  url: string;
}

/** "Room"; pode ser compartilhado entre tipologias (Fase 5 clona). */
export interface Ambiente {
  id: string;
  nome: string;
  componentes: Componente[];
  icon?: string;
  imagem?: AmbienteImagem | null;
  local?: RoomShape | null;
}

export type TipologiaStatus = "completa" | "incompleta";

/** "Blueprint" / planta. */
export interface Tipologia {
  id: string;
  nome: string;
  metragem: number;
  descricao: string;
  unidades: number;
  status: TipologiaStatus;
  ambientes: Ambiente[];
}

export interface UnitGroup {
  id: string;
  nome: string;
  torre: string;
  unidades: string[];
}

export type ColumnKind = "free" | "rowTotal" | "rowAvg";

/** Coluna configurável do Construtor de Preço. */
export interface BudgetColumn {
  id: string;
  nome: string;
  kind: ColumnKind;
  /** Expressão padrão da coluna: número fixo ou fórmula iniciada por "=". */
  expr: string;
  visivel: boolean;
}

export interface Comment {
  autor: "construtora" | "incorporadora";
  texto: string;
  /** "DD/MM/AAAA HH:mm" (string fixa no mock). */
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
  id: string;
  /** "v1", "v2"… */
  label: string;
  createdAt: string;
  createdBy: string;
  isCurrent: boolean;
  summary: string;
  changes: VersionChanges;
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

export interface Project {
  id: string;
  nome: string;
  torre: string;
  incorporadora: string;
  construtora: string;
  status: ProjectStatus;
  enviadoEm: string | null;
  prazo: string | null;
  totalItens: number;
  /** NOTA: o mock original trazia o typo "itensPrenchidos" (corrigido, §6). */
  itensPreenchidos: number;
  /** Data base INCC ("MM/AAAA"). */
  inccBase?: string;
  emailConstrutora?: string;
  /** Taxas globais legadas (compat com o protótipo; a fonte viva são as taxColumns). */
  taxas?: ProjectTaxas;
  taxColumns?: BudgetColumn[];
  /** Não usado pelo store mock — tipologias vivem na coleção flat (scoping na Fase 10). */
  tipologias?: Tipologia[];
}
