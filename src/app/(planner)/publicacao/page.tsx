import { UnderConstruction } from "@/components/layout/UnderConstruction";

export default function PublicacaoPage() {
  return (
    <UnderConstruction
      title="Publicação"
      subtitle="Revisão final e publicação do orçamento"
      breadcrumb={[{ label: "Empreendimentos", href: "/dashboard" }, { label: "Publicação" }]}
      fase={9}
    />
  );
}
