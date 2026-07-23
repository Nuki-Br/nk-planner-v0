-- Linha-registro no padrão: item de custo que entra no custo mas NÃO gera
-- crédito, e pode viver num componente sem material padrão.

-- AlterTable
ALTER TABLE "RoomComponentCostItem"
  ADD COLUMN "Registro" BOOLEAN NOT NULL DEFAULT false;
