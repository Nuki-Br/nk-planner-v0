// Motor de cálculo do Construtor de Preço — porte fiel de
// docs/prototype-src/data.js (calcBudgetRow linhas 468-507, calcKitRow
// linhas 308-351). Puro: sem React/DOM. O resolver de materiais é injetado
// (o protótipo fechava sobre o global MATERIAIS); os legados calcPreco/
// calcPrecoV2 do mock foram descartados (código morto).
import { evalCell, normName, type Scope } from "@/lib/formula";
import type { BudgetColumn, Componente, Kit, Material } from "@/shared/types/domain";

/** Resolver injetado — o motor não importa a camada de dados. */
export type GetMaterial = (id: string) => Material | undefined;

export interface ColResult {
  value: number;
  error: string | null;
  /** true para colunas rowTotal/rowAvg (não editáveis). */
  computed: boolean;
  /** true quando a célula usa override em vez da expressão padrão da coluna. */
  overridden: boolean;
}

/** colId → resultado da célula. */
export type ColResults = Record<string, ColResult>;

/** colId → expressão de override por célula. */
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
  mat: Material;
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
  /** = kitMaterialTotal. */
  valUnUpg: number;
  custoDeTroca: number;
  colResults: ColResults;
  sumFree: number;
  /** custoDeTroca + sumFree — kit NÃO multiplica por qtdComRT (extensão já está nos sub-itens). */
  total: number;
}

/** Chave de upgrade em PENDING_ITEMS/COMMENTS: `${compId}-${optId}`. */
export function upgradeKey(compId: string, optId: string): string {
  return `${compId}-${optId}`;
}

/** Chave de sub-item de kit em PENDING_ITEMS: `${compId}-${kitId}-${matId}`. */
export function kitSubItemKey(compId: string, kitId: string, matId: string): string {
  return `${compId}-${kitId}-${matId}`;
}

// Laço de colunas comum aos dois cálculos (esquerda → direita):
//  - rowTotal/rowAvg → soma/média APENAS das colunas free à esquerda
//  - free → override da célula se houver, senão col.expr; avalia com evalCell
//    e injeta scope[normName(col.nome)] = value (0 em caso de erro)
function runColumns(
  scope: Scope,
  cols: BudgetColumn[],
  rowOverrides: RowOverrides
): { colResults: ColResults; sumFree: number } {
  const colResults: ColResults = {};
  const freeLeft: number[] = [];
  let sumFree = 0;
  for (const col of cols) {
    if (col.kind === "rowTotal" || col.kind === "rowAvg") {
      const sum = freeLeft.reduce((a, b) => a + b, 0);
      const val = col.kind === "rowAvg" ? (freeLeft.length ? sum / freeLeft.length : 0) : sum;
      colResults[col.id] = { value: val, error: null, computed: true, overridden: false };
      scope[normName(col.nome)] = val;
    } else {
      const override = rowOverrides[col.id];
      const hasOvr = override != null;
      const expr = hasOvr ? override : col.expr || "";
      const ev = evalCell(expr, scope);
      colResults[col.id] = { value: ev.value, error: ev.error, computed: false, overridden: hasOvr };
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
 * Cálculo por linha (upgrade de MATERIAL) com as colunas configuráveis.
 * Retorna null quando falta padrão ou upgrade. A exclusão de itens pendentes
 * dos totais é contrato do CHAMADOR (o motor não conhece pendência).
 */
export function calcBudgetRow(
  getMaterial: GetMaterial,
  upgradeMat: Material | undefined,
  padraoMatId: string | null,
  qtd: number,
  rt: number,
  cols: BudgetColumn[],
  rowOverrides: RowOverrides = {}
): BudgetRowResult | null {
  const padrao = padraoMatId != null ? getMaterial(padraoMatId) : undefined;
  if (!padrao || !upgradeMat) return null;
  const qtdComRT = qtd * (1 + rt / 100);
  const valUnUpg = upgradeMat.custoMat + upgradeMat.custoMO;
  const valUnPad = padrao.custoMat + padrao.custoMO;
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
 * Cálculo por linha (upgrade de KIT): as colunas monetárias do kit são a soma
 * dos sub-itens (quantitativos de comp.kitQtds); as colunas configuráveis
 * operam sobre o custo de troca agregado — já estendido pelos sub-itens, por
 * isso `total` NÃO multiplica por qtdComRT.
 */
export function calcKitRow(
  getMaterial: GetMaterial,
  kit: Kit,
  comp: Componente,
  cols: BudgetColumn[],
  rowOverrides: RowOverrides = {},
  pendingSet?: ReadonlySet<string>
): KitRowResult {
  const padrao = comp.padrao != null ? getMaterial(comp.padrao) : undefined;
  const qtds = comp.kitQtds?.[kit.id] ?? {};
  const subItems: KitSubItemResult[] = [];
  for (const mid of kit.itens) {
    const mat = getMaterial(mid);
    if (!mat) continue;
    const subQtd = qtds[mid] ?? 0;
    const valUn = mat.custoMat + mat.custoMO;
    const line = valUn * subQtd;
    const pending =
      (pendingSet?.has(kitSubItemKey(comp.id, kit.id, mid)) ?? false) || mat.custoMat <= 0;
    subItems.push({ mat, subQtd, valUn, line, pending });
  }

  const anyPending = subItems.some((s) => s.pending);
  const kitMaterialTotal = subItems.reduce((a, s) => a + s.line, 0);
  const qtdComRT = comp.qtd * (1 + comp.rt / 100);
  const padCredit = padrao ? (padrao.custoMat + padrao.custoMO) * qtdComRT : 0;
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
