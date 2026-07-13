// Orquestração de cálculo do Construtor de Preço — funções puras sobre o motor
// (calcBudgetRow/calcKitRow). No modelo normalizado a linha é uma OPÇÃO
// (MaterialOption); o custo base preenchido na sessão sobrepõe o do catálogo
// (keyed por id de BaseMaterial); a pendência é derivada do custo (custo 0).
import {
  calcBudgetRow,
  calcKitRow,
  rowKey,
  type BudgetRowResult,
  type KitRowResult,
  type RowOverrides,
} from "@/lib/budget";
import { normName } from "@/lib/formula";
import { getKit, getMaterial, getOptionEntity } from "@/lib/data/entities";
import { fmtBRL } from "@/lib/utils";
import type {
  Ambiente,
  BudgetColumn,
  Componente,
  Kit,
  Material,
  MaterialOption,
} from "@/shared/types/domain";

/** Custos base preenchidos na tela (baseMaterialId → {mat, mo} strings de input). */
export type BaseCosts = Record<number, { mat: string; mo: string }>;
/** Overrides por célula: rowKey (id da opção) → colId → expressão. */
export type CellOverrides = Record<string, RowOverrides>;

export interface BudgetDeps {
  materiais: Material[];
  kits: Kit[];
  cols: BudgetColumn[];
  overrides: CellOverrides;
  baseCosts: BaseCosts;
}

/** Custo de material efetivo (override da sessão sobrepõe o catálogo). */
export function effCustoMat(baseCosts: BaseCosts, baseId: number, custoMat: number): number {
  const f = baseCosts[baseId];
  if (f && parseFloat(f.mat) > 0) return parseFloat(f.mat) || 0;
  return custoMat;
}

/** Material com custo base da sessão aplicado. */
export function effMaterial(baseCosts: BaseCosts, mat: Material): Material {
  const f = baseCosts[mat.id];
  if (f && parseFloat(f.mat) > 0) {
    return { ...mat, custoMat: parseFloat(f.mat) || 0, custoMO: parseFloat(f.mo) || 0 };
  }
  return mat;
}

/** Kit com custo base da sessão aplicado nos sub-itens. */
function effKit(baseCosts: BaseCosts, kit: Kit): Kit {
  return {
    ...kit,
    itens: kit.itens.map((it) => {
      const f = baseCosts[it.materialId];
      if (f && parseFloat(f.mat) > 0) {
        return { ...it, custoMat: parseFloat(f.mat) || 0, custoMO: parseFloat(f.mo) || 0 };
      }
      return it;
    }),
  };
}

/** Uma opção está pendente quando o custo (efetivo) de material é <= 0. */
export function isOptionPending(deps: BudgetDeps, opt: MaterialOption): boolean {
  const ent = getOptionEntity(deps.materiais, deps.kits, opt);
  if (!ent) return false;
  if (ent.isKit) {
    return ent.itens.some((it) => effCustoMat(deps.baseCosts, it.materialId, it.custoMat) <= 0);
  }
  return effCustoMat(deps.baseCosts, ent.id, ent.custoMat) <= 0;
}

export type AnyRowResult =
  | { kind: "kit"; result: KitRowResult }
  | { kind: "material"; result: BudgetRowResult };

/** Material padrão (crédito) do componente — só conta se a opção default for Material. */
function padraoMaterial(deps: BudgetDeps, comp: Componente): Material | undefined {
  const def = comp.options.find((o) => o.id === comp.padrao);
  if (!def || def.isKit) return undefined;
  const mat = getMaterial(deps.materiais, def.baseId);
  return mat ? effMaterial(deps.baseCosts, mat) : undefined;
}

/** Cálculo unificado da linha (opção): kit → calcKitRow; material → calcBudgetRow. */
export function calcAnyRow(
  deps: BudgetDeps,
  comp: Componente,
  opt: MaterialOption
): AnyRowResult | null {
  const ovr = deps.overrides[rowKey(opt.id)] ?? {};
  const padraoMat = padraoMaterial(deps, comp);
  if (opt.isKit) {
    const kit = getKit(deps.kits, opt.baseId);
    if (!kit) return null;
    return {
      kind: "kit",
      result: calcKitRow(effKit(deps.baseCosts, kit), comp, padraoMat, deps.cols, ovr),
    };
  }
  const upg = getMaterial(deps.materiais, opt.baseId);
  if (!upg) return null;
  const result = calcBudgetRow(
    effMaterial(deps.baseCosts, upg),
    padraoMat,
    comp.qtd,
    comp.rt,
    deps.cols,
    ovr
  );
  return result ? { kind: "material", result } : null;
}

/** Total do ambiente — pendências (kit ou material) ficam de fora. */
export function ambTotal(deps: BudgetDeps, amb: Ambiente): number {
  let t = 0;
  for (const comp of amb.componentes) {
    for (const opt of comp.options) {
      if (opt.isDefault) continue;
      if (opt.isKit) {
        const r = calcAnyRow(deps, comp, opt);
        if (r?.kind === "kit" && !r.result.anyPending) t += r.result.total;
        continue;
      }
      if (isOptionPending(deps, opt)) continue;
      const r = calcAnyRow(deps, comp, opt);
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
    const cr = r.colResults[String(cj.id)];
    const tok = normName(cj.nome);
    const v = cr && !cr.error ? cr.value : 0;
    scope[tok] = v;
    refs.push({ token: tok, desc: fmtBRL(v), value: v });
  }
  return { scope, refs };
}
