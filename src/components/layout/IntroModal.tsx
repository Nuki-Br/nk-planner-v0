"use client";

import React from "react";
import Image from "next/image";
import { Modal as HeroModal, ModalBody, ModalContent, ModalFooter } from "@heroui/react";

import { Button } from "@/components/ui";

// Versionado: mudar a chave reexibe o modal para todos (ex.: relançamentos).
const INTRO_SEEN_KEY = "nk-planner:intro-seen:v1";

// Modal de boas-vindas do beta: aparece uma única vez por navegador (flag em
// localStorage) explicando que o Planner é uma versão experimental. Composto
// direto no HeroUI Modal (o wrapper Nuki força header com título; aqui o topo
// é um banner hero sem título).
export function IntroModal() {
  const [open, setOpen] = React.useState(false);

  // Leitura pós-hidratação (padrão PostIts): SSR e 1º render concordam em
  // `false`; storage bloqueado (modo privado) nunca mostra nem quebra.
  React.useEffect(() => {
    try {
      // if (!localStorage.getItem(INTRO_SEEN_KEY)) 
        setOpen(true);
    } catch {
      // storage indisponível — segue sem modal
    }
  }, []);

  // Qualquer dismissão (botão, Esc, backdrop, X) conta como visto.
  const dismiss = React.useCallback(() => {
    try {
      localStorage.setItem(INTRO_SEEN_KEY, "1");
    } catch {
      // quota/modo privado — fica só em memória nesta sessão
    }
    setOpen(false);
  }, []);

  return (
    <HeroModal
      isOpen={open}
      onClose={dismiss}
      scrollBehavior="inside"
      classNames={{
        base: "overflow-hidden rounded-nk-2xl bg-white outline-none focus:outline-none",
        closeButton: "right-4 top-4 z-10 text-white hover:bg-white/20",
      }}
    >
      <ModalContent style={{ maxWidth: 560 }}>
        <div className="flex flex-col items-center gap-3 bg-gradient-to-br from-primary-7 to-primary-8 px-8 py-10">
          <Image
            src="/img/logos/nuki-logo-black-horizontal.svg"
            alt="Nuki"
            width={92}
            height={40}
            className="h-[40px] w-auto object-contain brightness-0 invert"
          />
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold text-white/90">Planner</span>
            <span className="rounded-full bg-primary-4/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary-2">
              Versão beta
            </span>
          </div>
        </div>

        <ModalBody className="gap-3 px-8 py-6">
          <p className="text-medium font-bold text-neutral-gray-11">Bem-vindo ao Planner</p>
          <p className="text-sm-p text-neutral-gray-9">
            Você está acessando uma versão beta do Planner, o novo módulo da Nuki para
            estruturar e validar a composição de custos e o memorial de personalização.
          </p>
          <p className="text-sm-p text-neutral-gray-9">
            Esta é uma versão experimental: algumas funcionalidades ainda estão em construção
            e podem mudar conforme evoluímos o produto com base no uso real.
          </p>
          <p className="text-sm-p text-neutral-gray-9">
            Encontrou um problema ou tem uma sugestão? Use o botão de feedback no canto
            inferior direito da tela para falar direto com a gente.
          </p>
        </ModalBody>

        <ModalFooter className="justify-end px-8 pb-6 pt-0">
          <Button onPress={dismiss}>Começar a explorar</Button>
        </ModalFooter>
      </ModalContent>
    </HeroModal>
  );
}
