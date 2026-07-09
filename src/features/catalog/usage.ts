// "Onde é usado" — varre tipologias/ambientes/componentes procurando o id
// como padrão ou upgrade (getMaterialUsage do protótipo). Funciona para
// materiais e kits (upgrades podem conter ids de kit).
import type { Tipologia } from "@/shared/types/domain";

export interface UsageRow {
  tip: string;
  amb: string;
  comp: string;
  fn: "Padrão" | "Upgrade";
}

export function getMaterialUsage(tipologias: readonly Tipologia[], id: string): UsageRow[] {
  const rows: UsageRow[] = [];
  for (const tip of tipologias) {
    for (const amb of tip.ambientes) {
      for (const comp of amb.componentes) {
        if (comp.padrao === id)
          rows.push({ tip: tip.nome, amb: amb.nome, comp: comp.nome, fn: "Padrão" });
        if (comp.upgrades.includes(id))
          rows.push({ tip: tip.nome, amb: amb.nome, comp: comp.nome, fn: "Upgrade" });
      }
    }
  }
  return rows;
}

/** Contagem de usos por id (coluna "Uso" da tabela) em uma única varredura. */
export function getUsageCounts(tipologias: readonly Tipologia[]): Map<string, number> {
  const counts = new Map<string, number>();
  const bump = (id: string) => counts.set(id, (counts.get(id) ?? 0) + 1);
  for (const tip of tipologias) {
    for (const amb of tip.ambientes) {
      for (const comp of amb.componentes) {
        if (comp.padrao !== null) bump(comp.padrao);
        for (const up of comp.upgrades) bump(up);
      }
    }
  }
  return counts;
}
