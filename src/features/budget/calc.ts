// Orquestração de cálculo do Construtor de Preço — funções puras sobre o motor
// (calcBudgetRow/calcKitRow). A linha é uma OPÇÃO (Material = a aplicação de um
// BaseMaterial num componente); tudo que varia (valor unitário, quantidade, RT,
// unidade, fórmula da célula) sai do resolvedor em ./resolve.ts, que conhece a
// cadeia override → herança. Aqui só monta as chamadas e soma.
import {
  calcBudgetRow,
  calcKitRow,
  rowKey,
  type BudgetRowResult,
  type KitRowResult,
  type PriceLookup,
  type RowOverrides,
} from "@/lib/budget";
import { normName } from "@/lib/formula";
import { getKit } from "@/lib/data/entities";
import { fmtBRL } from "@/lib/utils";
import {
  isOptionOwnPending,
  priceLookupFor,
  pricingOf,
  qtdOf,
  rowSideOf,
  rtOf,
  type ResolveDeps,
} from "./resolve";
import type {
  Ambiente,
  BudgetColumn,
  Componente,
  MaterialOption,
  Tipologia,
} from "@/shared/types/domain";

export type { PricingMap } from "./resolve";
export {
  custoBaseOf,
  isBasePending,
  isOptionOwnPending,
  pricingOf,
  qtdOf,
  rtOf,
  unidadeOf,
  valUnOf,
} from "./resolve";

/**
 * Dependências de cálculo de uma tela/publicação. Tudo vem do servidor — não há
 * mais custo nem override em estado de sessão (antes `BaseCosts`/`CellOverrides`
 * viviam num useState e sumiam no reload).
 */
export interface BudgetDeps extends ResolveDeps {
  cols: BudgetColumn[];
  /** Empreendimento usa débito/crédito? Ausente = sim (comportamento padrão). */
  usaDebitoCredito?: boolean;
}

/** Overrides de célula da linha, na forma que o motor espera. */
function rowOverridesOf(deps: BudgetDeps, optionId: number): RowOverrides {
  return pricingOf(deps, optionId).colunas;
}

/** Preços dos BaseMaterials consultáveis pelo motor neste componente (sub-itens de kit). */
export function priceLookup(deps: BudgetDeps, comp: Componente): PriceLookup {
  return priceLookupFor(deps, comp);
}

/**
 * A linha sai dos totais quando a própria opção está sem custo: material sem
 * cotação, insumo da composição sem preço ou sub-item de kit pendente. Com a
 * composição dobrada no custo base, é o mesmo critério de isOptionOwnPending.
 */
export function isOptionPending(deps: BudgetDeps, opt: MaterialOption): boolean {
  return isOptionOwnPending(deps, opt);
}

export type AnyRowResult =
  | { kind: "kit"; result: KitRowResult }
  | { kind: "material"; result: BudgetRowResult };

/** Opção padrão (crédito) do componente — só conta se não for kit. */
function padraoOption(comp: Componente): MaterialOption | undefined {
  const def = comp.options.find((o) => o.id === comp.padrao);
  return def && !def.isKit ? def : undefined;
}

/** Cálculo unificado da linha (opção): kit → calcKitRow; material → calcBudgetRow. */
export function calcAnyRow(
  deps: BudgetDeps,
  comp: Componente,
  opt: MaterialOption
): AnyRowResult | null {
  const ovr = rowOverridesOf(deps, opt.id);
  const usaDC = deps.usaDebitoCredito ?? true;
  const def = padraoOption(comp);
  const pad = def ? rowSideOf(deps, comp, def) : null;
  const prices = priceLookup(deps, comp);

  if (opt.isKit) {
    const kit = getKit(deps.kits, opt.baseId);
    if (!kit) return null;
    return {
      kind: "kit",
      result: calcKitRow(
        kit,
        comp,
        { qtd: qtdOf(deps, comp, opt.id), rt: rtOf(deps, comp, opt.id) },
        pad,
        prices,
        deps.cols,
        ovr,
        usaDC
      ),
    };
  }

  const result = calcBudgetRow(rowSideOf(deps, comp, opt), pad, deps.cols, ovr, usaDC);
  return result ? { kind: "material", result } : null;
}

/** Componente com upgrades cujo material PADRÃO está pendente (sem custo preenchido). */
export interface PadraoPendente {
  compId: number;
  ambiente: string;
  componente: string;
}

/**
 * Padrões pendentes que afetam preço: o motor credita um padrão sem custo como
 * ZERO, então os upgrades do componente seriam publicados sem o desconto do
 * padrão. Com a ação "Sem custo" disponível (ex.: "Não entregue"), um padrão
 * pendente é quase sempre esquecimento — daí o aviso antes de publicar.
 *
 * Fica de fora: empreendimento sem débito/crédito (não há crédito a perder) e
 * componente sem upgrade (nada é publicado). De-duplicado por componente, que
 * é compartilhado entre as tipologias que usam o mesmo ambiente.
 */
export function padroesPendentes(
  deps: BudgetDeps,
  tipologias: readonly Tipologia[]
): PadraoPendente[] {
  if (deps.usaDebitoCredito === false) return [];
  const out = new Map<number, PadraoPendente>();
  for (const tip of tipologias) {
    for (const amb of tip.ambientes) {
      for (const comp of amb.componentes) {
        if (out.has(comp.id)) continue;
        const pad = comp.options.find((o) => o.isDefault);
        if (!pad || !comp.options.some((o) => !o.isDefault)) continue;
        if (isOptionOwnPending(deps, pad)) {
          out.set(comp.id, { compId: comp.id, ambiente: amb.nome, componente: comp.nome });
        }
      }
    }
  }
  return [...out.values()];
}

/** Total do ambiente — pendências (kit ou material) ficam de fora. */
export function ambTotal(deps: BudgetDeps, amb: Ambiente): number {
  let t = 0;
  for (const comp of amb.componentes) {
    for (const opt of comp.options) {
      if (opt.isDefault) continue;
      if (opt.isKit) {
        const r = calcAnyRow(deps, comp, opt);
        if (r?.kind === "kit" && !r.result.subItemPending) t += r.result.total;
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

/**
 * Mesmos tokens de `buildScopeRefs`, todos zerados — para o modal de coluna
 * quando a tipologia ainda não tem nenhuma linha calculável. Sem isso a prévia
 * acusaria "coluna não encontrada" em referências perfeitamente válidas.
 */
export function emptyScopeRefs(
  cols: BudgetColumn[],
  colIdx: number
): { scope: Record<string, number>; refs: ScopeRef[] } {
  const scope: Record<string, number> = {};
  const refs: ScopeRef[] = [];
  for (const f of FIXED_REF_DEFS) {
    scope[f.token] = 0;
    refs.push({ token: f.token, desc: f.desc, value: 0 });
  }
  for (let j = 0; j < colIdx; j++) {
    const cj = cols[j];
    if (!cj) continue;
    const tok = normName(cj.nome);
    scope[tok] = 0;
    refs.push({ token: tok, desc: fmtBRL(0), value: 0 });
  }
  return { scope, refs };
}

/** Reexport para quem monta chave de linha (comentários, overrides). */
export { rowKey };
