"use client";

import React from "react";
import { usePathname } from "next/navigation";

import { FeedbackFab } from "@/components/layout/FeedbackFab";
import { Header } from "@/components/layout/Header";
import { IntroModal } from "@/components/layout/IntroModal";
import { CONTENT_LEFT_OFFSET_PX, Sidebar } from "@/components/layout/Sidebar";
import { useSelection } from "@/lib/store/selection";
import { DASHBOARD_MODE_ROUTES } from "@/shared/constants/navigation";

interface AppShellProps {
  orgName: string;
  email: string;
  children: React.ReactNode;
}

// Shell client do planner: decide sidebar/offset pela rota (determinístico no
// SSR — sem pulo de margem na hidratação) e monta o modal de boas-vindas e o
// botão de feedback em todas as telas autenticadas.
export function AppShell({ orgName, email, children }: AppShellProps) {
  const pathname = usePathname();
  const clearSelection = useSelection((s) => s.clearSelection);

  const isDashboardMode = DASHBOARD_MODE_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  const isCanvas = pathname.includes("/canvas");

  // Voltar ao dashboard limpa a seleção (tipologia/componente ativos). Vive
  // aqui porque a Sidebar não monta em modo dashboard.
  React.useEffect(() => {
    if (pathname === "/dashboard") clearSelection();
  }, [pathname, clearSelection]);

  return (
    <div className="min-h-screen bg-background-standard">
      <Header orgName={orgName} email={email} inProject={!isDashboardMode} />
      {!isDashboardMode && !isCanvas && <Sidebar />}
      <main
        style={{ marginLeft: isDashboardMode || isCanvas ? 0 : CONTENT_LEFT_OFFSET_PX, paddingTop: 64 }}
      >
        <div className="p-6">{children}</div>
      </main>
      <IntroModal />
      <FeedbackFab />
    </div>
  );
}
