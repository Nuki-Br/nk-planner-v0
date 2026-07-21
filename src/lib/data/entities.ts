// Resolvedores de catálogo — funções puras sobre listas (os dados vêm dos
// hooks React Query). No modelo normalizado, kit-ness é um atributo da entidade
// (Kit vs Material) / da opção, não mais um prefixo de id.
import type { CatalogEntity, Kit, Material, MaterialOption } from "@/shared/types/domain";

/** Alias histórico — a união canônica é CatalogEntity em shared/types/domain. */
export type Entity = CatalogEntity;

export function getMaterial(
  materiais: readonly Material[],
  id: number | null | undefined
): Material | undefined {
  if (id == null) return undefined;
  return materiais.find((m) => m.id === id);
}

export function getKit(
  kits: readonly Kit[],
  id: number | null | undefined
): Kit | undefined {
  if (id == null) return undefined;
  return kits.find((k) => k.id === id);
}

/** Resolve uma opção de material (baseId + isKit) para sua entidade de catálogo. */
export function getOptionEntity(
  materiais: readonly Material[],
  kits: readonly Kit[],
  opt: Pick<MaterialOption, "baseId" | "isKit">
): Entity | null {
  if (opt.isKit) {
    const kit = getKit(kits, opt.baseId);
    return kit ? { ...kit, isKit: true } : null;
  }
  const mat = getMaterial(materiais, opt.baseId);
  return mat ? { ...mat, isKit: false } : null;
}
