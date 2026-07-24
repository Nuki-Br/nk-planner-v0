// Pendência ("sem custo") no canvas — derivada do custo base DO EMPREENDIMENTO,
// mesma semântica do motor (isOptionPending / isOptionOwnPending). O canvas é de
// um empreendimento, então recebe o mapa de custos dele; um material sem custo
// aqui pode estar precificado em outra obra, e isso é o esperado.
import { costItemAppliesTo } from "@/lib/budget";
import { getOptionEntity } from "@/lib/data/entities";
import { isBasePending } from "@/features/budget/resolve";
import type {
  Componente,
  CustosBase,
  Kit,
  KitItem,
  Material,
  MaterialOption,
} from "@/shared/types/domain";

/** Sub-item de kit pendente = sem custo de material no empreendimento. */
export function subitemPending(custosBase: CustosBase, item: KitItem): boolean {
  return isBasePending(custosBase, item.materialId);
}

/**
 * Componente de custo "fixo" sem preço que se aplica a esta opção. Espelha
 * isOptionPending do motor: um avulso derruba só a sua opção; um de escopo
 * "todas", todas. Sem isso o canvas mostraria como precificado o que o
 * orçamento exclui do total.
 */
export function costItemsPending(
  custosBase: CustosBase,
  comp: Pick<Componente, "custoComponentes">,
  optionId: number | null
): boolean {
  return (comp.custoComponentes ?? []).some((cc) => {
    if (cc.tipo !== "fixo") return false;
    if (!costItemAppliesTo(cc, optionId)) return false;
    if (cc.baseId == null) return true;
    return isBasePending(custosBase, cc.baseId);
  });
}

/**
 * Opção pendente: sem custo base no empreendimento, ou kit com algum sub-item
 * pendente. Um override de valor unitário na aba "Preço final" também resolve a
 * pendência, mas o canvas não carrega o rascunho — daí olhar só o custo base.
 */
export function optionPending(
  materiais: Material[],
  kits: Kit[],
  custosBase: CustosBase,
  opt: Pick<MaterialOption, "id" | "baseId" | "isKit">,
  comp?: Pick<Componente, "custoComponentes">
): boolean {
  if (comp && costItemsPending(custosBase, comp, opt.id)) return true;
  const ent = getOptionEntity(materiais, kits, opt);
  if (!ent) return false;
  return ent.isKit
    ? ent.itens.some((it) => subitemPending(custosBase, it))
    : isBasePending(custosBase, ent.id);
}
