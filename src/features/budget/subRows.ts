// Projeção de sub-itens de kit e da composição de um material na forma comum
// de sub-linha (SubRowCells). As sub-linhas são só leitura: o kit vem do
// catálogo e a composição se edita na aba "Itens de custo".
import type { KitSubItemResult } from "@/lib/budget";
import { fmtNum } from "@/lib/utils";
import type { CustoBase } from "@/shared/types/domain";

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

/**
 * Abre a composição do custo base de um material sob a sua linha — as parcelas
 * de `custoBaseTotal` (shared/utils/custoBase.ts) estendidas pela quantidade
 * da linha, para o usuário conferir de onde saiu o valor unitário:
 *
 *   material × custoQtd, cada insumo × qtd, mão de obra
 *
 * Vazio quando não há o que abrir (sem composição e custoQtd 1): a linha-pai
 * já diz tudo. `unidade` é a do material (o CustoBase não a carrega).
 */
export function composicaoSubRows(
  custo: CustoBase | undefined,
  qtdComRT: number,
  unidade = ""
): SubRowCells[] {
  if (!custo) return [];
  if (custo.composicao.length === 0 && custo.custoQtd === 1) return [];
  const out: SubRowCells[] = [];

  const matQtd = custo.custoQtd * qtdComRT;
  const matValUn = custo.custoMat ?? 0;
  out.push({
    key: "cb-material",
    nome: custo.custoQtd === 1 ? "Material" : `Material × ${fmtNum(custo.custoQtd, 2)}`,
    qtd: matQtd,
    unidade,
    valUn: matValUn,
    line: matValUn * matQtd,
    pending: custo.custoMat === null,
  });

  for (const l of custo.composicao) {
    const valUn = l.preco ?? 0;
    const qtd = l.qtd * qtdComRT;
    out.push({
      key: `cl-${l.id}`,
      nome: l.nome,
      sub: l.codigo ?? "",
      qtd,
      unidade: l.unidade,
      valUn,
      line: valUn * qtd,
      pending: l.preco === null,
      badge: "Insumo",
    });
  }

  if (custo.custoMO > 0) {
    out.push({
      key: "cb-mo",
      nome: "Mão de obra",
      qtd: qtdComRT,
      unidade,
      valUn: custo.custoMO,
      line: custo.custoMO * qtdComRT,
      pending: false,
    });
  }
  return out;
}
