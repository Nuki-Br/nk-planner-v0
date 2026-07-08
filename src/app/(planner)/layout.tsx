import { redirect } from "next/navigation";

import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { ReadOnlyBanner } from "@/components/layout/ReadOnlyBanner";
import { getAuthContext } from "@/lib/auth/session";

// Shell autenticado (sidebar + header). O middleware já barra sem sessão;
// aqui validamos também o membership (usuário sem organização não entra) e
// passamos org/usuário reais ao Header.
export default async function PlannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  return (
    <div className="min-h-screen bg-background-standard">
      <Sidebar />
      <Header orgName={auth.orgName} email={auth.email} />
      <main style={{ marginLeft: 212, paddingTop: 64 }}>
        <div className="p-6">
          <ReadOnlyBanner />
          {children}
        </div>
      </main>
    </div>
  );
}
