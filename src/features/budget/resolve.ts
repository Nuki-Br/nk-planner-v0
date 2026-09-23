// Resolvedor de precificação — a ÚNICA implementação da cadeia
// "override da aplicação → herança". Tela, motor de cálculo e publicação leem
// daqui, para que o preço mostrado, o preço somado e o preço publicado nunca
// divirjam. Puro: sem React/DOM/Prisma.
//
// A cadeia (ver docs/features/pricing.md):
//   valor unitário → MaterialPricing.valorUnitario ?? custo base do empreendimento
//   quantidade     → MaterialPricing.qtd           ?? quantidade da planta
//   reserva téc.   → MaterialPricing.rt            ?? RT da planta
//   unidade        → MaterialPricing.unidade       ?? unidade do componente
//   célula livre   → MaterialPricing.colunas[colId] ?? expressão da coluna
//
// Um override vale em TODAS as tipologias que usam o ambiente: ambiente
// compartilhado compartilha o preço (decisão de produto, não limitação).
import type { PriceLookup, PricedEntity, RowSide } from "@/lib/budget";
import { getKit, getMaterial } from "@/lib/data/entities";
import {
  EMPTY_PRICING,
  type Componente,
  type CustosBase,
  type Kit,
  type Material,
  type MaterialOption,
  type MaterialPricing,
  type Unidade,
} from "@/shared/types/domain";

/** optionId (Material id) → rascunho de precificação. */
export type PricingMap = Record<number, MaterialPricing>;

/** O que o resolvedor precisa saber para precificar qualquer linha. */
export interface ResolveDeps {
  /** Catálogo: identidade (nome/fabricante), nunca custo. */
  materiais: Material[];
  kits: Kit[];
  /** Custo base por BaseMaterial NESTE empreendimento. */
  custosBase: CustosBase;
  /** Rascunho por aplicação. Ausente = tudo herdado. */
  pricings: PricingMap;
}

/** Custo base efetivo de um BaseMaterial (material + mão de obra). Pendente conta 0. */
export function custoBaseOf(custosBase: CustosBase, baseId: number): number {
  const c = custosBase[baseId];
  return c ? (c.custoMat ?? 0) + c.custoMO : 0;
}

/**
 * "Pendente" é a AUSÊNCIA de custo de material (nunca preenchido), não do total:
 * um item com mão de obra preenchida e material vazio segue pendente. O "sem
 * custo" marcado (custoMat 0) NÃO é pendente — é um zero decidido.
 */
export function isBasePending(custosBase: CustosBase, baseId: number): boolean {
  const c = custosBase[baseId];
  return !c || c.custoMat === null;
}

/** Status do custo base para os selos: pendente, sem custo (0 marcado) ou preenchido. */
export function baseCostStatus(
  custosBase: CustosBase,
  baseId: number
): "pendente" | "sem_custo" | "preenchido" {
  const mat = custosBase[baseId]?.custoMat ?? null;
  if (mat === null) return "pendente";
  return mat === 0 ? "sem_custo" : "preenchido";
}

/** Rascunho de uma aplicação — nunca undefined, para o chamador não ramificar. */
export function pricingOf(deps: ResolveDeps, optionId: number): MaterialPricing {
  return deps.pricings[optionId] ?? EMPTY_PRICING;
}

/**
 * Valor unitário efetivo de uma OPÇÃO. O override vence o custo base; para kit
 * não existe valor unitário (é a soma dos sub-itens), então devolve 0 e quem
 * calcula kit usa o motor.
 */
export function valUnOf(deps: ResolveDeps, opt: MaterialOption): number {
  const ovr = pricingOf(deps, opt.id).valorUnitario;
  if (ovr != null) return ovr;
  if (opt.isKit) return 0;
  return custoBaseOf(deps.custosBase, opt.baseId);
}

/**
 * A opção está sem custo? Um override de valor unitário > 0 RESOLVE a pendência
 * — o usuário digitou o preço direto na tabela e não deve nada ao custo base.
 * Kit é pendente quando qualquer sub-item está.
 */
export function isOptionOwnPending(deps: ResolveDeps, opt: MaterialOption): boolean {
  const ovr = pricingOf(deps, opt.id).valorUnitario;
  if (ovr != null) return ovr <= 0;
  if (opt.isKit) {
    const kit = getKit(deps.kits, opt.baseId);
    if (!kit) return false;
    return kit.itens.some((it) => isBasePending(deps.custosBase, it.materialId));
  }
  return isBasePending(deps.custosBase, opt.baseId);
}

/** Quantidade efetiva (líquida, sem RT) de uma aplicação nesta planta. */
export function qtdOf(deps: ResolveDeps, comp: Componente, optionId: number): number {
  return pricingOf(deps, optionId).qtd ?? comp.qtd;
}

/** Reserva técnica efetiva (%) de uma aplicação nesta planta. */
export function rtOf(deps: ResolveDeps, comp: Componente, optionId: number): number {
  return pricingOf(deps, optionId).rt ?? comp.rt;
}

/** Unidade efetiva de uma aplicação. */
export function unidadeOf(deps: ResolveDeps, comp: Componente, optionId: number): Unidade {
  return pricingOf(deps, optionId).unidade ?? comp.unidade;
}

/** Lado do cálculo (upgrade ou padrão) com tudo resolvido, pronto p/ o motor. */
export function rowSideOf(deps: ResolveDeps, comp: Componente, opt: MaterialOption): RowSide {
  return {
    valUn: valUnOf(deps, opt),
    qtd: qtdOf(deps, comp, opt.id),
    rt: rtOf(deps, comp, opt.id),
    pending: isOptionOwnPending(deps, opt),
  };
}

/**
 * Preços dos BaseMaterials que o motor pode precisar consultar num componente:
 * os satélites "fixo" e os sub-itens dos kits ofertados. São endereçados por
 * BaseMaterial (não por aplicação), então não têm override — vêm sempre do
 * custo base do empreendimento.
 */
export function priceLookupFor(deps: ResolveDeps, comp: Componente): PriceLookup {
  const out = new Map<number, PricedEntity>();
  const add = (baseId: number) => {
    if (out.has(baseId)) return;
    const m = getMaterial(deps.materiais, baseId);
    out.set(baseId, {
      nome: m?.nome ?? "",
      valUn: custoBaseOf(deps.custosBase, baseId),
      pending: isBasePending(deps.custosBase, baseId),
    });
  };

  for (const cc of comp.custoComponentes ?? []) {
    if (cc.tipo === "fixo" && cc.baseId != null) add(cc.baseId);
  }
  for (const opt of comp.options) {
    if (!opt.isKit) continue;
    const kit = getKit(deps.kits, opt.baseId);
    for (const it of kit?.itens ?? []) add(it.materialId);
  }
  return out;
}
