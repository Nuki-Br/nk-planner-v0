import { UnderConstruction } from "@/components/layout/UnderConstruction";

export default function ConfigBasePage() {
  return (
    <UnderConstruction
      title="Configuração do empreendimento"
      subtitle="Dados base, construtora e taxas globais de formação de preço"
      breadcrumb={[{ label: "Empreendimentos", href: "/dashboard" }, { label: "Configuração" }]}
      fase={3}
    />
  );
}
