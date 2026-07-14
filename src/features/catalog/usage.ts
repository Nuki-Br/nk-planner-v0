// "Onde é usado" — varre tipologias/ambientes/componentes procurando o id de
// catálogo (BaseMaterial) entre as opções dos componentes. A opção default é
// "Padrão"; as demais são "Upgrade". Ids em `number`.
import type { Tipologia } from "@/shared/types/domain";

export interface UsageRow {
  tip: string;
  amb: string;
  comp: string;
  fn: "Padrão" | "Upgrade";
}

export function getMaterialUsage(tipologias: readonly Tipologia[], id: number): UsageRow[] {
  const rows: UsageRow[] = [];
  for (const tip of tipologias) {
    for (const amb of tip.ambientes) {
      for (const comp of amb.componentes) {
        for (const opt of comp.options) {
          if (opt.baseId === id) {
            rows.push({
              tip: tip.nome,
              amb: amb.nome,
              comp: comp.nome,
              fn: opt.isDefault ? "Padrão" : "Upgrade",
            });
          }
        }
      }
    }
  }
  return rows;
}

/** Contagem de usos por id de catálogo (coluna "Uso") em uma única varredura. */
export function getUsageCounts(tipologias: readonly Tipologia[]): Map<number, number> {
  const counts = new Map<number, number>();
  const bump = (id: number) => counts.set(id, (counts.get(id) ?? 0) + 1);
  for (const tip of tipologias) {
    for (const amb of tip.ambientes) {
      for (const comp of amb.componentes) {
        for (const opt of comp.options) bump(opt.baseId);
      }
    }
  }
  return counts;
}
