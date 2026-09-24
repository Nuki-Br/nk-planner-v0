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
//   sub-item de kit → qtd gravada na planta ?? qtd do kit (mesma unidade) ?? pendente
//
// Um override vale em TODAS as tipologias que usam o ambiente: ambiente
// compartilhado compartilha o preço (decisão de produto, não limitação). A
// quantidade do sub-item de kit é a exceção: é quantitativo da PLANTA
// (MaterialKitUsage), como a qtd do componente.
import {
  kitCredit,
  materialCredit,
  type CreditSide,
  type KitSubItemSide,
  type RowSide,
} from "@/lib/budget";
import { getKit } from "@/lib/data/entities";
import {
  EMPTY_PRICING,
  type Componente,
  type CompositionLine,
  type CustosBase,
  type Kit,
  type KitItem,
  type Material,
  type MaterialOption,
  type MaterialPricing,
  type Unidade,
} from "@/shared/types/domain";
import {
  custoBasePendente,
  custoBaseStatus,
  custoBaseTotal,
  linhasPendentes,
  type CustoBaseStatus,
} from "@/shared/utils/custoBase";

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

/**
 * Custo base efetivo de um BaseMaterial: material × coeficiente + MO + composição
 * (fórmula em shared/utils/custoBase.ts). Pendente conta 0.
 */
export function custoBaseOf(custosBase: CustosBase, baseId: number): number {
  return custoBaseTotal(custosBase[baseId]);
}

/**
 * "Pendente" é a AUSÊNCIA de custo de material (nunca preenchido) ou de preço de
 * algum insumo da composição — não um total zero. O "sem custo" marcado
 * (custoMat 0) NÃO é pendente — é um zero decidido.
 */
export function isBasePending(custosBase: CustosBase, baseId: number): boolean {
  return custoBasePendente(custosBase[baseId]);
}

/** Status do custo base para os selos: pendente, sem custo (0 marcado) ou preenchido. */
export function baseCostStatus(custosBase: CustosBase, baseId: number): CustoBaseStatus {
  return custoBaseStatus(custosBase[baseId]);
}

/** Insumos da composição sem preço neste empreendimento (dica "insumo sem preço"). */
export function linhasPendentesOf(custosBase: CustosBase, baseId: number): CompositionLine[] {
  return linhasPendentes(custosBase[baseId]);
}

/** Rascunho de uma aplicação — nunca undefined, para o chamador não ramificar. */
export function pricingOf(deps: ResolveDeps, optionId: number): MaterialPricing {
  return deps.pricings[optionId] ?? EMPTY_PRICING;
}

/**
 * Valor unitário efetivo de uma OPÇÃO. O override vence o custo base; para kit
 * não existe valor unitário (é a soma dos sub-itens), então devolve 0 e quem
 * calcula kit usa o motor. Um override que sobrou num kit (a opção era um
 * material e foi trocada) é ignorado — a tela de kit não o mostra nem o limpa.
 */
export function valUnOf(deps: ResolveDeps, opt: MaterialOption): number {
  if (opt.isKit) return 0;
  const ovr = pricingOf(deps, opt.id).valorUnitario;
  if (ovr != null) return ovr;
  return custoBaseOf(deps.custosBase, opt.baseId);
}

/**
 * A opção está sem CUSTO? Um override de valor unitário > 0 RESOLVE a pendência
 * — o usuário digitou o preço direto na tabela e não deve nada ao custo base.
 * Kit é pendente quando qualquer sub-item está sem custo base; a pendência de
 * QUANTIDADE do kit é por planta e sai do motor (KitRowResult.qtdPendente).
 */
export function isOptionOwnPending(deps: ResolveDeps, opt: MaterialOption): boolean {
  if (opt.isKit) {
    const kit = getKit(deps.kits, opt.baseId);
    if (!kit) return false;
    return kit.itens.some((it) => isBasePending(deps.custosBase, it.materialId));
  }
  const ovr = pricingOf(deps, opt.id).valorUnitario;
  if (ovr != null) return ovr <= 0;
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

/** Quantidade de um sub-item de kit numa planta, e de onde ela veio. */
export interface KitItemQtd {
  /** Líquida (sem RT); null = pendente (não gravada e sem herança possível). */
  qtd: number | null;
  /** Veio do componente, não de uma gravação para o sub-item. */
  herdada: boolean;
}

/**
 * Quantidade líquida de um sub-item de kit NESTA planta:
 *   1. a gravada para o sub-item (MaterialKitUsage) — 0 é valor legítimo;
 *   2. senão, a quantidade base (a do componente) quando o sub-item usa a MESMA
 *      unidade — o porcelanato em m² de um Piso em m² herda a área, como um
 *      material avulso herdaria;
 *   3. senão, pendente — rodapé em ml ou soleira em und não têm de onde herdar.
 *
 * `base` é a quantidade/unidade da aplicação do kit (override ?? componente);
 * sem ela (canvas, que não carrega o rascunho) vale a do componente.
 */
export function kitItemQtd(
  comp: Pick<Componente, "kitQtds" | "qtd" | "unidade">,
  item: KitItem,
  base: { qtd: number; unidade: Unidade } = comp
): KitItemQtd {
  const gravada = comp.kitQtds[item.id];
  if (gravada !== undefined) return { qtd: gravada, herdada: false };
  if (item.unidade === base.unidade) return { qtd: base.qtd, herdada: true };
  return { qtd: null, herdada: false };
}

/**
 * Sub-itens de uma opção KIT resolvidos para o motor: preço do material filho
 * (custo base do empreendimento, composição inclusa — sem override, porque o
 * sub-item não é uma aplicação) e quantidade nesta planta. Null se o kit sumiu
 * do catálogo.
 */
export function kitSubItemsOf(
  deps: ResolveDeps,
  comp: Componente,
  opt: MaterialOption
): KitSubItemSide[] | null {
  const kit = getKit(deps.kits, opt.baseId);
  if (!kit) return null;
  const base = { qtd: qtdOf(deps, comp, opt.id), unidade: unidadeOf(deps, comp, opt.id) };
  return kit.itens.map((item) => ({
    item,
    ...kitItemQtd(comp, item, base),
    valUn: custoBaseOf(deps.custosBase, item.materialId),
    pending: isBasePending(deps.custosBase, item.materialId),
  }));
}

/**
 * Crédito do PADRÃO do componente, material ou kit, na quantidade líquida.
 * Null quando não há padrão — o motor decide o que isso significa.
 */
export function creditSideOf(deps: ResolveDeps, comp: Componente): CreditSide | null {
  const def = comp.options.find((o) => o.id === comp.padrao);
  if (!def) return null;
  if (!def.isKit) return materialCredit(rowSideOf(deps, comp, def));
  const subs = kitSubItemsOf(deps, comp, def);
  return subs ? kitCredit(subs) : null;
}
