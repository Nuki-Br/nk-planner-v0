// Motor de cálculo do Construtor de Preço — puro (sem React/DOM/dados). O
// CHAMADOR resolve TUDO antes de chamar: valor unitário efetivo, quantidade e
// reserva técnica de cada lado (RowSide) e o preço de cada BaseMaterial
// referenciado (PricedEntity). O motor não conhece catálogo, custo base do
// empreendimento nem override de aplicação — só aritmética e fórmulas. Ver
// features/budget/resolve.ts para a cadeia de resolução.
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
import type { BudgetColumn, Componente, Kit, KitItem } from "@/shared/types/domain";

/**
 * Um BaseMaterial já precificado para o motor. `valUn` é o custo unitário
 * EFETIVO (custo base do empreendimento, ou o override da aplicação) — o motor
 * nunca soma material + mão de obra, isso é da alçada do resolvedor.
 */
export interface PricedEntity {
  nome: string;
  /** R$/unidade efetivo. */
  valUn: number;
  /** Sem custo preenchido → a linha sai dos totais. */
  pending: boolean;
}

/** baseId (BaseMaterial) → preço efetivo. */
export type PriceLookup = ReadonlyMap<number, PricedEntity>;

/**
 * Um lado do cálculo (upgrade ou padrão) com tudo resolvido. Quantidade e RT
 * são POR LADO porque cada aplicação pode sobrepor as suas — o padrão e o
 * upgrade de um mesmo componente não precisam mais compartilhar quantitativo.
 */
export interface RowSide {
  /** R$/unidade efetivo. */
  valUn: number;
  /** Quantidade efetiva (líquida, sem RT). */
  qtd: number;
  /** Reserva técnica efetiva (%). */
  rt: number;
  /** Sem custo preenchido. */
  pending: boolean;
}

/** Lado de um KIT: o valor unitário é a soma dos sub-itens, não um campo. */
export type KitSide = Pick<RowSide, "qtd" | "rt">;

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
   * Débito do ITEM: valor unitário × qtd com RT. É `G51` na planilha. O valor
   * unitário já traz a composição do material (custo base do empreendimento),
   * então não há mais nada a somar por fora.
   */
  debitoItem: number;
  /** Crédito do ITEM padrão: valor unitário × qtd líquida (sem RT). */
  creditoItem: number;
  /** Débito da linha (= debitoItem). É o que a coluna "Déb./Créd." exibe. */
  debitoTotal: number;
  /** Crédito da linha (= creditoItem) — o `H41` da planilha. */
  creditoTotal: number;
  /** debitoTotal − creditoTotal — JÁ estendido. É o `H51`. */
  custoDeTroca: number;
  colResults: ColResults;
  sumFree: number;
  /** custoDeTroca + sumFree — NÃO multiplica por qtdComRT. */
  total: number;
}

export interface BudgetRowResult extends BaseRowResult {
  /** R$/un. do padrão — exibição. */
  valUnPad: number;
}

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
  /** Algum sub-item do kit sem custo — a linha sai dos totais. */
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
 * `valor_unitario`/`debito` são o débito estendido da linha: uma taxa sobre o
 * valor instalado incide sobre o custo completo (composição inclusa).
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
 * Cálculo por linha (upgrade de MATERIAL). Recebe os dois lados já resolvidos —
 * valor unitário, quantidade e RT efetivos de cada um. Null quando falta o lado
 * padrão. A exclusão de itens pendentes dos totais é contrato do CHAMADOR.
 */
export function calcBudgetRow(
  upg: RowSide,
  pad: RowSide | null,
  cols: BudgetColumn[],
  rowOverrides: RowOverrides = {},
  // Empreendimentos que não usam débito/crédito zeram o lado do crédito: o
  // "Custo total" vira só o débito estendido, sem subtrair o padrão.
  usaDebitoCredito = true
): BudgetRowResult | null {
  if (!pad) return null;
  const qtdComRT = upg.qtd * (1 + upg.rt / 100);
  const valUnUpg = upg.valUn;
  const valUnPad = pad.valUn;

  const debitoItem = valUnUpg * qtdComRT;
  // Crédito sem RT e na quantidade DO PADRÃO: a reserva técnica é perda extra do
  // upgrade, e o padrão pode ter quantitativo próprio (override da aplicação).
  const creditoItem = usaDebitoCredito ? valUnPad * pad.qtd : 0;
  const debitoTotal = debitoItem;
  const creditoTotal = creditoItem;
  const custoDeTroca = trocaNaoNegativa(debitoTotal, creditoTotal);

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
    colResults,
    sumFree,
    total: precoNaoNegativo(custoDeTroca, sumFree),
  };
}

/**
 * Cálculo por linha (upgrade de KIT): as colunas monetárias são a soma dos
 * sub-itens (quantitativos por planta em comp.kitQtds, keyed por KitItem id).
 */
export function calcKitRow(
  kit: Kit,
  comp: Pick<Componente, "kitQtds">,
  upg: KitSide,
  pad: RowSide | null,
  prices: PriceLookup,
  cols: BudgetColumn[],
  rowOverrides: RowOverrides = {},
  usaDebitoCredito = true
): KitRowResult {
  const qtds = comp.kitQtds ?? {};
  const subItems: KitSubItemResult[] = [];
  for (const item of kit.itens) {
    const subQtd = qtds[item.id] ?? 0;
    const priced = prices.get(item.materialId);
    const valUn = priced?.valUn ?? 0;
    const line = valUn * subQtd;
    subItems.push({ item, subQtd, valUn, line, pending: !priced || priced.pending });
  }

  const qtdComRT = upg.qtd * (1 + upg.rt / 100);
  const kitTotal = subItems.reduce((a, s) => a + s.line, 0);
  const valUnPad = pad?.valUn ?? 0;

  // O débito do "item" de um kit é a soma dos sub-itens: eles SÃO o item.
  const debitoItem = kitTotal;
  const creditoItem = usaDebitoCredito && pad ? valUnPad * pad.qtd : 0;
  const debitoTotal = debitoItem;
  const creditoTotal = creditoItem;
  const custoDeTroca = trocaNaoNegativa(debitoTotal, creditoTotal);

  const scope = baseScope({ custoDeTroca, debitoTotal, creditoTotal, qtdComRT });
  const { colResults, sumFree } = runColumns(scope, cols, rowOverrides);

  return {
    isKit: true,
    subItems,
    subItemPending: subItems.some((s) => s.pending),
    qtdComRT,
    valUnUpg: debitoItem,
    debitoItem,
    creditoItem,
    debitoTotal,
    creditoTotal,
    custoDeTroca,
    colResults,
    sumFree,
    total: precoNaoNegativo(custoDeTroca, sumFree),
  };
}

/**
 * Upgrade nunca sai mais barato que o padrão: o crédito abate no máximo o
 * débito. Sem isso, um upgrade de custo menor (ou "sem custo") que o padrão
 * viraria preço negativo — dinheiro devolvido ao cliente —, e as colunas
 * percentuais sobre `custo_troca` também sairiam negativas.
 */
function trocaNaoNegativa(debitoTotal: number, creditoTotal: number): number {
  return Math.max(0, debitoTotal - creditoTotal);
}

/**
 * Trava final do preço em zero: cobre colunas livres cuja fórmula não parte de
 * `custo_troca` (ex.: `= debito - credito`) e poderiam negativar a linha.
 */
function precoNaoNegativo(custoDeTroca: number, sumFree: number): number {
  return Math.max(0, custoDeTroca + sumFree);
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
