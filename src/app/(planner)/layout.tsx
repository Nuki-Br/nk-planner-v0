import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { getAuthContext } from "@/lib/auth/session";

// Shell autenticado. O middleware já barra sem sessão; aqui validamos também
// o membership (usuário sem organização não entra) e passamos org/usuário
// reais ao AppShell (client), que decide sidebar/offset pela rota.
export default async function PlannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  return (
    <AppShell orgName={auth.orgName} email={auth.email} userName={auth.userName}>
      {children}
    </AppShell>
  );
}
