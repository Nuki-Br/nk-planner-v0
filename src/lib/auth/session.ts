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

// ── Cache + single-flight por token de acesso ────────────────────────────
// Uma tela como o Construtor de Preço monta ~8 queries em paralelo; sem isto
// cada request repetiria o round-trip do getUser() (rede ao Auth) + a query de
// membership. Chaveado pelo access token:
//  - single-flight (`inFlight`): as N chamadas simultâneas do fan-out esperam
//    UMA resolução (1 getUser + 1 query), em vez de N.
//  - cache curto (`cache`, TTL 10s): navegação rápida reaproveita o contexto.
// Segurança: o miss SEMPRE verifica no servidor via getUser() (pega sessão
// revogada); a janela de confiança é só o TTL. Tokens distintos (usuários ou
// pós-refresh) têm entradas distintas — sem vazamento de org entre usuários.
const AUTH_CACHE_TTL_MS = 10_000;

interface CachedAuth {
  at: number;
  context: AuthContext | null;
}

const cache = new Map<string, CachedAuth>();
const inFlight = new Map<string, Promise<AuthContext | null>>();

async function resolveAuthContext(
  supabase: ReturnType<typeof createSupabaseServerClient>
): Promise<AuthContext | null> {
  // getUser() valida o JWT no servidor de Auth (fonte de verdade da sessão).
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

/** Sessão + membership; null quando não autenticado ou sem organização. */
export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = createSupabaseServerClient();

  // getSession() lê o token do cookie localmente (sem rede) — só usado como
  // chave de cache; a verificação de identidade acontece no resolve (getUser).
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return null;

  const cached = cache.get(token);
  if (cached && Date.now() - cached.at < AUTH_CACHE_TTL_MS) return cached.context;

  const pending = inFlight.get(token);
  if (pending) return pending;

  const promise = resolveAuthContext(supabase)
    .then((context) => {
      cache.set(token, { at: Date.now(), context });
      // Poda entradas expiradas (mantém o Map pequeno em beta/serverless).
      for (const [key, value] of cache) {
        if (Date.now() - value.at >= AUTH_CACHE_TTL_MS) cache.delete(key);
      }
      return context;
    })
    .finally(() => inFlight.delete(token));

  inFlight.set(token, promise);
  return promise;
}
