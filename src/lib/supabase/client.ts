import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client (publishable key — a "anon" da nomenclatura nova).
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ""
  );
}
