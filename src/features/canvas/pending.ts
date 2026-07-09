// Pendência ("sem custo") no canvas — mesma semântica do motor (calcKitRow):
// chave em PENDING_ITEMS ou custo de material zerado.
import { getKit, getMaterial, isKitId } from "@/lib/data/entities";
import type { Componente, Kit, Material } from "@/shared/types/domain";

export function subitemPending(
  materiais: Material[],
  pendingSet: ReadonlySet<string>,
  comp: Componente,
  kitId: string,
  mid: string
): boolean {
  const m = getMaterial(materiais, mid);
  return pendingSet.has(`${comp.id}-${kitId}-${mid}`) || !m || m.custoMat <= 0;
}

export function optionPending(
  materiais: Material[],
  kits: Kit[],
  pendingSet: ReadonlySet<string>,
  comp: Componente,
  optId: string
): boolean {
  if (isKitId(optId)) {
    const kit = getKit(kits, optId);
    if (!kit) return false;
    return kit.itens.some((mid) => subitemPending(materiais, pendingSet, comp, optId, mid));
  }
  const m = getMaterial(materiais, optId);
  return pendingSet.has(`${comp.id}-${optId}`) || !m || m.custoMat <= 0;
}
