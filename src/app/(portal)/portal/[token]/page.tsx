import { PortalScreen } from "@/features/builder-portal/components/PortalScreen";

// Tela 9 — Portal do terceiro (construtora). Sem shell do planner: o acesso
// é por link tokenizado, sem login. O token é resolvido no servidor
// (/api/portal/[token]) → escopo (tipologias/campos/senha) do empreendimento.
export default function PortalPage({ params }: { params: { token: string } }) {
  return <PortalScreen token={params.token} />;
}
