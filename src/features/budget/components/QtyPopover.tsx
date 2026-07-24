"use client";

import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@heroui/react";

import { Button, Select } from "@/components/ui";
import { cn, fmtNum } from "@/lib/utils";
import { UNIDADE_OPTIONS } from "@/shared/constants/unidades";
import type { Unidade } from "@/shared/types/domain";

export interface QtyValue {
  /** `null` = herda a quantidade da planta. */
  qtd: number | null;
  rt: number | null;
  unidade: Unidade | null;
}

interface QtyPopoverProps {
  /** Valores EFETIVOS já resolvidos (override ou herdado). */
  qtd: number;
  rt: number;
  unidade: Unidade;
  /** Valores herdados da planta/componente — mostrados como "voltar para". */
  herdado: { qtd: number; rt: number; unidade: Unidade };
  /** Algum dos três está sobrescrito? */
  overridden: boolean;
  /** Exibe "qtd c/ RT" (linha de upgrade) ou a qtd líquida (linha de padrão). */
  comRT: boolean;
  onSave: (v: QtyValue) => void;
}

/**
 * Editor de quantidade/RT/unidade de UMA aplicação. O override vale em todas as
 * tipologias que usam o ambiente — o aviso no rodapé do popover não é decorativo:
 * a quantidade por planta é a expectativa de quem vem da tela de tipologias, e
 * aqui a regra é outra de propósito (o preço é um só por material aplicado).
 */
export function QtyPopover({
  qtd,
  rt,
  unidade,
  herdado,
  overridden,
  comRT,
  onSave,
}: QtyPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const [qtdStr, setQtdStr] = React.useState("");
  const [rtStr, setRtStr] = React.useState("");
  const [un, setUn] = React.useState<Unidade>(unidade);

  // Reabrir tem que refletir o estado atual: sem isso o popover mostra o que
  // havia na última vez que foi aberto, inclusive depois de um reset.
  React.useEffect(() => {
    if (!open) return;
    setQtdStr(String(qtd));
    setRtStr(String(rt));
    setUn(unidade);
  }, [open, qtd, rt, unidade]);

  const num = (s: string): number => parseFloat(s.replace(",", ".")) || 0;

  const commit = () => {
    const nQtd = num(qtdStr);
    const nRt = num(rtStr);
    // Igual ao herdado → grava null (volta a herdar) em vez de congelar o valor
    // atual: senão mexer na qtd da tipologia deixaria de refletir aqui.
    onSave({
      qtd: nQtd === herdado.qtd ? null : nQtd,
      rt: nRt === herdado.rt ? null : nRt,
      unidade: un === herdado.unidade ? null : un,
    });
    setOpen(false);
  };

  const reset = () => {
    onSave({ qtd: null, rt: null, unidade: null });
    setOpen(false);
  };

  const display = comRT ? qtd * (1 + rt / 100) : qtd;

  return (
    <Popover isOpen={open} onOpenChange={setOpen} placement="bottom-end" offset={4}>
      <PopoverTrigger>
        <button
          type="button"
          title={
            overridden
              ? "Quantidade sobrescrita nesta aplicação — vale em todas as tipologias"
              : "Clique para sobrescrever quantidade, reserva técnica e unidade"
          }
          className="inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-neutral-gray-3"
        >
          <span className={cn(overridden ? "font-bold text-primary-7" : "text-neutral-gray-7")}>
            {fmtNum(display, 2)} {unidade}
          </span>
          {overridden && (
            <span className="inline-block h-[5px] w-[5px] shrink-0 rounded-full bg-primary-7" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[276px] rounded-lg border border-neutral-gray-4 bg-white p-3 shadow-[0_8px_28px_rgba(0,0,0,0.12)]">
        <div className="flex w-full flex-col gap-2.5">
          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-gray-7">
                Quantidade
              </span>
              <input
                autoFocus
                type="number"
                step="0.01"
                value={qtdStr}
                onChange={(e) => setQtdStr(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commit();
                  if (e.key === "Escape") setOpen(false);
                }}
                className="h-[32px] w-full rounded-md border border-neutral-gray-5 px-2 text-right text-[12.5px] outline-none focus:border-primary-7"
              />
            </label>
            <label className="flex w-[84px] flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-gray-7">
                RT (%)
              </span>
              <input
                type="number"
                step="0.1"
                value={rtStr}
                onChange={(e) => setRtStr(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commit();
                  if (e.key === "Escape") setOpen(false);
                }}
                className="h-[32px] w-full rounded-md border border-neutral-gray-5 px-2 text-right text-[12.5px] outline-none focus:border-primary-7"
              />
            </label>
          </div>
          <Select
            small
            label="Unidade"
            value={un}
            onValueChange={(v) => setUn(v as Unidade)}
            options={UNIDADE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
          <p className="text-[10.5px] leading-snug text-neutral-gray-6">
            Vale para <strong className="font-semibold">todas as tipologias</strong> que usam este
            ambiente. Herdado da planta: {fmtNum(herdado.qtd, 2)} {herdado.unidade}
            {herdado.rt > 0 && ` · RT ${fmtNum(herdado.rt, 1)}%`}.
          </p>
          <div className="flex items-center gap-2">
            {overridden && (
              <button
                type="button"
                onClick={reset}
                className="p-0 text-left text-[10px] text-neutral-gray-6 hover:text-primary-7"
              >
                ↩ voltar ao valor da planta
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
