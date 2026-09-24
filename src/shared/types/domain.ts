// Modelo de domínio do Planner — realinhado ao schema relacional (API-aligned).
// O BANCO usa nomes PascalCase/ids Int (Enterprise/Blueprint/Room/RoomComponent/
// Material/BaseMaterial); estes tipos TS são a camada interna do app: mantêm os
// nomes de entidade do planner (Project/Tipologia/Ambiente/Componente/Material/
// Kit) e mudam só os SHAPES forçados pela normalização — ids numéricos, opções
// como linhas (não array polimórfico), quantidade por planta, custo por
// empreendimento. Os mappers do store traduzem DB↔domínio. Custos em BRL
// (número); pendência = custo de material NULL (ver CustoBase).
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
  /** BaseMaterial filho (o material do sub-item) — chave do custo base. */
  materialId: number;
  nome: string;
  fabricante: string;
  unidade: Unidade;
}

/**
 * Material avulso do catálogo (BaseMaterial Type="single") — TEMPLATE.
 *
 * Só identidade: o custo é do empreendimento (ver CustoBase), não do catálogo.
 * Um mesmo porcelanato custa diferente em obras diferentes.
 */
export interface Material {
  id: number;
  codigo: string;
  nome: string;
  fabricante: string;
  /** Nome da categoria ("" = sem categoria). */
  categoria: string;
  /**
   * Imagem do material (BaseMaterial.ImagePreviewUrl / MediaFileId).
   * Opcional: MaterialInput = Omit<Material,"id"> e o import de CSV usa esse
   * mesmo tipo — exigir imagem quebraria a importação em lote.
   */
  imagem?: ImagemVinculada | null;
}

// ─── Itens de custo (CostItem) e composição ─────────────────────────────

/**
 * Insumo de composição de custo (CostItem): material auxiliar, serviço/MO ou
 * frete que entra no custo base de um material. Catálogo da ORGANIZAÇÃO — só
 * identidade; o preço é por empreendimento (ver CostItemRow.preco).
 */
export interface CostItem {
  id: number;
  /** Código livre (o da planilha da construtora); null = sem código. */
  codigo: string | null;
  nome: string;
  unidade: Unidade;
}

/** Linha da aba "Itens de custo": insumo + preço NESTE empreendimento + uso. */
export interface CostItemRow extends CostItem {
  /** R$/unidade neste empreendimento; null = pendente. */
  preco: number | null;
  /** Quantos materiais do catálogo (org) usam o insumo na composição. */
  usos: number;
  /** Nomes dos primeiros materiais que usam (até 3), para a dica "usado em…". */
  usadoEm: string[];
}

/**
 * Linha da composição de um BaseMaterial (MaterialCompositionItem) já resolvida
 * para um empreendimento: identidade do insumo + coeficiente + preço de lá.
 */
export interface CompositionLine {
  /** MaterialCompositionItem id. */
  id: number;
  /** CostItem id. */
  itemId: number;
  codigo: string | null;
  nome: string;
  unidade: Unidade;
  /** Coeficiente por unidade do material (ex.: 8 kg de argamassa por m²). */
  qtd: number;
  /** Preço unitário do insumo neste empreendimento; null = pendente. */
  preco: number | null;
  ordem: number;
}

// ─── Custo base (EnterpriseMaterialCost + composição) ───────────────────

/**
 * Custo base de um BaseMaterial DENTRO de um empreendimento — compartilhado por
 * todas as aplicações dele ali. Uma aplicação pode sobrepor o valor final na
 * coluna "Valor un." do Construtor de Preço (ver MaterialPricing.valorUnitario).
 *
 *   total = custoMat × custoQtd + custoMO + Σ(linha.qtd × linha.preco)
 *
 * A fórmula (e a pendência) vive em shared/utils/custoBase.ts.
 */
export interface CustoBase {
  /** BaseMaterial (material avulso ou sub-item de kit). */
  baseId: number;
  /**
   * Custo de material (R$/unidade). `null` = pendente (nunca preenchido, NULL no
   * banco); `0` = "sem custo" marcado de propósito (ex.: padrão "Não entregue");
   * `> 0` = com custo. Só a ação "Sem custo" grava 0 — digitar 0 ou limpar o
   * campo volta a pendente, para um zero acidental não virar "grátis".
   */
  custoMat: number | null;
  /** Custo de mão de obra direto (R$/unidade; 0 = não informado). */
  custoMO: number;
  /**
   * Quantitativo do PRÓPRIO material na composição (BaseMaterial.CostQuantity,
   * catálogo): 1,2 = 20 % de quebra. 1 quando não há composição.
   */
  custoQtd: number;
  /** Linhas de insumo da composição (catálogo), com preço deste empreendimento. [] = custo "cheio". */
  composicao: CompositionLine[];
}

/** baseId → custo base do empreendimento. Ausente = nunca preenchido. */
export type CustosBase = Record<number, CustoBase>;

/** Linha da aba "Custos base": o custo + a identidade e onde é usado. */
export interface CustoBaseRow extends CustoBase {
  codigo: string;
  nome: string;
  fabricante: string;
  /** Nome da categoria ("" = sem categoria). */
  categoria: string;
  /** Unidade do material (BaseMaterial.Unit, senão a do 1º componente); null = desconhecida. */
  unidade: Unidade | null;
  /** Quantas aplicações no empreendimento dependem deste custo. */
  usos: number;
  /** Rótulos "Ambiente · Componente" das aplicações (para o subtítulo da linha). */
  usadoEm: string[];
  /** Aparece só como sub-item de kit, nunca como opção ofertada. */
  somenteIndireto: boolean;
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

// ─── Precificação: rascunho (MaterialPricing) × publicado (Material) ────

/**
 * Rascunho de precificação de UMA aplicação (Material). O usuário edita isto
 * livremente na aba "Preço final"; nada aqui afeta o preço publicado até o
 * "Publicar orçamento".
 *
 * Todo campo é um OVERRIDE: `null` = herda a fonte padrão (custo base do
 * empreendimento, qtd/RT da planta, unidade do componente, expressão da coluna).
 * Preenchido, vale em TODAS as tipologias que usam o ambiente — ambiente
 * compartilhado compartilha o preço (ver docs/features/pricing.md).
 */
export interface MaterialPricing {
  /** Sobrepõe o custo base final (custoMat + custoMO) desta aplicação (R$). */
  valorUnitario: number | null;
  /** Sobrepõe a quantidade da planta (Componente.qtd). */
  qtd: number | null;
  /** Sobrepõe a reserva técnica da planta (Componente.rt, em %). */
  rt: number | null;
  /** Sobrepõe a unidade do componente (Componente.unidade). */
  unidade: Unidade | null;
  /** colId (String(BudgetColumn.id)) → expressão de override da célula. */
  colunas: Record<string, string>;
}

/** Rascunho vazio — tudo herdado. Use em vez de espalhar literais. */
export const EMPTY_PRICING: MaterialPricing = {
  valorUnitario: null,
  qtd: null,
  rt: null,
  unidade: null,
  colunas: {},
};

/**
 * Valores RESOLVIDOS congelados na última publicação de uma aplicação. Não
 * derivam de mais nada: mexer no custo base depois de publicar não move o preço
 * publicado — é essa a garantia que separa rascunho de publicado.
 */
export interface PublishedPricing {
  /** "Total final" publicado (R$) — o preço que vale. */
  preco: number;
  /** Valor unitário efetivo no momento da publicação (R$). */
  valorUnitario: number;
  qtd: number;
  rt: number;
  unidade: Unidade;
  /** colId → nome e valor da coluna livre no momento da publicação. */
  colunas: Record<string, { nome: string; valor: number }>;
  /** "DD/MM/AAAA HH:mm". */
  publicadoEm: string;
  /** Rótulo da versão que congelou este preço ("v3"); "" se a versão sumiu. */
  versaoLabel: string;
}

/** Opção de material de um componente (linha Material; era item de upgrades[]). */
export interface MaterialOption {
  /** Material id (linha de opção). */
  id: number;
  /** BaseMaterial referenciado (resolve nome/identidade no catálogo). */
  baseId: number;
  /** É um kit? (BaseMaterial.Type === "kit") */
  isKit: boolean;
  isDefault: boolean;
  ordem: number;
  /** Rascunho de precificação. Nunca ausente — vazio = tudo herdado. */
  pricing: MaterialPricing;
  /** Última publicação desta aplicação; null = nunca publicada. */
  publicado: PublishedPricing | null;
}

// ─── Estrutura: Componente / Ambiente / Tipologia (por planta) ──────────

/**
 * Componente resolvido PARA UMA PLANTA: a paleta (opções + default) é
 * compartilhada (RoomComponent); a quantidade/RT vêm da instância por planta
 * (BlueprintRoomComponent).
 */
export interface Componente {
  /** RoomComponent id (paleta compartilhada). */
  id: number;
  nome: string;
  /** Unidade PADRÃO do componente — MaterialPricing.unidade sobrepõe por opção. */
  unidade: Unidade;
  /** BlueprintRoomComponent id (instância por planta) — alvo de qtd/RT/kitQtds. */
  instanceId: number;
  /** Quantidade nesta planta. Padrão: MaterialPricing.qtd sobrepõe por opção. */
  qtd: number;
  /** Reserva técnica (%) nesta planta → qtdComRT = qtd * (1 + rt/100). Padrão. */
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

/**
 * Metragem de um componente NESTA planta — a linha do "Editar metragens".
 * Quantidade e RT são por planta (BlueprintRoomComponent): mudar aqui não mexe
 * na mesma sala em outra tipologia.
 */
export interface MetragemInput {
  /** BlueprintRoom id (o ambiente nesta planta). */
  ambienteId: number;
  /** RoomComponent id. */
  componenteId: number;
  /** Quantidade líquida (sem RT). */
  qtd: number;
  /** Reserva técnica (%). */
  rt: number;
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
  /**
   * Unidades da planta — DERIVADO: números distintos (por torre) dos grupos de
   * unidades vinculados. Não é editável; muda vinculando/desvinculando grupos.
   */
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
  /** Tipologia (planta) das unidades do grupo; null = não vinculado. */
  tipologiaId: number | null;
}

/**
 * Coluna configurável do Construtor de Preço. Toda coluna é livre — a soma por
 * linha é a coluna fixa "Total final", não uma coluna configurável.
 */
export interface BudgetColumn {
  id: number;
  nome: string;
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

// ─── Diff rascunho × publicado (modal "Publicar orçamento" + badge) ─────

/** Uma linha que mudou desde a última publicação. */
export interface PricingDiffRow {
  /** Material id (a aplicação). */
  optionId: number;
  /** "Porcelanato Portobello 90×90" — a especificação. */
  especificacao: string;
  ambiente: string;
  componente: string;
  /** Preço publicado (R$); null quando a linha nunca foi publicada. */
  de: number | null;
  /**
   * Preço que será publicado (R$); null quando a linha saiu do orçamento
   * (opção removida) ou está pendente de custo e fica fora do cálculo.
   */
  para: number | null;
  tipo: "novo" | "alterado" | "removido";
}

/** Resultado da comparação de todo o empreendimento. */
export interface PricingDiff {
  rows: PricingDiffRow[];
  /**
   * Ambientes compartilhados por ≥2 tipologias com quantidades diferentes e sem
   * override de qtd: o preço publicado usa a qtd da primeira tipologia (menor
   * ordem). Texto pronto para exibição.
   */
  avisos: string[];
  /** Nenhuma linha jamais publicada — o badge vira "Nunca publicado". */
  nuncaPublicado: boolean;
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
  /**
   * Empreendimento usa o fluxo de débito/crédito na aba "Preço final"?
   * Ausente/true = sim (padrão). false = esconde a coluna "Déb./Créd." e o
   * "Custo troca" vira "Custo total" (só o débito, sem subtrair o crédito).
   */
  usaDebitoCredito?: boolean;
  /** Fonte viva das taxas de formação de preço. */
  taxColumns?: BudgetColumn[];
}
