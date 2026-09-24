"use client";

import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@heroui/react";

import { Button, Icon } from "@/components/ui";

interface CostFillPopoverProps {
  /** Nome do material — o custo é dele, não do kit. */
  nome: string;
  /** Valores já gravados (pré-preenchem o formulário). */
  inicial: { mat: number | null; mo: number };
  /** Grava o custo base do empreendimento (strings cruas, o chamador converte). */
  onSave: (mat: string, mo: string) => void;
  /** "Sem custo" (zero decidido) — só onde faz sentido, ex.: kit padrão. */
  onSemCusto?: () => void;
}

/**
 * "Preencher custo base" de um sub-item de kit. A linha do material avulso usa o
 * preenchimento inline das colunas da tabela; a sub-linha do kit não tem essas
 * colunas livres, então o formulário abre num popover. Grava o MESMO custo base
 * do empreendimento: vale para todas as aplicações do material aqui.
 */
export function CostFillPopover({ nome, inicial, onSave, onSemCusto }: CostFillPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const [mat, setMat] = React.useState("");
  const [mo, setMo] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setMat(inicial.mat !== null && inicial.mat > 0 ? String(inicial.mat) : "");
    setMo(inicial.mo > 0 ? String(inicial.mo) : "");
  }, [open, inicial.mat, inicial.mo]);

  // Material 0/vazio não grava — "sem custo" é a ação explícita, não um zero digitado.
  const valid = (parseFloat(mat.replace(",", ".")) || 0) > 0;
  const commit = () => {
    if (!valid) return;
    setOpen(false);
    onSave(mat, mo);
  };
  const keys = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") setOpen(false);
  };
  const input =
    "h-[32px] w-full rounded-md border border-neutral-gray-5 pl-7 pr-2 text-right text-[12.5px] outline-none focus:border-primary-7";

  return (
    <Popover isOpen={open} onOpenChange={setOpen} placement="bottom-start" offset={4}>
      <PopoverTrigger>
        <button
          type="button"
          className="mt-1 flex w-fit items-center gap-1 whitespace-nowrap rounded-full border border-primary-7 bg-white px-2 py-0.5 text-[10.5px] font-bold text-primary-7"
        >
          <Icon name="plus" size={11} /> Preencher custo
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] rounded-lg border border-neutral-gray-4 bg-white p-3 shadow-[0_8px_28px_rgba(0,0,0,0.12)]">
        <div className="flex w-full flex-col gap-2.5">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-tint-amber-fg">
              Preencher custo base
            </p>
            <p className="mt-0.5 truncate text-xs text-neutral-gray-8">{nome}</p>
          </div>
          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-gray-7">
                Material
              </span>
              <span className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-neutral-gray-6">
                  R$
                </span>
                <input
                  autoFocus
                  type="number"
                  step="0.01"
                  value={mat}
                  placeholder="0,00"
                  onChange={(e) => setMat(e.target.value)}
                  onKeyDown={keys}
                  className={input}
                />
              </span>
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-gray-7">
                Mão de obra
              </span>
              <span className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-neutral-gray-6">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={mo}
                  placeholder="0,00"
                  onChange={(e) => setMo(e.target.value)}
                  onKeyDown={keys}
                  className={input}
                />
              </span>
            </label>
          </div>
          <p className="text-[10.5px] leading-snug text-neutral-gray-6">
            Custo do empreendimento: vale para todas as aplicações deste material, dentro e fora
            de kits.
          </p>
          <div className="flex items-center gap-2">
            {onSemCusto && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onSemCusto();
                }}
                title="Nada é entregue (ex.: “Não entregue”): o sub-item entra com custo zero."
                className="p-0 text-left text-[10px] text-neutral-gray-6 hover:text-primary-7"
              >
                Sem custo
              </button>
            )}
            <div className="flex-1" />
            <Button size="sm" variant="bordered" onPress={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onPress={commit} isDisabled={!valid}>
              Salvar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
