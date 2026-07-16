"use client";

import React from "react";
// Ícone de marca (WhatsApp) não existe na linha Lu* do mapa Icon — import
// direto, sem poluir o ICON_MAP com outra família.
import { FaWhatsapp } from "react-icons/fa";

import { Icon } from "@/components/ui";
import { feedbackWhatsAppUrl } from "@/shared/constants/contact";
import { usePathname } from "next/navigation";

const OPTIONS = [
  {
    key: "bug",
    icon: "warning",
    label: "Reportar um bug",
    mensagem: "Oi Pedro, gostaria de reportar um bug no Planner: ",
  },
  {
    key: "feedback",
    icon: "chat",
    label: "Enviar feedback ou sugestão",
    mensagem: "Oi Pedro, tenho um feedback ou sugestão sobre o Planner: ",
  },
] as const;

// FAB de feedback do beta: balão flutuante no canto inferior direito que abre
// duas opções de conversa no WhatsApp (bug / feedback) com mensagem inicial.
// z-40: acima do conteúdo, abaixo dos modais HeroUI e painéis (z-[881]+).
export function FeedbackFab() {
  const pathname = usePathname();
  const isCanvas = pathname.includes("/canvas");

  const [open, setOpen] = React.useState(false);
  const [showFeedback, setShowFeedback] = React.useState(false);
  const [showHint, setShowHint] = React.useState(true);

  React.useEffect(() => {
    const id = window.setTimeout(() => setShowHint(false), 10_000);
    return () => window.clearTimeout(id);
  }, []);

  React.useEffect(() => {
    if (isCanvas) {
      setShowFeedback(false);
      setShowHint(false);
    }

    return () => {
      setShowFeedback(true);
      setShowHint(true);
    }
  }, [isCanvas]);

  if (!showFeedback) return null;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40"
          aria-hidden
          onClick={() => setOpen(false)}
        />
      )}

      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2">
        {!open && showHint && (
          <span className="rounded-full border border-neutral-gray-3 bg-white px-3 py-1.5 text-[12px] font-medium text-neutral-gray-9 shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
            Encontrou um problema? Fale com a gente
          </span>
        )}

        {open && (
          <div className="flex flex-col gap-1.5">
            {OPTIONS.map((opt) => (
              <a
                key={opt.key}
                href={feedbackWhatsAppUrl(opt.mensagem)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-nk-xl border border-neutral-gray-3 bg-white px-4 py-2.5 text-[13px] font-semibold text-neutral-gray-11 shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-colors hover:bg-primary-1 hover:text-primary-7"
              >
                <Icon name={opt.icon} size={15} className="text-primary-7" />
                {opt.label}
              </a>
            ))}
          </div>
        )}

        <button
          type="button"
          aria-expanded={open}
          aria-label="Feedback pelo WhatsApp"
          title="Feedback pelo WhatsApp"
          onClick={() => setOpen((v) => !v)}
          className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_6px_20px_rgba(0,0,0,0.2)] transition-transform hover:scale-105"
        >
          {open ? <Icon name="close" size={20} /> : <FaWhatsapp size={26} aria-hidden />}
        </button>
      </div>
    </>
  );
}
