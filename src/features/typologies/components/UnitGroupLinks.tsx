"use client";

import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@heroui/react";

import { Icon, Spinner } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { UnitGroup } from "@/shared/types/domain";

import { contarUnidades } from "../shared";

// Vínculo tipologia ⇄ grupo de unidades: chip com "x" (desvincular) e o menu
// "Vincular grupo". Usados no cabeçalho da tipologia (grava na hora) e nas
// modais de criar/editar tipologia (grava no salvar).

const unidadesLabel = (n: number) => `${n} ${n === 1 ? "unidade" : "unidades"}`;

export function UnitGroupChip({
  group,
  onRemove,
  removing = false,
  note,
  tone = "neutral",
}: {
  group: UnitGroup;
  onRemove: () => void;
  removing?: boolean;
  /** Linha extra no tooltip (ex.: "sai de Planta B ao salvar"). */
  note?: string;
  tone?: "neutral" | "teal";
}) {
  const title = [group.nome, group.torre, unidadesLabel(group.unidades.length), note]
    .filter(Boolean)
    .join(" · ");
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-full py-[3px] pl-2.5 pr-1 text-[11px]",
        tone === "teal"
          ? "bg-primary-1 font-semibold text-primary-7"
          : "border border-neutral-gray-5 bg-neutral-gray-2 text-neutral-gray-8"
      )}
    >
      {group.nome}
      {note && <span className="h-1.5 w-1.5 rounded-full bg-functional-warning" />}
      <button
        type="button"
        onClick={onRemove}
        disabled={removing}
        aria-label={`Desvincular ${group.nome}`}
        title="Desvincular desta tipologia"
        className="flex h-4 w-4 items-center justify-center rounded-full transition-colors hover:bg-black/10 disabled:cursor-wait"
      >
        {removing ? <Spinner size={10} className="text-current" /> : <Icon name="close" size={11} />}
      </button>
    </span>
  );
}

export function UnitGroupLinkMenu({
  options,
  vinculadoA,
  onPick,
  onManage,
  linking = false,
  variant = "chip",
}: {
  /** Grupos do empreendimento que ainda não estão nesta tipologia. */
  options: UnitGroup[];
  /** Nome da OUTRA tipologia a que o grupo está vinculado (null = livre). */
  vinculadoA: (group: UnitGroup) => string | null;
  onPick: (group: UnitGroup) => void;
  /** Abre o cadastro de grupos (criar/editar). */
  onManage?: () => void;
  linking?: boolean;
  /** "chip" = afford tracejado da linha de chips; "button" = botão das modais. */
  variant?: "chip" | "button";
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover isOpen={open} onOpenChange={setOpen} placement="bottom-start" offset={6}>
      <PopoverTrigger>
        <button
          type="button"
          disabled={linking}
          className={cn(
            "inline-flex items-center gap-1 transition-colors disabled:cursor-wait",
            variant === "chip"
              ? "rounded-full border border-dashed border-neutral-gray-5 px-2.5 py-[3px] text-[11px] text-neutral-gray-7 hover:border-primary-7 hover:text-primary-7"
              : "h-8 rounded-lg border border-neutral-gray-13 px-3 text-xs font-semibold text-neutral-gray-13 hover:bg-neutral-gray-2"
          )}
        >
          {linking ? <Spinner size={11} className="text-current" /> : <Icon name="plus" size={variant === "chip" ? 11 : 14} />}
          Vincular grupo
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] rounded-lg border border-neutral-gray-4 bg-white p-1.5 shadow-[0_8px_28px_rgba(0,0,0,0.12)]">
        <div className="w-full">
          {options.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-neutral-gray-6">
              Nenhum outro grupo de unidades neste empreendimento.
            </p>
          ) : (
            <div className="max-h-[260px] overflow-y-auto">
              {options.map((g) => {
                const outra = vinculadoA(g);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onPick(g);
                    }}
                    className="flex w-full items-start gap-2 rounded px-3 py-2 text-left hover:bg-neutral-gray-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-semibold text-neutral-gray-11">
                        {g.nome}
                      </span>
                      <span className="block text-[11px] text-neutral-gray-6">
                        {[g.torre, unidadesLabel(g.unidades.length)].filter(Boolean).join(" · ")}
                      </span>
                      {outra && (
                        <span className="mt-0.5 block text-[11px] font-semibold text-tint-orange-fg">
                          Vinculado a {outra} — muda para esta tipologia
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          {onManage && (
            <>
              <div className="mx-2 my-1 h-px bg-neutral-gray-4" />
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onManage();
                }}
                className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs font-semibold text-neutral-gray-9 hover:bg-neutral-gray-2"
              >
                <Icon name="building" size={14} className="text-neutral-gray-7" />
                Criar ou editar grupos de unidades
              </button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Seção "Grupos de unidades" das modais de criar/editar tipologia: a lista é
 * local e vai inteira no salvar (`unitGroupIds`). Um grupo que está em outra
 * tipologia muda para esta ao salvar — o chip avisa.
 */
export function UnitGroupsField({
  value,
  onChange,
  groups,
  tipologiaId,
  tipNome,
}: {
  value: number[];
  onChange: (ids: number[]) => void;
  /** Todos os grupos do empreendimento. */
  groups: UnitGroup[];
  /** Tipologia sendo editada (null = nova). */
  tipologiaId: number | null;
  tipNome: (tipologiaId: number) => string;
}) {
  const outra = (g: UnitGroup) =>
    g.tipologiaId !== null && g.tipologiaId !== tipologiaId ? tipNome(g.tipologiaId) : null;
  const selected = value
    .map((id) => groups.find((g) => g.id === id))
    .filter((g): g is UnitGroup => g !== undefined);
  const unidades = contarUnidades(selected);
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {selected.length === 0 && (
          <span className="text-xs text-neutral-gray-6">Nenhum grupo vinculado.</span>
        )}
        {selected.map((g) => {
          const de = outra(g);
          return (
            <UnitGroupChip
              key={g.id}
              group={g}
              tone="teal"
              note={de ? `sai de ${de} ao salvar` : undefined}
              onRemove={() => onChange(value.filter((id) => id !== g.id))}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-3">
        <UnitGroupLinkMenu
          variant="button"
          options={groups.filter((g) => !value.includes(g.id))}
          vinculadoA={outra}
          onPick={(g) => onChange([...value, g.id])}
        />
        {selected.length > 0 && (
          <span className="text-xs text-neutral-gray-7">
            {unidades} {unidades === 1 ? "unidade" : "unidades"} nesta tipologia
          </span>
        )}
      </div>
    </div>
  );
}
