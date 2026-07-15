import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cliente service-role do Supabase — bypassa RLS.
//
// SOMENTE SERVIDOR: nunca importar de um componente "use client". A chave
// SUPABASE_SECRET_KEY não tem prefixo NEXT_PUBLIC_ justamente para não vazar
// no bundle.
//
// Por que não usar createSupabaseServerClient(): aquele é anon-key + preso aos
// cookies da requisição + sujeito a RLS, então não consegue assinar URL de
// upload nem escrever no bucket. O acesso já é autenticado antes, no route
// handler, via getAuthContext() (withOrg/withAuth).

let client: SupabaseClient | null = null;

export function createSupabaseAdminClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    throw new Error(
      "Supabase não configurado (NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SECRET_KEY ausentes)."
    );
  }

  client = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return client;
}
