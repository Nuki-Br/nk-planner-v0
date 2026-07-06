// Shell-less: o portal do terceiro (acesso por link tokenizado, sem login)
// não tem Sidebar/Header do planner — a tela traz o próprio cabeçalho (Fase 8).
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background-standard">{children}</div>;
}
