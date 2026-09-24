// Pendência ("sem custo") no canvas — derivada do custo base DO EMPREENDIMENTO,
// mesma semântica do motor (isOptionPending / isOptionOwnPending). O canvas é de
// um empreendimento, então recebe o mapa de custos dele; um material sem custo
// aqui pode estar precificado em outra obra, e isso é o esperado.
import { getOptionEntity } from "@/lib/data/entities";
import { isBasePending } from "@/features/budget/resolve";
import type { CustosBase, Kit, KitItem, Material, MaterialOption } from "@/shared/types/domain";

/** Sub-item de kit pendente = sem custo de material no empreendimento. */
export function subitemPending(custosBase: CustosBase, item: KitItem): boolean {
  return isBasePending(custosBase, item.materialId);
}

/**
 * Opção pendente: sem custo base no empreendimento (material sem cotação ou
 * insumo da composição sem preço), ou kit com algum sub-item pendente. Um
 * override de valor unitário na aba "Preço final" também resolve a pendência,
 * mas o canvas não carrega o rascunho — daí olhar só o custo base.
 */
export function optionPending(
  materiais: Material[],
  kits: Kit[],
  custosBase: CustosBase,
  opt: Pick<MaterialOption, "id" | "baseId" | "isKit">
): boolean {
  const ent = getOptionEntity(materiais, kits, opt);
  if (!ent) return false;
  return ent.isKit
    ? ent.itens.some((it) => subitemPending(custosBase, it))
    : isBasePending(custosBase, ent.id);
}
