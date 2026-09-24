"use client";

import React from "react";
import { FocusScope } from "@react-aria/focus";

import { Button, Icon } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { BudgetVersion, Change, PricingDiffRow } from "@/shared/types/domain";

import { DiffMotivos, DiffPrice, ORDEM } from "./PublishDiffList";

export function HistoryGlyph({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
    </svg>
  );
}
export function SaveGlyph({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" />
    </svg>
  );
}

type LegacySection = "materiais" | "custos" | "taxas" | "tipologias";
const CHANGE_SECTIONS: { key: LegacySection; label: string }[] = [
  { key: "materiais", label: "Materiais" },
  { key: "custos", label: "Custos" },
  { key: "taxas", label: "Taxas" },
  { key: "tipologias", label: "Tipologias" },
];
const VTYPE_CFG: Record<Change["tipo"], { sym: string; className: string }> = {
  adicionado: { sym: "+", className: "bg-functional-success/10 text-functional-success" },
  alterado: { sym: "~", className: "bg-primary-7/10 text-primary-7" },
  removido: { sym: "−", className: "bg-functional-error/10 text-functional-error" },
};
const vCountLabel = (n: number) =>
  n === 0 ? "—" : n === 1 ? "1 alteração" : `${n} alterações`;

function ChangeSection({ label, items }: { label: string; items: Change[] }) {
  const n = items.length;
  return (
    <div className="mb-[11px]">
      <div className={cn("flex items-center gap-[7px]", n > 0 && "mb-[7px]")}>
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            n > 0 ? "bg-primary-7" : "bg-neutral-gray-5"
          )}
        />
        <span className="text-xs font-bold text-neutral-gray-9">{label}</span>
        <span className="text-[11px] font-semibold text-neutral-gray-6">{vCountLabel(n)}</span>
      </div>
      {n > 0 && (
        <div className="flex flex-col gap-2 pl-[13px]">
          {items.map((it, i) => {
            const cfg = VTYPE_CFG[it.tipo];
            return (
              <div key={i} className="flex items-start gap-2">
                <span
                  className={cn(
                    "mt-px flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded text-xs font-extrabold",
                    cfg.className
                  )}
                >
                  {cfg.sym}
                </span>
                <span className="text-[11.5px] leading-relaxed text-neutral-gray-8">{it.desc}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const PRECO_SECTIONS: Record<PricingDiffRow["tipo"], { label: string; sym: Change["tipo"] }> = {
  removido: { label: "Saíram do orçamento", sym: "removido" },
  alterado: { label: "Preços alterados", sym: "alterado" },
  novo: { label: "Novos preços", sym: "adicionado" },
};
const precoCountLabel = (n: number) => (n === 1 ? "1 linha" : `${n} linhas`);

/** "+3 ~5 −1" no cabeçalho do card — dá para varrer o histórico sem expandir. */
function PrecoTally({ precos }: { precos: PricingDiffRow[] }) {
  const n = (t: PricingDiffRow["tipo"]) => precos.filter((p) => p.tipo === t).length;
  const novos = n("novo");
  const alterados = n("alterado");
  const removidos = n("removido");
  if (novos + alterados + removidos === 0) return null;
  return (
    <span
      className="flex items-center gap-1.5 text-[11px] font-bold"
      title={`${novos} novos · ${alterados} alterados · ${removidos} saíram do orçamento`}
    >
      {novos > 0 && <span className="text-functional-success">+{novos}</span>}
      {alterados > 0 && <span className="text-primary-7">~{alterados}</span>}
      {removidos > 0 && <span className="text-functional-error">−{removidos}</span>}
    </span>
  );
}

/**
 * O diff de preço que a publicação gravou — o mesmo que o modal "Publicar
 * orçamento" mostrou na hora, agrupado por tipo.
 */
function PrecoChanges({ precos, avisos }: { precos: PricingDiffRow[]; avisos: string[] }) {
  return (
    <>
      {precos.length === 0 && (
        <p className="mb-[11px] text-[11.5px] text-neutral-gray-7">
          Nenhum preço mudou nesta publicação.
        </p>
      )}
      {ORDEM.map((tipo) => {
        const items = precos.filter((p) => p.tipo === tipo);
        if (items.length === 0) return null;
        const sec = PRECO_SECTIONS[tipo];
        const cfg = VTYPE_CFG[sec.sym];
        return (
          <div key={tipo} className="mb-[11px]">
            <div className="mb-[7px] flex items-center gap-[7px]">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary-7" />
              <span className="text-xs font-bold text-neutral-gray-9">{sec.label}</span>
              <span className="text-[11px] font-semibold text-neutral-gray-6">
                {precoCountLabel(items.length)}
              </span>
            </div>
            <div className="flex flex-col gap-2.5 pl-[13px]">
              {items.map((r) => (
                <div key={r.optionId} className="flex items-start gap-2">
                  <span
                    className={cn(
                      "mt-px flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded text-xs font-extrabold",
                      cfg.className
                    )}
                  >
                    {cfg.sym}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="min-w-0 text-[11.5px] font-semibold leading-snug text-neutral-gray-11">
                        {r.especificacao}
                      </span>
                      <span className="shrink-0 text-[11px]">
                        <DiffPrice row={r} />
                      </span>
                    </div>
                    <div className="mt-px text-[10.5px] text-neutral-gray-6">
                      {r.ambiente} · {r.componente}
                    </div>
                    <DiffMotivos motivos={r.motivos} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {avisos.length > 0 && (
        <div className="mb-[11px] flex flex-col gap-1.5">
          {avisos.map((aviso, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg border border-[#fde68a] bg-functional-warning-light px-2.5 py-2"
            >
              <Icon name="warning" size={12} className="mt-0.5 shrink-0 text-tint-orange-fg" />
              <p className="text-[11px] leading-snug text-neutral-gray-9">{aviso}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function VersionChangesBody({ v }: { v: BudgetVersion }) {
  const { precos, avisos } = v.changes;
  if (precos !== null) return <PrecoChanges precos={precos} avisos={avisos} />;
  if (CHANGE_SECTIONS.some((s) => v.changes[s.key].length > 0)) {
    return (
      <>
        {CHANGE_SECTIONS.map((s) => (
          <ChangeSection key={s.key} label={s.label} items={v.changes[s.key]} />
        ))}
      </>
    );
  }
  // Publicada antes de a versão guardar o diff — o preço de então foi
  // sobrescrito no Material, então não há como reconstruir o "de → para".
  return (
    <p className="mb-[11px] text-[11.5px] leading-relaxed text-neutral-gray-7">
      As alterações desta versão não foram registradas — ela foi publicada antes de o histórico
      passar a guardar o diff de preços.
    </p>
  );
}

function VersionCard({
  v,
  expanded,
  onToggle,
  onRestore,
}: {
  v: BudgetVersion;
  expanded: boolean;
  onToggle: () => void;
  onRestore: (v: BudgetVersion) => void;
}) {
  const dateOnly = v.createdAt.split(" às ")[0];
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-white transition-colors",
        expanded ? "border-primary-3" : "border-neutral-gray-4"
      )}
    >
      <div onClick={onToggle} className="cursor-pointer px-3.5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-neutral-gray-11">{v.label}</span>
          {v.isCurrent && (
            <span className="inline-flex items-center rounded-full bg-primary-1 px-2 py-px text-[10px] font-bold text-primary-7">
              Atual
            </span>
          )}
          {v.changes.precos && <PrecoTally precos={v.changes.precos} />}
          <span className="flex-1" />
          <span className="whitespace-nowrap text-[11px] text-neutral-gray-7">
            {dateOnly} · {v.createdBy}
          </span>
          <Icon name={expanded ? "chevD" : "chevR"} size={15} className="text-neutral-gray-7" />
        </div>
        <p
          className={cn(
            "mt-1.5 text-xs leading-relaxed text-neutral-gray-8",
            !expanded && "truncate"
          )}
        >
          {v.summary}
        </p>
      </div>
      {expanded && (
        <div className="border-t border-neutral-gray-4 px-3.5 pb-3.5 pt-3">
          <div className="max-h-[360px] overflow-y-auto pr-1">
            <VersionChangesBody v={v} />
          </div>
          {!v.isCurrent && (
            <div className="mt-1">
              <Button variant="bordered" size="sm" onPress={() => onRestore(v)}>
                Restaurar {v.label}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function VersionDrawer({
  open,
  versions,
  projetoNome,
  onClose,
  onRestore,
}: {
  open: boolean;
  versions: BudgetVersion[];
  projetoNome: string;
  onClose: () => void;
  onRestore: (v: BudgetVersion) => void;
}) {
  const current = versions.find((v) => v.isCurrent) ?? versions[0];
  const [expanded, setExpanded] = React.useState<Set<number>>(new Set());
  // Entrada suave: monta fora da tela e desliza para dentro no frame seguinte.
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => {
    if (open) setExpanded(new Set(current ? [current.id] : []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  React.useEffect(() => {
    if (!open) {
      setShown(false);
      return;
    }
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [open]);
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return (
    <FocusScope contain restoreFocus autoFocus>
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-[900] bg-black/25 transition-opacity duration-200",
          shown ? "opacity-100" : "opacity-0"
        )}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="version-drawer-title"
        className={cn(
          "fixed right-0 top-0 z-[901] flex h-screen w-[480px] max-w-[92vw] flex-col bg-white shadow-[-8px_0_32px_rgba(0,0,0,0.14)] transition-transform duration-200 ease-out",
          shown ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-start gap-3 border-b border-neutral-gray-3 px-5 py-[18px]">
          <div className="flex-1">
            <div id="version-drawer-title" className="text-[15px] font-bold text-neutral-gray-11">
              Histórico de versões
            </div>
            <div className="mt-0.5 text-xs text-neutral-gray-7">
              {projetoNome} · {versions.length} {versions.length === 1 ? "versão" : "versões"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex p-1 text-neutral-gray-7"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto bg-neutral-gray-2 p-4">
          {versions.map((v) => (
            <VersionCard
              key={v.id}
              v={v}
              expanded={expanded.has(v.id)}
              onToggle={() => toggle(v.id)}
              onRestore={onRestore}
            />
          ))}
        </div>
      </aside>
    </FocusScope>
  );
}

export function VersionToast({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div className="fixed bottom-6 left-1/2 z-[2000] flex -translate-x-1/2 items-center gap-[9px] rounded-lg bg-neutral-gray-13 px-[18px] py-[11px] shadow-[0_8px_28px_rgba(0,0,0,0.24)]">
      <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-primary-4 text-neutral-gray-13">
        <Icon name="check" size={12} />
      </span>
      <span className="text-[13px] font-semibold text-white">{msg}</span>
    </div>
  );
}
