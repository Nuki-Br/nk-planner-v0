import { UnderConstruction } from "@/components/layout/UnderConstruction";

export default function TipologiasPage() {
  return (
    <UnderConstruction
      title="Tipologias e componentes"
      subtitle="Plantas, ambientes, componentes e grupos de unidades"
      breadcrumb={[{ label: "Empreendimentos", href: "/dashboard" }, { label: "Tipologias" }]}
      fase={5}
    />
  );
}
