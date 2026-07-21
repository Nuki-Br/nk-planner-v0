// Orquestração de cálculo do Construtor de Preço — funções puras sobre o motor
// (calcBudgetRow/calcKitRow). No modelo normalizado a linha é uma OPÇÃO
// (MaterialOption); o custo base preenchido na sessão sobrepõe o do catálogo
// (keyed por id de BaseMaterial); a pendência é derivada do custo (custo 0).
import {
  calcBudgetRow,
  calcKitRow,
  resolveSatellites,
  rowKey,
  type BudgetRowResult,
  type CostSatelliteResult,
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
  CostComponent,
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

/**
 * Materiais dos componentes de custo "fixo" deste componente, já com o custo
 * base da sessão aplicado — o motor recebe tudo resolvido.
 */
export function satelliteMats(deps: BudgetDeps, comp: Componente): Map<number, Material> {
  const out = new Map<number, Material>();
  for (const cc of comp.custoComponentes ?? []) {
    if (cc.tipo !== "fixo" || cc.baseId == null || out.has(cc.baseId)) continue;
    const m = getMaterial(deps.materiais, cc.baseId);
    if (m) out.set(cc.baseId, effMaterial(deps.baseCosts, m));
  }
  return out;
}

/** Itens de custo "fixo" do componente que estão sem preço. */
export function pendingCostItems(deps: BudgetDeps, comp: Componente): CostComponent[] {
  return (comp.custoComponentes ?? []).filter((cc) => {
    if (cc.tipo !== "fixo") return false;
    if (cc.baseId == null) return true; // fixo sem material = mal configurado
    const m = getMaterial(deps.materiais, cc.baseId);
    return !m || effCustoMat(deps.baseCosts, cc.baseId, m.custoMat) <= 0;
  });
}

/**
 * A OPÇÃO em si está sem custo (o material/kit dela).
 *
 * Distinto de isOptionPending: um item de custo sem preço também exclui a linha
 * dos totais, mas o material da opção pode estar preenchido. Quem monta a UI
 * precisa desta versão para não acusar "aguardando custo" — e não oferecer
 * "preencher custo base" — em item que já tem preço.
 */
export function isOptionOwnPending(deps: BudgetDeps, opt: MaterialOption): boolean {
  const ent = getOptionEntity(deps.materiais, deps.kits, opt);
  if (!ent) return false;
  if (ent.isKit) {
    return ent.itens.some((it) => effCustoMat(deps.baseCosts, it.materialId, it.custoMat) <= 0);
  }
  return effCustoMat(deps.baseCosts, ent.id, ent.custoMat) <= 0;
}

/**
 * A linha sai dos totais: ou a própria opção está sem custo, ou algum item de
 * custo "fixo" do componente está — essa linha entra no débito de TODA opção,
 * então derruba o componente inteiro (mesmo critério do sub-item de kit).
 */
export function isOptionPending(
  deps: BudgetDeps,
  comp: Componente,
  opt: MaterialOption
): boolean {
  return pendingCostItems(deps, comp).length > 0 || isOptionOwnPending(deps, opt);
}

/**
 * Satélites do lado PADRÃO já resolvidos — a linha de crédito da tabela precisa
 * deles para mostrar o crédito do grupo (H41 = SUM(G41:G44) da planilha).
 */
export function padraoSatellites(
  deps: BudgetDeps,
  comp: Componente,
  valUnPad: number
): CostSatelliteResult[] {
  return resolveSatellites(comp, "padrao", valUnPad, satelliteMats(deps, comp));
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
  const sats = satelliteMats(deps, comp);
  if (opt.isKit) {
    const kit = getKit(deps.kits, opt.baseId);
    if (!kit) return null;
    return {
      kind: "kit",
      result: calcKitRow(effKit(deps.baseCosts, kit), comp, padraoMat, sats, deps.cols, ovr),
    };
  }
  const upg = getMaterial(deps.materiais, opt.baseId);
  if (!upg) return null;
  const result = calcBudgetRow(
    effMaterial(deps.baseCosts, upg),
    padraoMat,
    comp,
    sats,
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
        if (r?.kind === "kit" && !r.result.subItemPending && !r.result.satellitePending)
          t += r.result.total;
        continue;
      }
      if (isOptionPending(deps, comp, opt)) continue;
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

// Descrições exibidas no autocomplete do editor de fórmula. Na convenção
// estendida todos os monetários já são o TOTAL da linha — a redação precisa
// dizer isso, senão o usuário escreve fórmula achando que é por unidade.
const FIXED_REF_DEFS = [
  { token: "custo_troca", desc: "Custo de troca (total da linha)" },
  { token: "valor_unitario", desc: "Débito estendido" },
  { token: "quantitativo", desc: "Qtd com RT" },
  { token: "debito", desc: "Débito estendido" },
  { token: "credito", desc: "Crédito do padrão (sem RT)" },
] as const;

/** Escopo + referências disponíveis para o editor de uma coluna (só as à esquerda). */
export function buildScopeRefs(
  cols: BudgetColumn[],
  r: BudgetRowResult | KitRowResult,
  colIdx: number
): { scope: Record<string, number>; refs: ScopeRef[] } {
  const scope: Record<string, number> = {
    custo_troca: r.custoDeTroca,
    valor_unitario: r.debitoTotal,
    quantitativo: r.qtdComRT,
    debito: r.debitoTotal,
    credito: r.creditoTotal,
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
