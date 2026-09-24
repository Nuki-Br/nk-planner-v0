// Contratos de request dos itens de custo e da composição — compartilhados
// entre o cliente (lib/data/store) e as rotas/servidor, sem que o cliente
// importe lib/server. Ver docs/features/pricing.md §2.
import type { Unidade } from "@/shared/constants/unidades";

/**
 * Uma linha da grade "Adicionar itens": aponta para um insumo existente
 * (`itemId`) OU descreve um novo (`novo`). `preco` (R$/unidade neste
 * empreendimento) é opcional: omitido = não mexe; `null` = volta a pendente.
 * `qtd` só faz sentido no contexto de composição (coeficiente por unidade do
 * material); ausente = 1.
 */
export interface CostItemLineInput {
  itemId?: number;
  novo?: { codigo: string | null; nome: string; unidade: Unidade };
  preco?: number | null;
  qtd?: number;
}

/** PATCH de um insumo: identidade (org) e/ou preço (empreendimento). */
export interface CostItemPatch {
  codigo?: string | null;
  nome?: string;
  unidade?: Unidade;
  /** `null` volta a pendente. */
  preco?: number | null;
}

/** Operações sobre a composição de UM material (POST …/custos-base/[baseId]/composicao). */
export type ComposicaoOp =
  | { op: "addLines"; lines: CostItemLineInput[] }
  | { op: "updateLine"; lineId: number; qtd: number }
  | { op: "removeLine"; lineId: number }
  | { op: "reorder"; orderedIds: number[] }
  | { op: "setCostQuantity"; custoQtd: number }
  | {
      op: "applyTo";
      targetBaseIds: number[];
      /** substituir = apaga a composição dos alvos antes; mesclar = upsert por insumo. */
      mode: "substituir" | "mesclar";
      lines: { itemId: number; qtd: number }[];
      copiarCustoQtd: boolean;
    };
