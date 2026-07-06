import { UnderConstruction } from "@/components/layout/UnderConstruction";

export default function RevisaoCustosPage() {
  return (
    <UnderConstruction
      title="Revisão de custos"
      subtitle="Custos preenchidos pelo terceiro, variações e negociação"
      breadcrumb={[{ label: "Empreendimentos", href: "/dashboard" }, { label: "Revisão de custos" }]}
      fase={8}
    />
  );
}
