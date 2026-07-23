// Pendência ("sem custo") no canvas — derivada do custo (custoMat <= 0), mesma
// semântica do motor (calcKitRow / isOptionPending). Sem mais Set externo.
import { costItemAppliesTo } from "@/lib/budget";
import { getMaterial, getOptionEntity } from "@/lib/data/entities";
import type {
  Componente,
  Kit,
  KitItem,
  Material,
  MaterialOption,
} from "@/shared/types/domain";

/** Sub-item de kit pendente = custo de material zerado. */
export function subitemPending(item: KitItem): boolean {
  return item.custoMat <= 0;
}

/**
 * Componente de custo "fixo" sem preço que se aplica a esta opção. Espelha
 * isOptionPending do motor: um avulso derruba só a sua opção; um de escopo
 * "todas", todas. Sem isso o canvas mostraria como precificado o que o
 * orçamento exclui do total.
 */
export function costItemsPending(
  materiais: Material[],
  comp: Pick<Componente, "custoComponentes">,
  optionId: number | null
): boolean {
  return (comp.custoComponentes ?? []).some((cc) => {
    if (cc.tipo !== "fixo") return false;
    if (!costItemAppliesTo(cc, optionId)) return false;
    if (cc.baseId == null) return true;
    const m = getMaterial(materiais, cc.baseId);
    return !m || m.custoMat <= 0;
  });
}

/** Opção pendente: material com custo 0, ou kit com algum sub-item pendente. */
export function optionPending(
  materiais: Material[],
  kits: Kit[],
  opt: Pick<MaterialOption, "id" | "baseId" | "isKit">,
  comp?: Pick<Componente, "custoComponentes">
): boolean {
  if (comp && costItemsPending(materiais, comp, opt.id)) return true;
  const ent = getOptionEntity(materiais, kits, opt);
  if (!ent) return false;
  return ent.isKit ? ent.itens.some(subitemPending) : ent.custoMat <= 0;
}
