import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Contexto de autenticação do lado do servidor (Fase 10): usuário do Supabase
// Auth + organização via membership. Toda rota de API e o shell (planner)
// resolvem o escopo de org por aqui — NUNCA confiar em org vinda do cliente.
export interface AuthContext {
  userId: string;
  email: string;
  organizationId: string;
  orgName: string;
  orgRole: string;
}

/** Sessão + membership; null quando não autenticado ou sem organização. */
export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const membership = await prisma.membership.findFirst({
    where: { authUserId: user.id },
    include: { organization: true },
  });
  if (!membership) return null;

  return {
    userId: user.id,
    email: user.email ?? membership.email,
    organizationId: membership.organizationId,
    orgName: membership.organization.name,
    orgRole: membership.role,
  };
}
