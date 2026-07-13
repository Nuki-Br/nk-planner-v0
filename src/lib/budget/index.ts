// Motor de cálculo do Construtor de Preço — puro (sem React/DOM/dados). No
// modelo normalizado, o CHAMADOR resolve as opções (padrão + upgrade) para suas
// entidades de catálogo e passa-as prontas; o kit traz seus sub-itens inline
// (KitItem) e a quantidade/pendência vêm da linha por planta. Pendência é
// derivada do custo (custo 0 = pendente), não mais de um Set externo.
import { evalCell, normName, type Scope } from "@/lib/formula";
import type { BudgetColumn, Componente, Kit, KitItem, Material } from "@/shared/types/domain";

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

export interface BudgetRowResult {
  qtdComRT: number;
  valUnUpg: number;
  valUnPad: number;
  custoDeTroca: number;
  colResults: ColResults;
  sumFree: number;
  totalUnit: number;
  /** totalUnit * qtdComRT. */
  total: number;
}

export interface KitSubItemResult {
  item: KitItem;
  subQtd: number;
  valUn: number;
  line: number;
  pending: boolean;
}

export interface KitRowResult {
  isKit: true;
  subItems: KitSubItemResult[];
  anyPending: boolean;
  kitMaterialTotal: number;
  padCredit: number;
  qtdComRT: number;
  valUnUpg: number;
  custoDeTroca: number;
  colResults: ColResults;
  sumFree: number;
  /** custoDeTroca + sumFree — kit NÃO multiplica por qtdComRT. */
  total: number;
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

/**
 * Cálculo por linha (upgrade de MATERIAL). Recebe as entidades já resolvidas
 * (upgrade + padrão). Null quando falta padrão ou upgrade. A exclusão de itens
 * pendentes dos totais é contrato do CHAMADOR.
 */
export function calcBudgetRow(
  upgradeMat: Material | undefined,
  padraoMat: Material | undefined,
  qtd: number,
  rt: number,
  cols: BudgetColumn[],
  rowOverrides: RowOverrides = {}
): BudgetRowResult | null {
  if (!padraoMat || !upgradeMat) return null;
  const qtdComRT = qtd * (1 + rt / 100);
  const valUnUpg = upgradeMat.custoMat + upgradeMat.custoMO;
  const valUnPad = padraoMat.custoMat + padraoMat.custoMO;
  const custoDeTroca = valUnUpg - valUnPad;

  const scope: Scope = {
    custo_troca: custoDeTroca,
    valor_unitario: valUnUpg,
    quantitativo: qtdComRT,
  };
  const { colResults, sumFree } = runColumns(scope, cols, rowOverrides);

  const totalUnit = custoDeTroca + sumFree;
  const total = totalUnit * qtdComRT;
  return { qtdComRT, valUnUpg, valUnPad, custoDeTroca, colResults, sumFree, totalUnit, total };
}

/**
 * Cálculo por linha (upgrade de KIT): as colunas monetárias são a soma dos
 * sub-itens (quantitativos por planta em comp.kitQtds, keyed por KitItem id);
 * `total` NÃO multiplica por qtdComRT (extensão já está nos sub-itens).
 */
export function calcKitRow(
  kit: Kit,
  comp: Componente,
  padraoMat: Material | undefined,
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

  const anyPending = subItems.some((s) => s.pending);
  const kitMaterialTotal = subItems.reduce((a, s) => a + s.line, 0);
  const qtdComRT = comp.qtd * (1 + comp.rt / 100);
  const padCredit = padraoMat ? (padraoMat.custoMat + padraoMat.custoMO) * qtdComRT : 0;
  const custoDeTroca = kitMaterialTotal - padCredit;

  const scope: Scope = {
    custo_troca: custoDeTroca,
    valor_unitario: kitMaterialTotal,
    quantitativo: qtdComRT,
  };
  const { colResults, sumFree } = runColumns(scope, cols, rowOverrides);

  const total = custoDeTroca + sumFree;
  return {
    isKit: true,
    subItems,
    anyPending,
    kitMaterialTotal,
    padCredit,
    qtdComRT,
    valUnUpg: kitMaterialTotal,
    custoDeTroca,
    colResults,
    sumFree,
    total,
  };
}
