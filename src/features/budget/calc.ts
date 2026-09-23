// Orquestração de cálculo do Construtor de Preço — funções puras sobre o motor
// (calcBudgetRow/calcKitRow). A linha é uma OPÇÃO (Material = a aplicação de um
// BaseMaterial num componente); tudo que varia (valor unitário, quantidade, RT,
// unidade, fórmula da célula) sai do resolvedor em ./resolve.ts, que conhece a
// cadeia override → herança. Aqui só monta as chamadas e soma.
import {
  calcBudgetRow,
  calcKitRow,
  costItemAppliesTo,
  resolveSatellites,
  rowKey,
  type BudgetRowResult,
  type CostSatelliteResult,
  type KitRowResult,
  type PriceLookup,
  type RowOverrides,
} from "@/lib/budget";
import { normName } from "@/lib/formula";
import { getKit } from "@/lib/data/entities";
import { fmtBRL } from "@/lib/utils";
import {
  isBasePending,
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
  CostComponent,
  CostRegistro,
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

/** Preços dos BaseMaterials consultáveis pelo motor neste componente. */
export function priceLookup(deps: BudgetDeps, comp: Componente): PriceLookup {
  return priceLookupFor(deps, comp);
}

/**
 * Itens de custo "fixo" sem preço que se aplicam a uma opção. Um avulso só
 * derruba a sua opção; um item de escopo "todas" (materialOptionId null)
 * derruba todas. `optionId` null enumera os de escopo "todas" (uso no padrão).
 */
export function pendingCostItems(
  deps: BudgetDeps,
  comp: Componente,
  optionId: number | null
): CostComponent[] {
  return (comp.custoComponentes ?? []).filter((cc) => {
    if (cc.tipo !== "fixo") return false;
    if (!costItemAppliesTo(cc, optionId)) return false;
    if (cc.baseId == null) return true; // fixo sem material = mal configurado
    return isBasePending(deps.custosBase, cc.baseId);
  });
}

/**
 * A linha sai dos totais: ou a própria opção está sem custo, ou algum item de
 * custo "fixo" que se aplica a ESTA opção está — um avulso derruba só a sua
 * opção; um de escopo "todas", todas (mesmo critério do sub-item de kit).
 */
export function isOptionPending(
  deps: BudgetDeps,
  comp: Componente,
  opt: MaterialOption
): boolean {
  return pendingCostItems(deps, comp, opt.id).length > 0 || isOptionOwnPending(deps, opt);
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
  return resolveSatellites(comp, "padrao", valUnPad, priceLookup(deps, comp), comp.padrao);
}

/** Linha de registro resolvida para exibição (custo = valor unitário × qtd). */
export interface RegistroResult {
  registro: CostRegistro;
  valUn: number;
  line: number;
  pending: boolean;
}

/**
 * Linhas de custo avulsas (registro) do ambiente, já resolvidas. São só custo —
 * não entram em crédito/débito nem no total; a pendência é local à linha.
 */
export function ambienteRegistros(_deps: BudgetDeps, amb: Ambiente): RegistroResult[] {
  return (amb.registros ?? []).map((r) => ({
    registro: r,
    valUn: r.valorUnitario,
    line: r.valorUnitario * r.qtd,
    pending: r.valorUnitario <= 0,
  }));
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
        opt.id,
        comp.padrao,
        ovr,
        usaDC
      ),
    };
  }

  const result = calcBudgetRow(
    rowSideOf(deps, comp, opt),
    pad,
    comp,
    prices,
    deps.cols,
    opt.id,
    comp.padrao,
    ovr,
    usaDC
  );
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
