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
  /** true para colunas rowTotal/rowAvg (não editáveis). */
  computed: boolean;
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
  /** Débito ESTENDIDO da linha. */
  debitoExt: number;
  /** Crédito ESTENDIDO do padrão (quantidade líquida, sem RT). */
  creditoExt: number;
  /** debitoExt − creditoExt — JÁ estendido. */
  custoDeTroca: number;
  /** Componentes de custo (satélites) resolvidos, dos dois lados. */
  satellites: CostSatelliteResult[];
  /** Algum satélite "fixo" sem custo → toda a linha fica pendente. */
  anyPending: boolean;
  colResults: ColResults;
  sumFree: number;
  /** custoDeTroca + sumFree — NÃO multiplica por qtdComRT. */
  total: number;
}

/** O que o motor precisa do Componente (mantém a assinatura livre de dados). */
export type CompCalcInput = Pick<
  Componente,
  "qtd" | "rt" | "custoComponentes" | "custoQtds"
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

/**
 * Resolve os componentes de custo de um lado. `espelho` usa o valor unitário da
 * opção daquele lado (a de upgrade no débito, a padrão no crédito); `fixo` usa
 * o material de catálogo, igual para todas as opções.
 *
 * Um `fixo` sem custo (ou sem material) fica pendente — e como a linha entra no
 * débito de TODA opção do componente, contamina o componente inteiro, mesmo
 * critério do sub-item de kit.
 */
export function resolveSatellites(
  comp: Pick<Componente, "custoComponentes" | "custoQtds">,
  lado: CostComponentSide,
  valUnEspelho: number,
  satelliteMats: ReadonlyMap<number, Material>
): CostSatelliteResult[] {
  const out: CostSatelliteResult[] = [];
  for (const cc of comp.custoComponentes ?? []) {
    if (cc.lado !== lado) continue;
    const qtd = comp.custoQtds?.[cc.id] ?? 0;
    const fixo = cc.baseId != null ? satelliteMats.get(cc.baseId) : undefined;
    const valUn = cc.tipo === "espelho" ? valUnEspelho : fixo ? fixo.custoMat + fixo.custoMO : 0;
    out.push({
      item: cc,
      nome: cc.tipo === "fixo" && fixo ? fixo.nome : cc.nome,
      qtd,
      valUn,
      line: valUn * qtd,
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
}

/** rowKey de override/comentário: o id da opção (linha Material). */
export function rowKey(optionId: number): string {
  return String(optionId);
}

// Laço de colunas (esquerda → direita): rowTotal/rowAvg somam/mediam as colunas
// free à esquerda; free avalia override-da-célula ou col.expr e injeta no scope.
function runColumns(
  scope: Scope,
  cols: BudgetColumn[],
  rowOverrides: RowOverrides
): { colResults: ColResults; sumFree: number } {
  const colResults: ColResults = {};
  const freeLeft: number[] = [];
  let sumFree = 0;
  for (const col of cols) {
    const cid = String(col.id);
    if (col.kind === "rowTotal" || col.kind === "rowAvg") {
      const sum = freeLeft.reduce((a, b) => a + b, 0);
      const val = col.kind === "rowAvg" ? (freeLeft.length ? sum / freeLeft.length : 0) : sum;
      colResults[cid] = { value: val, error: null, computed: true, overridden: false };
      scope[normName(col.nome)] = val;
    } else {
      const override = rowOverrides[cid];
      const hasOvr = override != null;
      const expr = hasOvr ? override : col.expr || "";
      const ev = evalCell(expr, scope);
      colResults[cid] = { value: ev.value, error: ev.error, computed: false, overridden: hasOvr };
      if (!ev.error) {
        sumFree += ev.value;
        freeLeft.push(ev.value);
        scope[normName(col.nome)] = ev.value;
      } else {
        scope[normName(col.nome)] = 0;
      }
    }
  }
  return { colResults, sumFree };
}

/** Escopo base das fórmulas — todos os valores JÁ estendidos (menos quantitativo). */
function baseScope(r: Pick<BaseRowResult, "custoDeTroca" | "debitoExt" | "creditoExt" | "qtdComRT">): Scope {
  return {
    custo_troca: r.custoDeTroca,
    valor_unitario: r.debitoExt,
    quantitativo: r.qtdComRT,
    debito: r.debitoExt,
    credito: r.creditoExt,
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
  rowOverrides: RowOverrides = {}
): BudgetRowResult | null {
  if (!padraoMat || !upgradeMat) return null;
  const qtdComRT = comp.qtd * (1 + comp.rt / 100);
  const valUnUpg = upgradeMat.custoMat + upgradeMat.custoMO;
  const valUnPad = padraoMat.custoMat + padraoMat.custoMO;

  const satUpg = resolveSatellites(comp, "upgrade", valUnUpg, satelliteMats);
  const satPad = resolveSatellites(comp, "padrao", valUnPad, satelliteMats);
  const satellites = [...satUpg, ...satPad];

  const debitoExt = valUnUpg * qtdComRT + sumLines(satUpg);
  const creditoExt = valUnPad * comp.qtd + sumLines(satPad); // crédito sem RT
  const custoDeTroca = debitoExt - creditoExt;

  const scope = baseScope({ custoDeTroca, debitoExt, creditoExt, qtdComRT });
  const { colResults, sumFree } = runColumns(scope, cols, rowOverrides);

  return {
    qtdComRT,
    valUnUpg,
    valUnPad,
    debitoExt,
    creditoExt,
    custoDeTroca,
    satellites,
    anyPending: satellites.some((s) => s.pending),
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
  const satUpg = resolveSatellites(comp, "upgrade", kitTotal, satelliteMats);
  const satPad = resolveSatellites(comp, "padrao", valUnPad, satelliteMats);
  const satellites = [...satUpg, ...satPad];

  const debitoExt = kitTotal + sumLines(satUpg);
  const creditoExt = valUnPad * comp.qtd + sumLines(satPad);
  const custoDeTroca = debitoExt - creditoExt;

  const scope = baseScope({ custoDeTroca, debitoExt, creditoExt, qtdComRT });
  const { colResults, sumFree } = runColumns(scope, cols, rowOverrides);

  return {
    isKit: true,
    subItems,
    satellites,
    anyPending: subItems.some((s) => s.pending) || satellites.some((s) => s.pending),
    qtdComRT,
    valUnUpg: debitoExt,
    debitoExt,
    creditoExt,
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
  return cols.filter((c) => c.kind === "free" && hasAdditiveLiteral(c.expr));
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
