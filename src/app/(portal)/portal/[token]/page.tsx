import { Chip, EmptyState } from "@/components/ui";

// Tela 9 — Portal do terceiro (construtora). Sem shell do planner: o acesso
// é por link tokenizado, sem login. Resolução real do token → escopo entra
// na Fase 10; o preenchimento de custos, na Fase 8.
export default function PortalPage({ params }: { params: { token: string } }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="rounded-lg border border-neutral-gray-5 bg-white">
        <EmptyState
          icon="link"
          title="Portal de preenchimento de custos"
          subtitle={`Acesso via link · token: ${params.token}`}
          action={<Chip tone="teal">Fase 8</Chip>}
        />
      </div>
    </div>
  );
}
