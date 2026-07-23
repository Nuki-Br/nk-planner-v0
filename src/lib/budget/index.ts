// Motor de cálculo do Construtor de Preço — puro (sem React/DOM/dados). No
// modelo normalizado, o CHAMADOR resolve as opções (padrão + upgrade) para suas
// entidades de catálogo e passa-as prontas; o kit traz seus sub-itens inline
// (KitItem) e a quantidade/pendência vêm da linha por planta. Pendência é
// derivada do custo (custo 0 = pendente), não mais de um Set externo.
//
// CONVENÇÃO ESTENDIDA (alinhada à planilha do cliente): todas as colunas
// monetárias já são o TOTAL da linha, não valores por unidade.
//   débito  = valor unitário do upgrade × qtd COM reserva técnica
//   crédito = valor unitário do padrão   × qtd SEM reserva técnica
//   custo de troca = débito − crédito                    (já estendido)
//   total final    = custo de troca + Σ colunas livres   (NÃO re-multiplica)
// A RT é perda extra do upgrade: o crédito é o material que a construtora
// deixaria de instalar, na quantidade líquida. Ver docs — decisão "crédito sem
// RT", extraída do Hall da planilha (padrão 2,25 m² × upgrade 3,375 m²).
import { evalCell, normName, type Scope } from "@/lib/formula";
import type {
  BudgetColumn,
  Componente,
  CostComponent,
  CostComponentSide,
  Kit,
  KitItem,
  Material,
} from "@/shared/types/domain";

export interface ColResult {
  value: number;
  error: string | null;
  /** true quando a célula usa override em vez da expressão padrão da coluna. */
  overridden: boolean;
}

/** colId (String(id)) → resultado da célula. */
export type ColResults = Record<string, ColResult>;

/** colId (String(id)) → expressão de override por célula. */
export type RowOverrides = Record<string, string>;

/** Campos comuns a toda linha de orçamento (material ou kit). */
export interface BaseRowResult {
  /** qtd * (1 + rt/100) — base do DÉBITO. */
  qtdComRT: number;
  /** R$/un. do upgrade (kit: total do kit) — exibição. */
  valUnUpg: number;
  /**
   * Débito do ITEM: valor unitário × qtd com RT. É `G51` na planilha — a coluna
   * "Déb./Créd." mostra ISTO, não o total com satélites: cada satélite tem sua
   * própria linha com seu próprio débito, e a soma acontece no custo de troca.
   */
  debitoItem: number;
  /** Crédito do ITEM padrão: valor unitário × qtd líquida (sem RT). */
  creditoItem: number;
  /** debitoItem + Σ satélites do lado upgrade. */
  debitoTotal: number;
  /** creditoItem + Σ satélites do lado padrão — o `H41` da planilha. */
  creditoTotal: number;
  /** debitoTotal − creditoTotal — JÁ estendido. É o `H51`. */
  custoDeTroca: number;
  /** Componentes de custo (satélites) resolvidos, dos dois lados. */
  satellites: CostSatelliteResult[];
  /**
   * Algum satélite "fixo" sem preço. A linha sai dos totais, mas o material da
   * OPÇÃO pode estar perfeitamente preenchido — quem exibe precisa distinguir,
   * senão acusa falta de custo em item que já tem.
   */
  satellitePending: boolean;
  colResults: ColResults;
  sumFree: number;
  /** custoDeTroca + sumFree — NÃO multiplica por qtdComRT. */
  total: number;
}

/** O que o motor precisa do Componente (mantém a assinatura livre de dados). */
export type CompCalcInput = Pick<
  Componente,
  "qtd" | "rt" | "custoComponentes"
>;

export interface BudgetRowResult extends BaseRowResult {
  /** R$/un. do padrão — exibição. */
  valUnPad: number;
}

/** Linha de um componente de custo já resolvida para uma opção. */
export interface CostSatelliteResult {
  item: CostComponent;
  /** Nome exibido: o do material (fixo) ou o do próprio satélite (espelho). */
  nome: string;
  qtd: number;
  valUn: number;
  /** valUn * qtd — já estendido. */
  line: number;
  pending: boolean;
}

/** Um item de custo se aplica a esta opção? Avulso → só à sua; null → todas. */
export function costItemAppliesTo(cc: CostComponent, optionId: number | null): boolean {
  return cc.materialOptionId == null || cc.materialOptionId === optionId;
}

/**
 * Resolve os componentes de custo de um lado, para UMA opção. `espelho` usa o
 * valor unitário da opção daquele lado (a de upgrade no débito, a padrão no
 * crédito); `fixo` usa o material de catálogo, igual para todas as opções.
 *
 * Só entram os itens que se aplicam à opção (`optionId`): avulso aparece só na
 * sua opção; item de escopo "todas" (materialOptionId null) aparece em todas.
 *
 * Um `fixo` sem custo (ou sem material) fica pendente — e como a linha entra no
 * débito da opção, derruba a linha (mesmo critério do sub-item de kit).
 */
export function resolveSatellites(
  comp: Pick<Componente, "custoComponentes">,
  lado: CostComponentSide,
  valUnEspelho: number,
  satelliteMats: ReadonlyMap<number, Material>,
  optionId: number | null
): CostSatelliteResult[] {
  const out: CostSatelliteResult[] = [];
  for (const cc of comp.custoComponentes ?? []) {
    if (cc.lado !== lado) continue;
    if (!costItemAppliesTo(cc, optionId)) continue;
    const fixo = cc.baseId != null ? satelliteMats.get(cc.baseId) : undefined;
    const valUn = cc.tipo === "espelho" ? valUnEspelho : fixo ? fixo.custoMat + fixo.custoMO : 0;
    out.push({
      item: cc,
      nome: cc.tipo === "fixo" && fixo ? fixo.nome : cc.nome,
      qtd: cc.qtd,
      valUn,
      line: valUn * cc.qtd,
      pending: cc.tipo === "fixo" && (!fixo || fixo.custoMat <= 0),
    });
  }
  return out;
}

const sumLines = (xs: CostSatelliteResult[]): number => xs.reduce((a, s) => a + s.line, 0);

export interface KitSubItemResult {
  item: KitItem;
  subQtd: number;
  valUn: number;
  line: number;
  pending: boolean;
}

export interface KitRowResult extends BaseRowResult {
  isKit: true;
  subItems: KitSubItemResult[];
  /** Algum sub-item do kit sem custo (distinto de satellitePending). */
  subItemPending: boolean;
}

/** rowKey de override/comentário: o id da opção (linha Material). */
export function rowKey(optionId: number): string {
  return String(optionId);
}

// Laço de colunas (esquerda → direita): cada uma avalia o override da célula ou
// a expressão padrão da coluna e injeta o resultado no scope, para que as
// colunas à direita possam referenciá-la pelo nome.
function runColumns(
  scope: Scope,
  cols: BudgetColumn[],
  rowOverrides: RowOverrides
): { colResults: ColResults; sumFree: number } {
  const colResults: ColResults = {};
  let sumFree = 0;
  for (const col of cols) {
    const cid = String(col.id);
    const override = rowOverrides[cid];
    const hasOvr = override != null;
    const expr = hasOvr ? override : col.expr || "";
    const ev = evalCell(expr, scope);
    colResults[cid] = { value: ev.value, error: ev.error, overridden: hasOvr };
    if (!ev.error) sumFree += ev.value;
    // Coluna com erro entra no scope como 0 — as dependentes seguem calculando.
    scope[normName(col.nome)] = ev.error ? 0 : ev.value;
  }
  return { colResults, sumFree };
}

/**
 * Escopo base das fórmulas — todos os valores JÁ estendidos (menos quantitativo).
 * `valor_unitario`/`debito` usam o TOTAL (item + satélites): uma taxa sobre o
 * valor instalado tem que cobrir a soleira e o rodapé também.
 */
function baseScope(
  r: Pick<BaseRowResult, "custoDeTroca" | "debitoTotal" | "creditoTotal" | "qtdComRT">
): Scope {
  return {
    custo_troca: r.custoDeTroca,
    valor_unitario: r.debitoTotal,
    quantitativo: r.qtdComRT,
    debito: r.debitoTotal,
    credito: r.creditoTotal,
  };
}

/**
 * Cálculo por linha (upgrade de MATERIAL). Recebe as entidades já resolvidas
 * (upgrade + padrão). Null quando falta padrão ou upgrade. A exclusão de itens
 * pendentes dos totais é contrato do CHAMADOR.
 */
export function calcBudgetRow(
  upgradeMat: Material | undefined,
  padraoMat: Material | undefined,
  comp: CompCalcInput,
  satelliteMats: ReadonlyMap<number, Material>,
  cols: BudgetColumn[],
  optionId: number | null,
  padraoOptionId: number | null,
  rowOverrides: RowOverrides = {}
): BudgetRowResult | null {
  if (!padraoMat || !upgradeMat) return null;
  const qtdComRT = comp.qtd * (1 + comp.rt / 100);
  const valUnUpg = upgradeMat.custoMat + upgradeMat.custoMO;
  const valUnPad = padraoMat.custoMat + padraoMat.custoMO;

  const satUpg = resolveSatellites(comp, "upgrade", valUnUpg, satelliteMats, optionId);
  const satPad = resolveSatellites(comp, "padrao", valUnPad, satelliteMats, padraoOptionId);
  const satellites = [...satUpg, ...satPad];

  const debitoItem = valUnUpg * qtdComRT;
  const creditoItem = valUnPad * comp.qtd; // crédito sem RT
  const debitoTotal = debitoItem + sumLines(satUpg);
  const creditoTotal = creditoItem + sumLines(satPad);
  const custoDeTroca = debitoTotal - creditoTotal;

  const scope = baseScope({ custoDeTroca, debitoTotal, creditoTotal, qtdComRT });
  const { colResults, sumFree } = runColumns(scope, cols, rowOverrides);

  return {
    qtdComRT,
    valUnUpg,
    valUnPad,
    debitoItem,
    creditoItem,
    debitoTotal,
    creditoTotal,
    custoDeTroca,
    satellites,
    satellitePending: satellites.some((s) => s.pending),
    colResults,
    sumFree,
    total: custoDeTroca + sumFree,
  };
}

/**
 * Cálculo por linha (upgrade de KIT): as colunas monetárias são a soma dos
 * sub-itens (quantitativos por planta em comp.kitQtds, keyed por KitItem id).
 */
export function calcKitRow(
  kit: Kit,
  comp: Componente,
  padraoMat: Material | undefined,
  satelliteMats: ReadonlyMap<number, Material>,
  cols: BudgetColumn[],
  optionId: number | null,
  padraoOptionId: number | null,
  rowOverrides: RowOverrides = {}
): KitRowResult {
  const qtds = comp.kitQtds ?? {};
  const subItems: KitSubItemResult[] = [];
  for (const item of kit.itens) {
    const subQtd = qtds[item.id] ?? 0;
    const valUn = item.custoMat + item.custoMO;
    const line = valUn * subQtd;
    const pending = item.custoMat <= 0;
    subItems.push({ item, subQtd, valUn, line, pending });
  }

  const qtdComRT = comp.qtd * (1 + comp.rt / 100);
  const kitTotal = subItems.reduce((a, s) => a + s.line, 0);
  const valUnPad = padraoMat ? padraoMat.custoMat + padraoMat.custoMO : 0;

  // Para um kit, o "espelho" acompanha o total do kit — não há valor unitário.
  const satUpg = resolveSatellites(comp, "upgrade", kitTotal, satelliteMats, optionId);
  const satPad = resolveSatellites(comp, "padrao", valUnPad, satelliteMats, padraoOptionId);
  const satellites = [...satUpg, ...satPad];

  // O débito do "item" de um kit é a soma dos sub-itens: eles SÃO o item.
  const debitoItem = kitTotal;
  const creditoItem = valUnPad * comp.qtd;
  const debitoTotal = debitoItem + sumLines(satUpg);
  const creditoTotal = creditoItem + sumLines(satPad);
  const custoDeTroca = debitoTotal - creditoTotal;

  const scope = baseScope({ custoDeTroca, debitoTotal, creditoTotal, qtdComRT });
  const { colResults, sumFree } = runColumns(scope, cols, rowOverrides);

  return {
    isKit: true,
    subItems,
    satellites,
    subItemPending: subItems.some((s) => s.pending),
    satellitePending: satellites.some((s) => s.pending),
    qtdComRT,
    valUnUpg: debitoItem,
    debitoItem,
    creditoItem,
    debitoTotal,
    creditoTotal,
    custoDeTroca,
    colResults,
    sumFree,
    total: custoDeTroca + sumFree,
  };
}

/**
 * Colunas cujo VALOR muda com a convenção estendida.
 *
 * Regra: uma coluna homogênea de grau 1 nos tokens (`=custo_troca * 8%`,
 * `=taxa_construtora * 2`) produz o mesmo total de antes — o fator distribui.
 * Já um LITERAL ADITIVO (`150`, `=custo_troca * 8% + 50`) muda de significado:
 * antes valia por unidade e era multiplicado pela quantidade no total; agora
 * vale para a linha inteira. Não há migração automática possível (não dá para
 * multiplicar um literal salvo por uma quantidade que varia por linha), então
 * o que resta é avisar.
 *
 * Heurística: número que não é fator multiplicativo (precedido de `*` ou `/`)
 * nem percentual (seguido de `%`).
 */
export function columnsAffectedByExtendedConvention(cols: BudgetColumn[]): BudgetColumn[] {
  return cols.filter((c) => hasAdditiveLiteral(c.expr));
}

function hasAdditiveLiteral(expr: string | null | undefined): boolean {
  const raw = String(expr ?? "").trim();
  if (raw === "") return false;
  const src = raw.startsWith("=") ? raw.slice(1) : raw;
  for (let i = 0; i < src.length; i++) {
    if (!/[0-9]/.test(src.charAt(i))) continue;
    // consome o número inteiro
    let j = i;
    while (j < src.length && /[0-9.,]/.test(src.charAt(j))) j++;
    const prev = src.slice(0, i).trimEnd().slice(-1);
    const next = src.slice(j).trimStart().charAt(0);
    const isFactor = prev === "*" || prev === "/";
    const isPercent = next === "%";
    if (!isFactor && !isPercent) return true;
    i = j - 1;
  }
  return false;
}
