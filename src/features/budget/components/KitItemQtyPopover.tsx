"use client";

import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@heroui/react";

import { Button } from "@/components/ui";
import { cn, fmtNum } from "@/lib/utils";
import type { Unidade } from "@/shared/types/domain";

interface KitItemQtyPopoverProps {
  /** Quantidade LÍQUIDA resolvida; null = pendente (nada gravado, nada a herdar). */
  qtd: number | null;
  /** A quantidade veio herdada do componente. */
  herdada: boolean;
  /** O que o sub-item herda quando não há gravação (mesma unidade); null = não herda. */
  herdavel: number | null;
  /** RT do kit — só exibida quando `comRT` (linha de upgrade). */
  rt: number;
  unidade: Unidade;
  /** Upgrade mostra a qtd com RT (base do débito); padrão, a líquida (crédito). */
  comRT: boolean;
  /** Nome da tipologia — a quantidade é desta planta, não do ambiente todo. */
  tipologia: string;
  /** `null` apaga a gravação: volta a herdar ou fica pendente. */
  onSave: (qtd: number | null) => void;
}

/**
 * Quantidade de UM sub-item de kit nesta tipologia (MaterialKitUsage). Ao
 * contrário do popover de Qtd da linha — override que vale em todas as
 * tipologias —, aqui o valor é quantitativo da PLANTA, como a qtd do componente.
 * Digita-se a quantidade líquida; a RT do kit entra por cima no débito.
 */
export function KitItemQtyPopover({
  qtd,
  herdada,
  herdavel,
  rt,
  unidade,
  comRT,
  tipologia,
  onSave,
}: KitItemQtyPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setDraft(qtd === null ? "" : String(qtd));
  }, [open, qtd]);

  const commit = () => {
    setOpen(false);
    // Campo vazio = sem gravação para o sub-item (herda ou fica pendente), não
    // "zero": 0 é quantidade legítima ("não vai soleira nesta planta").
    if (draft.trim() === "") {
      if (!herdada && qtd !== null) onSave(null);
      return;
    }
    const n = parseFloat(draft.replace(",", "."));
    if (!Number.isFinite(n) || n < 0) return;
    if (herdada || n !== qtd) onSave(n);
  };

  const preview = parseFloat(draft.replace(",", "."));
  const comRTLabel =
    comRT && rt > 0 && Number.isFinite(preview)
      ? `${fmtNum(preview * (1 + rt / 100), 2)} ${unidade} com a RT de ${fmtNum(rt, 1)}%`
      : null;

  return (
    <Popover isOpen={open} onOpenChange={setOpen} placement="bottom-end" offset={4}>
      <PopoverTrigger>
        {qtd === null ? (
          <button
            type="button"
            title="Informe a quantidade deste sub-item nesta tipologia"
            className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-functional-warning bg-white px-2 py-0.5 text-[10.5px] font-bold text-tint-orange-fg hover:bg-functional-warning-light"
          >
            + Informar qtd
          </button>
        ) : (
          <button
            type="button"
            title={
              herdada
                ? "Herdada do componente — clique para informar a quantidade deste sub-item"
                : `Quantidade deste sub-item em ${tipologia} — clique para editar`
            }
            className="inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-neutral-gray-3"
          >
            <span className={cn(herdada ? "italic text-neutral-gray-6" : "text-neutral-gray-8")}>
              {fmtNum(comRT ? qtd * (1 + rt / 100) : qtd, 2)} {unidade}
            </span>
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[260px] rounded-lg border border-neutral-gray-4 bg-white p-3 shadow-[0_8px_28px_rgba(0,0,0,0.12)]">
        <div className="flex w-full flex-col gap-2.5">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-gray-7">
              Quantidade líquida ({unidade})
            </span>
            <input
              autoFocus
              type="number"
              step="0.01"
              min="0"
              value={draft}
              placeholder={herdavel !== null ? String(herdavel) : "0,00"}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") setOpen(false);
              }}
              className="h-[32px] w-full rounded-md border border-neutral-gray-5 px-2 text-right text-[12.5px] outline-none focus:border-primary-7"
            />
          </label>
          {comRTLabel && <p className="text-[10.5px] text-neutral-gray-7">Débito sobre {comRTLabel}.</p>}
          <p className="text-[10.5px] leading-snug text-neutral-gray-6">
            Vale só para <strong className="font-semibold">{tipologia}</strong>.{" "}
            {herdavel !== null
              ? `Sem valor próprio, herda a quantidade do componente (${fmtNum(herdavel, 2)} ${unidade}).`
              : "Unidade diferente da do componente: sem valor, o kit fica pendente."}
          </p>
          <div className="flex items-center gap-2">
            {!herdada && qtd !== null && herdavel !== null && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onSave(null);
                }}
                className="p-0 text-left text-[10px] text-neutral-gray-6 hover:text-primary-7"
              >
                ↩ herdar do componente
              </button>
            )}
            <div className="flex-1" />
            <Button size="sm" variant="bordered" onPress={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onPress={commit}>
              Salvar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
