-- Todas as colunas do Construtor de Preço passam a ser livres (valor fixo ou
-- fórmula). As colunas calculadas rowTotal/rowAvg deixam de existir: a soma por
-- linha já é a coluna fixa "Total final" (custoDeTroca + soma das colunas),
-- que sempre existe e não é configurável.
--
-- As linhas rowTotal/rowAvg são removidas em vez de viradas em colunas livres:
-- o Expr delas sempre foi vazio (o valor vinha do motor), então sobreviveriam
-- como colunas mudas de R$ 0,00. Não afeta o "Total final" — colunas calculadas
-- nunca entraram na soma.
DELETE FROM "BudgetColumn" WHERE "Kind" <> 'free';

-- AlterTable
ALTER TABLE "BudgetColumn" DROP COLUMN "Kind";

-- DropEnum
DROP TYPE "ColumnKind";
