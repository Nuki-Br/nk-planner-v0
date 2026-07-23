-- Empreendimento pode desligar o fluxo de débito/crédito na aba "Preço final".
-- Coluna aditiva com default true: empreendimentos existentes seguem no fluxo atual.

-- AddColumn
ALTER TABLE "Enterprise" ADD COLUMN "UsesDebitCredit" BOOLEAN NOT NULL DEFAULT true;
