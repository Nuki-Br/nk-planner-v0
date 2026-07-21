"use client";

import React from "react";
import { usePathname } from "next/navigation";

import { FeedbackFab } from "@/components/layout/FeedbackFab";
import { Header } from "@/components/layout/Header";
import { IntroModal } from "@/components/layout/IntroModal";
import {
  CONTENT_LEFT_OFFSET_COLLAPSED_PX,
  CONTENT_LEFT_OFFSET_PX,
  Sidebar,
} from "@/components/layout/Sidebar";
import { CurrentUserProvider } from "@/lib/hooks/useCurrentUser";
import { DASHBOARD_MODE_ROUTES } from "@/shared/constants/navigation";

interface AppShellProps {
  orgName: string;
  email: string;
  userName: string;
  children: React.ReactNode;
}

// Shell client do planner: decide sidebar/offset pela rota (determinístico no
// SSR — sem pulo de margem na hidratação) e monta o modal de boas-vindas e o
// botão de feedback em todas as telas autenticadas.
export function AppShell({ orgName, email, userName, children }: AppShellProps) {
  const pathname = usePathname();

  const isDashboardMode = DASHBOARD_MODE_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  const isCanvas = pathname.includes("/canvas");

  // Construtor de Preço (tabela larga): sidebar recolhida por padrão. O toggle
  // manual vale até a próxima entrada/saída da rota.
  const isOrcamento = pathname === "/orcamento" || pathname.startsWith("/orcamento/");
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(isOrcamento);
  React.useEffect(() => {
    setSidebarCollapsed(isOrcamento);
  }, [isOrcamento]);

  // Nada de limpar seleção ao entrar no dashboard: isso zeraria o
  // empreendimento ativo a cada visita e anularia a persistência (ida e volta ao
  // dashboard perderia o projeto). As sub-seleções são limpas por
  // setActiveProject quando o empreendimento MUDA — o gatilho correto.

  const contentLeft = isDashboardMode || isCanvas
    ? 0
    : sidebarCollapsed
      ? CONTENT_LEFT_OFFSET_COLLAPSED_PX
      : CONTENT_LEFT_OFFSET_PX;

  return (
    <CurrentUserProvider value={{ name: userName, email, orgName }}>
      <div className="min-h-screen bg-background-standard">
      <Header orgName={orgName} email={email} inProject={!isDashboardMode} />
      {!isDashboardMode && !isCanvas && (
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
        />
      )}
      <main
        className="transition-[margin-left] duration-200"
        style={{ marginLeft: contentLeft, paddingTop: 64 }}
      >
        <div className="p-6">{children}</div>
      </main>
      <IntroModal />
      <FeedbackFab />
      </div>
    </CurrentUserProvider>
  );
}
