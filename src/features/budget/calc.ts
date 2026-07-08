// Orquestração de cálculo do Construtor de Preço — funções puras sobre o
// motor da Fase 1 (calcBudgetRow/calcKitRow). Porte de budget-table.jsx
// (effMaterial/isBasePending/calcAnyRow/ambTotal/buildScopeRefs).
import {
  calcBudgetRow,
  calcKitRow,
  upgradeKey,
  type BudgetRowResult,
  type KitRowResult,
  type RowOverrides,
} from "@/lib/budget";
import { normName } from "@/lib/formula";
import { getKit, getMaterial, isKitId } from "@/lib/data/entities";
import { fmtBRL } from "@/lib/utils";
import type { Ambiente, BudgetColumn, Componente, Kit, Material } from "@/shared/types/domain";

/** Custos base preenchidos na tela (uid → {mat, mo} como strings de input). */
export type BaseCosts = Record<string, { mat: string; mo: string }>;
/** Overrides por célula: rowKey → colId → expressão. */
export type CellOverrides = Record<string, RowOverrides>;

export interface BudgetDeps {
  materiais: Material[];
  kits: Kit[];
  cols: BudgetColumn[];
  overrides: CellOverrides;
  baseCosts: BaseCosts;
  pendingSet: ReadonlySet<string>;
}

/** Material efetivo: custo base preenchido na tela sobrepõe o do catálogo. */
export function effMaterial(baseCosts: BaseCosts, uid: string, upgMat: Material): Material {
  const f = baseCosts[uid];
  if (f && parseFloat(f.mat) > 0) {
    return { ...upgMat, custoMat: parseFloat(f.mat) || 0, custoMO: parseFloat(f.mo) || 0 };
  }
  return upgMat;
}

/** Linha pendente: chave em PENDING_ITEMS e ainda sem custo base preenchido. */
export function isBasePending(
  pendingSet: ReadonlySet<string>,
  baseCosts: BaseCosts,
  rowKey: string,
  uid: string
): boolean {
  const f = baseCosts[uid];
  return pendingSet.has(rowKey) && !(f !== undefined && parseFloat(f.mat) > 0);
}

export type AnyRowResult =
  | { kind: "kit"; result: KitRowResult }
  | { kind: "material"; result: BudgetRowResult };

/** Cálculo unificado da linha: kit → calcKitRow; material → calcBudgetRow. */
export function calcAnyRow(
  deps: BudgetDeps,
  comp: Componente,
  uid: string,
  rowKey: string
): AnyRowResult | null {
  const resolve = (id: string) => getMaterial(deps.materiais, id);
  if (isKitId(uid)) {
    const kit = getKit(deps.kits, uid);
    if (!kit) return null;
    return {
      kind: "kit",
      result: calcKitRow(resolve, kit, comp, deps.cols, deps.overrides[rowKey] ?? {}, deps.pendingSet),
    };
  }
  const upgMat = getMaterial(deps.materiais, uid);
  if (!upgMat) return null;
  const eff = effMaterial(deps.baseCosts, uid, upgMat);
  const result = calcBudgetRow(
    resolve,
    eff,
    comp.padrao,
    comp.qtd,
    comp.rt,
    deps.cols,
    deps.overrides[rowKey] ?? {}
  );
  return result ? { kind: "material", result } : null;
}

/** Total do ambiente — pendências (chave ou sub-item de kit) ficam de fora. */
export function ambTotal(deps: BudgetDeps, amb: Ambiente): number {
  let t = 0;
  for (const comp of amb.componentes) {
    for (const uid of comp.upgrades) {
      const rowKey = upgradeKey(comp.id, uid);
      if (isKitId(uid)) {
        const r = calcAnyRow(deps, comp, uid, rowKey);
        if (r?.kind === "kit" && !r.result.anyPending) {
          t += r.result.total;
        }
        continue;
      }
      if (isBasePending(deps.pendingSet, deps.baseCosts, rowKey, uid)) continue;
      const r = calcAnyRow(deps, comp, uid, rowKey);
      if (r?.kind === "material") t += r.result.total;
    }
  }
  return t;
}

export interface ScopeRef {
  token: string;
  desc: string;
  value: number;
}

const FIXED_REF_DEFS = [
  { token: "custo_troca", desc: "Custo de troca (un.)" },
  { token: "valor_unitario", desc: "Valor unitário upgrade" },
  { token: "quantitativo", desc: "Qtd com RT" },
] as const;

/** Escopo + referências disponíveis para o editor de uma coluna (só as à esquerda). */
export function buildScopeRefs(
  cols: BudgetColumn[],
  r: BudgetRowResult | KitRowResult,
  colIdx: number
): { scope: Record<string, number>; refs: ScopeRef[] } {
  const scope: Record<string, number> = {
    custo_troca: r.custoDeTroca,
    valor_unitario: r.valUnUpg,
    quantitativo: r.qtdComRT,
  };
  const refs: ScopeRef[] = FIXED_REF_DEFS.map((f) => ({
    token: f.token,
    desc: f.desc,
    value: scope[f.token] ?? 0,
  }));
  for (let j = 0; j < colIdx; j++) {
    const cj = cols[j];
    if (!cj) continue;
    const cr = r.colResults[cj.id];
    const tok = normName(cj.nome);
    const v = cr && !cr.error ? cr.value : 0;
    scope[tok] = v;
    refs.push({ token: tok, desc: fmtBRL(v), value: v });
  }
  return { scope, refs };
}
