import { UnderConstruction } from "@/components/layout/UnderConstruction";

export default function OrcamentoPage() {
  return (
    <UnderConstruction
      title="Construtor de Preço"
      subtitle="Formação do preço final por tipologia com colunas configuráveis"
      breadcrumb={[{ label: "Empreendimentos", href: "/dashboard" }, { label: "Construtor de Preço" }]}
      fase={7}
    />
  );
}
