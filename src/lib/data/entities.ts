// Resolvedores de id de material/kit — funções puras sobre listas (o
// protótipo fechava sobre globals; aqui o chamador passa os dados, que na
// prática vêm dos hooks React Query). Load-bearing: a detecção de kit por
// prefixo de id é usada em toda a UI.
import type { Kit, Material } from "@/shared/types/domain";

export type Entity = (Material & { isKit: false }) | (Kit & { isKit: true });

/** Um id de kit sempre começa com "kit-". */
export function isKitId(id: string): boolean {
  return id.startsWith("kit-");
}

export function getMaterial(
  materiais: readonly Material[],
  id: string | null | undefined
): Material | undefined {
  if (id == null) return undefined;
  return materiais.find((m) => m.id === id);
}

export function getKit(kits: readonly Kit[], id: string): Kit | undefined {
  return kits.find((k) => k.id === id);
}

/** Resolve qualquer id para sua entidade, anotando se é kit. */
export function getEntity(
  materiais: readonly Material[],
  kits: readonly Kit[],
  id: string
): Entity | null {
  if (isKitId(id)) {
    const kit = getKit(kits, id);
    return kit ? { ...kit, isKit: true } : null;
  }
  const mat = getMaterial(materiais, id);
  return mat ? { ...mat, isKit: false } : null;
}
