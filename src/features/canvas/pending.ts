// Pendência ("sem custo") no canvas — derivada do custo (custoMat <= 0), mesma
// semântica do motor (calcKitRow / isOptionPending). Sem mais Set externo.
import { getOptionEntity } from "@/lib/data/entities";
import type { Kit, KitItem, Material, MaterialOption } from "@/shared/types/domain";

/** Sub-item de kit pendente = custo de material zerado. */
export function subitemPending(item: KitItem): boolean {
  return item.custoMat <= 0;
}

/** Opção pendente: material com custo 0, ou kit com algum sub-item pendente. */
export function optionPending(
  materiais: Material[],
  kits: Kit[],
  opt: Pick<MaterialOption, "baseId" | "isKit">
): boolean {
  const ent = getOptionEntity(materiais, kits, opt);
  if (!ent) return false;
  return ent.isKit ? ent.itens.some(subitemPending) : ent.custoMat <= 0;
}
