"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FiEye, FiEyeOff } from "react-icons/fi";

import { Button, Input } from "@/components/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// Tela de login (Fase 10) — layout split-screen alinhado ao nk-admin-portal
// (imagem à esquerda, marca + formulário à direita). Auth continua via Supabase
// (e-mail + senha); usuários do beta são criados manualmente (sem cadastro aberto).
export function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [senha, setSenha] = React.useState("");
  const [showSenha, setShowSenha] = React.useState(false);
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
    <div className="flex min-h-screen w-full flex-row items-center justify-center overflow-y-auto px-6 py-8 font-body md:px-16 bg-white">
      {/* Imagem de marca — escondida em telas estreitas */}
      <div className="hidden max-h-[calc(100vh-80px)] w-full max-w-[calc(100%-10px)] flex-1 justify-center overflow-hidden rounded-md md:flex">
        <Image
          src="/img/StartImage.png"
          alt="Nuki"
          width={900}
          height={1000}
          priority
          className="max-h-[calc(100vh-80px)] max-w-full object-contain"
        />
      </div>

      {/* Formulário */}
      <div className="flex h-full flex-1 justify-center">
        <form
          onSubmit={(e) => void submit(e)}
          className="flex w-full max-w-[520px] flex-col items-center justify-center gap-6 px-4 md:px-16"
        >
          <Image
            src="/img/logos/nuki-logo-black-horizontal.svg"
            alt="Nuki"
            width={130}
            height={85}
            priority
            className="object-contain"
          />

          <div className="mt-3 flex flex-col gap-3">
            <h2 className="text-h2 font-body leading-10 text-center">Bem vindo(a) ao Nuki Planner!</h2>
            <p className="text-p text-center">
              Para logar preencha as informações abaixo
            </p>
          </div>

          <div className="flex w-full flex-col gap-3">
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
              type={showSenha ? "text" : "password"}
              autoComplete="current-password"
              value={senha}
              onValueChange={setSenha}
              endContent={
                <button
                  type="button"
                  className="focus:outline-none"
                  aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}
                  onClick={() => setShowSenha((v) => !v)}
                >
                  {showSenha ? (
                    <FiEyeOff className="pointer-events-none text-lg text-neutral-gray-7" />
                  ) : (
                    <FiEye className="pointer-events-none text-lg text-neutral-gray-7" />
                  )}
                </button>
              }
            />
            {error && <p className="text-xs text-functional-error">{error}</p>}
          </div>

          <Button
            type="submit"
            fullWidth
            isLoading={loading}
            isDisabled={email.trim() === "" || senha === ""}
          >
            Entrar
          </Button>

          <p className="text-center text-xs text-neutral-gray-6">
            Sem acesso? Fale com a equipe Nuki.
          </p>
        </form>
      </div>
    </div>
  );
}
