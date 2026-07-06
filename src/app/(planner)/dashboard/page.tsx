import Link from "next/link";
import { Card, CardBody, CardHeader } from "@heroui/react";

const SUMMARY = [
  { label: "Empreendimentos", value: "—" },
  { label: "Em andamento", value: "—" },
  { label: "Publicados", value: "—" },
  { label: "Rascunhos", value: "—" },
];

// Placeholder dashboard — proves the shell + tokens render. Real content is
// migrated from the prototype in Phase 4.
export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-title-3 text-neutral-gray-10">Dashboard</h2>
        <p className="text-sm-p text-neutral-gray-7">
          Visão geral dos empreendimentos em planejamento.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {SUMMARY.map((s) => (
          <Card key={s.label} shadow="sm" className="border border-neutral-gray-4">
            <CardHeader className="pb-0 text-sm-p text-neutral-gray-7">
              {s.label}
            </CardHeader>
            <CardBody className="pt-1 text-title-2 text-neutral-gray-10">
              {s.value}
            </CardBody>
          </Card>
        ))}
      </div>

      <Card shadow="sm" className="border border-neutral-gray-4">
        <CardBody className="py-16 text-center text-sm-p text-neutral-gray-6">
          A tabela de empreendimentos chega na Fase 3.{" "}
          <Link href="/tipologias" className="text-primary-7 underline underline-offset-2">
            Abrir o projeto do seed
          </Link>{" "}
          para navegar pelo fluxo.
        </CardBody>
      </Card>
    </div>
  );
}
