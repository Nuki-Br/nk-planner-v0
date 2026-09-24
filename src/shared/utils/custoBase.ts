// Fórmula do custo base de um material NUM empreendimento — a ÚNICA
// implementação, consumida pela aba "Custos base", pelo motor de cálculo
// (features/budget/resolve.ts) e pela publicação (lib/server/pricing.ts), para
// que o custo mostrado, o somado e o publicado nunca divirjam. Puro: sem
// React/DOM/Prisma.
//
//   total = custoMat × custoQtd + custoMO + Σ(qtd × preço do insumo)
//
// Pendência: custo de material nunca preenchido (NULL) OU qualquer insumo da
// composição sem preço neste empreendimento. "Sem custo" (custoMat 0 marcado
// de propósito) só vale para material SEM composição — com linhas, o zero do
// material é só uma parcela zerada.
import type { CompositionLine, CustoBase } from "@/shared/types/domain";

export type CustoBaseStatus = "pendente" | "sem_custo" | "preenchido";

/** Parcelas do custo base (R$/unidade do material). */
export interface CustoBaseBreakdown {
  /** custoMat × custoQtd (pendente conta 0). */
  material: number;
  mo: number;
  /** Σ qtd × preço das linhas (insumo pendente conta 0). */
  composicao: number;
  total: number;
}

export function composicaoSubtotal(linhas: CompositionLine[]): number {
  return linhas.reduce((s, l) => s + l.qtd * (l.preco ?? 0), 0);
}

export function custoBaseBreakdown(c: CustoBase): CustoBaseBreakdown {
  const material = (c.custoMat ?? 0) * c.custoQtd;
  const composicao = composicaoSubtotal(c.composicao);
  return { material, mo: c.custoMO, composicao, total: material + c.custoMO + composicao };
}

/** Custo base efetivo (R$/unidade). Ausente/pendente conta 0. */
export function custoBaseTotal(c: CustoBase | undefined): number {
  return c ? custoBaseBreakdown(c).total : 0;
}

/** Linhas da composição sem preço neste empreendimento. */
export function linhasPendentes(c: CustoBase | undefined): CompositionLine[] {
  return (c?.composicao ?? []).filter((l) => l.preco === null);
}

/**
 * "Pendente" é a AUSÊNCIA de custo (nunca preenchido), não um total zero: material
 * com MO preenchida e material vazio segue pendente; composição com um insumo
 * sem preço também. O "sem custo" marcado (custoMat 0) NÃO é pendente.
 */
export function custoBasePendente(c: CustoBase | undefined): boolean {
  if (!c || c.custoMat === null) return true;
  return c.composicao.some((l) => l.preco === null);
}

/** Status para os selos: pendente, sem custo (0 marcado, sem composição) ou preenchido. */
export function custoBaseStatus(c: CustoBase | undefined): CustoBaseStatus {
  if (custoBasePendente(c) || !c) return "pendente";
  return c.custoMat === 0 && c.composicao.length === 0 ? "sem_custo" : "preenchido";
}
