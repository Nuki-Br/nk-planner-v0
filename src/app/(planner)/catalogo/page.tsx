import { UnderConstruction } from "@/components/layout/UnderConstruction";

export default function CatalogoPage() {
  return (
    <UnderConstruction
      title="Catálogo de materiais"
      subtitle="Materiais e kits do empreendimento"
      breadcrumb={[{ label: "Empreendimentos", href: "/dashboard" }, { label: "Catálogo" }]}
      fase={4}
    />
  );
}
