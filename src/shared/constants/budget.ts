import type { BudgetColumn } from "@/shared/types/domain";

// Colunas de cálculo padrão do Construtor de Preço (TAX_COLUMNS_DEFAULT do
// protótipo, verbatim — inclusive as flags `visivel`).
//  - free     → células editáveis; `expr` é a expressão padrão da coluna
//  - rowTotal → calculada: soma as colunas free à esquerda
//  - rowAvg   → calculada: média das colunas free à esquerda
export const TAX_COLUMNS_DEFAULT: BudgetColumn[] = [
  { id: "tc1", nome: "Taxa Construtora", kind: "free", expr: "=custo_troca * 8%", visivel: false },
  { id: "tc2", nome: "Contingência INCC", kind: "free", expr: "=custo_troca * 5%", visivel: false },
  { id: "tc3", nome: "Taxa Incorporadora", kind: "free", expr: "=valor_unitario * 22%", visivel: true },
];
