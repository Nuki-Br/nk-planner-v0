// Projeção de sub-itens de kit e componentes de custo na forma comum de
// sub-linha (SubRowCells). Kit e satélite são IRMÃOS em profundidade 1 sob a
// linha mestre — a ordem é [sub-itens do kit, satélites], e o `isLast` do
// conector em árvore é calculado sobre a CONCATENAÇÃO.
import type { CostSatelliteResult, KitSubItemResult } from "@/lib/budget";
import type { CostComponentSide } from "@/shared/types/domain";

import type { SubRowCells } from "./components/SubRow";

export function kitSubRow(s: KitSubItemResult): SubRowCells {
  return {
    key: `kit-${s.item.id}`,
    nome: s.item.nome,
    sub: s.item.fabricante,
    qtd: s.subQtd,
    unidade: s.item.unidade,
    valUn: s.valUn,
    line: s.line,
    pending: s.pending,
  };
}

export function satelliteSubRow(s: CostSatelliteResult): SubRowCells {
  return {
    key: `cc-${s.item.id}`,
    nome: s.item.nome,
    // "espelho" não tem material próprio: mostra de onde vem o preço.
    sub: s.item.tipo === "espelho" ? "acompanha a opção escolhida" : s.nome,
    qtd: s.qtd,
    unidade: s.item.unidade,
    valUn: s.valUn,
    line: s.line,
    pending: s.pending,
    badge: "Item de custo",
    credito: s.item.lado === "padrao",
    costItemId: s.item.id,
  };
}

/** Sub-linhas de um lado do cálculo, na ordem de exibição. */
export function satelliteRowsFor(
  satellites: CostSatelliteResult[],
  lado: CostComponentSide
): SubRowCells[] {
  return satellites.filter((s) => s.item.lado === lado).map(satelliteSubRow);
}
