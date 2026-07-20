// Modelo de domínio do Planner — realinhado ao schema relacional (API-aligned).
// O BANCO usa nomes PascalCase/ids Int (Enterprise/Blueprint/Room/RoomComponent/
// Material/BaseMaterial); estes tipos TS são a camada interna do app: mantêm os
// nomes de entidade do planner (Project/Tipologia/Ambiente/Componente/Material/
// Kit) e mudam só os SHAPES forçados pela normalização — ids numéricos, opções
// como linhas (não array polimórfico), quantidade por planta, custo no catálogo.
// Os mappers do store traduzem DB↔domínio. Custos em BRL (número; 0 = pendente).
import type { Unidade } from "@/shared/constants/unidades";

export type { Unidade } from "@/shared/constants/unidades";

// ─── Catálogo (BaseMaterial: single | kit) ──────────────────────────────

/** Categoria de material (MaterialCategory) — dinâmica, por Organization. */
export interface CategoriaCatalogo {
  id: number;
  nome: string;
  /** Chave de cor (CategoryColorKey); string no DTO, validada via toColorKey. */
  cor: string;
  /** Quantidade de materiais/kits usando a categoria ("N usos"). */
  usos: number;
}

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
  /** Nome da categoria ("" = sem categoria). */
  categoria: string;
  /** Custo de material (R$/unidade; 0 = pendente = custo NULL no banco). */
  custoMat: number;
  /** Custo de mão de obra (R$/unidade; 0 = pendente). */
  custoMO: number;
  /**
   * Imagem do material (BaseMaterial.ImagePreviewUrl / MediaFileId).
   * Opcional: MaterialInput = Omit<Material,"id"> e o import de CSV usa esse
   * mesmo tipo — exigir imagem quebraria a importação em lote.
   */
  imagem?: ImagemVinculada | null;
}

/** Kit do catálogo (BaseMaterial Type="kit"); custo = soma dos sub-itens. */
export interface Kit {
  id: number;
  codigo: string;
  nome: string;
  /** Nome da categoria ("" = sem categoria). */
  categoria: string;
  /** Sub-itens (composição). */
  itens: KitItem[];
}

/** Item de catálogo unificado (Material ou Kit) — para telas que listam ambos. */
export type CatalogEntity =
  | ({ isKit: false } & Material)
  | ({ isKit: true } & Kit);

// ─── Estrutura: Componente / Ambiente / Tipologia (por planta) ──────────

/** Como um componente de custo resolve seu preço unitário. */
export type CostComponentKind = "espelho" | "fixo";
/** Lado do cálculo: crédito (padrão) ou débito (toda opção de upgrade). */
export type CostComponentSide = "padrao" | "upgrade";

/**
 * Componente de custo ("satélite"): linha somada ao custo do componente que
 * NUNCA é ofertada ao cliente na personalização — SOLEIRA, RODAPÉ, RESERVA
 * TÉCNICA. Reproduz o agrupamento da planilha do cliente:
 *
 *   H51 = SUM(G51 + G52 + $G$57) − $H$41
 *          mestre  espelho  fixo    crédito do grupo
 *
 *  - "espelho": preço unitário = o da opção do SEU lado (a de upgrade, no lado
 *    upgrade; a padrão, no lado padrão). Quantidade e unidade próprias.
 *    Ex.: SOLEIRA acompanha o porcelanato escolhido.
 *  - "fixo": preço unitário = um BaseMaterial específico, igual para todas as
 *    opções — a referência ABSOLUTA da planilha. Ex.: RODAPÉ.
 *
 * Definição COMPARTILHADA (RoomComponentCostItem); a quantidade por planta vive
 * em Componente.custoQtds — mesmo split de options ⇄ kitQtds.
 */
export interface CostComponent {
  /** RoomComponentCostItem id. */
  id: number;
  nome: string;
  tipo: CostComponentKind;
  /** BaseMaterial quando tipo = "fixo"; null quando "espelho". */
  baseId: number | null;
  unidade: Unidade;
  lado: CostComponentSide;
  ordem: number;
}

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
  /** Componentes de custo (satélites) — definição compartilhada. */
  custoComponentes: CostComponent[];
  /** costComponentId → quantitativo do satélite, nesta planta. */
  custoQtds: Record<number, number>;
}

/** Posição de um ambiente na planta (rect/poly). */
export type RoomShape =
  | { type: "rect"; x: number; y: number; w: number; h: number }
  | { type: "poly"; pts: [number, number][] };

/** Imagem de uma entidade, vinda do media center (ou legada). */
export interface ImagemVinculada {
  name: string;
  url: string;
  /**
   * MediaFile vinculado. Ausente = URL legada (linha antiga, gravada antes do
   * media center). Opcional de propósito: o store resolve os dois casos via
   * resolveMediaUrl.
   */
  mediaFileId?: number;
}

/**
 * Ambiente (Room) resolvido para uma planta (via BlueprintRoom).
 *
 * Sem imagem: no Planner a única entidade com imagem é o Material. Imagem de
 * ambiente e de planta é assunto do Personaliza (ver docs/context/product.md).
 */
export interface Ambiente {
  /** Room id (compartilhado entre plantas). */
  id: number;
  /** BlueprintRoom id (a aparição do room NESTA planta). */
  blueprintRoomId: number;
  nome: string;
  componentes: Componente[];
  icon?: string;
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

/** Torre/bloco do empreendimento (Tower) — gerida na config base. */
export interface Torre {
  id: number;
  nome: string;
}

export interface UnitGroup {
  id: number;
  nome: string;
  /** Nome da torre ("" = sem torre) — o vínculo real é por FK no banco. */
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
  /** Nome exibível de quem comentou (usuário logado ou construtora); ausente em dados antigos. */
  autorNome?: string;
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

/** Empreendimento (Enterprise). */
export interface Project {
  id: number;
  nome: string;
  torre: string;
  incorporadora: string;
  status: ProjectStatus;
  enviadoEm: string | null;
  prazo: string | null;
  publicadoEm?: string | null;
  totalItens: number;
  itensPreenchidos: number;
  /** Fonte viva das taxas de formação de preço. */
  taxColumns?: BudgetColumn[];
}
