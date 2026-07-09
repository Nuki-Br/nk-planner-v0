"use client";

import React from "react";
import { useRouter } from "next/navigation";

import { Button, Input } from "@/components/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// Tela de login (Fase 10) — e-mail + senha via Supabase Auth. Usuários do
// beta são criados manualmente no painel (sem cadastro aberto).
export function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [senha, setSenha] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() === "" || senha === "") return;
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });
    if (authError) {
      setError("E-mail ou senha inválidos.");
      setLoading(false);
      return;
    }
    // refresh() para o middleware/layout enxergarem a sessão nova.
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background-standard px-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-4 font-bold text-white">
            N
          </div>
          <span className="text-base font-bold text-neutral-gray-10">Nuki</span>
          <span className="border-l border-neutral-gray-4 pl-2 text-[11px] font-semibold text-neutral-gray-6">
            Planejamento
          </span>
        </div>

        <div className="rounded-xl border border-neutral-gray-4 bg-white p-8">
          <h1 className="mb-1 text-lg font-bold text-neutral-gray-11">Entrar</h1>
          <p className="mb-6 text-[13px] text-neutral-gray-7">
            Acesse com o e-mail e a senha fornecidos pela equipe Nuki.
          </p>
          <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-3">
            <Input
              label="E-mail"
              type="email"
              autoComplete="email"
              value={email}
              onValueChange={setEmail}
              autoFocus
            />
            <Input
              label="Senha"
              type="password"
              autoComplete="current-password"
              value={senha}
              onValueChange={setSenha}
            />
            {error && <p className="text-xs text-functional-error">{error}</p>}
            <Button
              type="submit"
              fullWidth
              isLoading={loading}
              isDisabled={email.trim() === "" || senha === ""}
            >
              Entrar
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-neutral-gray-6">
          Sem acesso? Fale com a equipe Nuki.
        </p>
      </div>
    </div>
  );
}
