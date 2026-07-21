import type { BudgetColumn } from "@/shared/types/domain";

// Colunas de cálculo padrão do Construtor de Preço. `expr` é a expressão padrão
// da coluna, sobrescrevível célula a célula.
// Usado APENAS no seeding (prisma/onboard.ts e prisma/seed.ts), que grava as
// linhas e recebe o Id autoincrement real. Não há fallback em tempo de leitura:
// empreendimento sem colunas gravadas começa vazio. Os ids abaixo são inertes.
export const TAX_COLUMNS_DEFAULT: BudgetColumn[] = [
  { id: 1, nome: "Taxa Construtora", expr: "=custo_troca * 8%", visivel: false },
  { id: 2, nome: "Contingência INCC", expr: "=custo_troca * 5%", visivel: false },
  { id: 3, nome: "Taxa Incorporadora", expr: "=valor_unitario * 22%", visivel: true },
];
