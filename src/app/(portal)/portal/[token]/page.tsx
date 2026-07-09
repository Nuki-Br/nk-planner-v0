import { PortalScreen } from "@/features/builder-portal/components/PortalScreen";

// Tela 9 — Portal do terceiro (construtora). Sem shell do planner: o acesso
// é por link tokenizado, sem login. Resolução real do token → escopo no
// servidor entra na Fase 10; no mock o token resolve contra o store.
export default function PortalPage({ params }: { params: { token: string } }) {
  return <PortalScreen token={params.token} />;
}
