"use client";

import { Button, ProgressBar, StatusBadge } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Tipologia } from "@/shared/types/domain";

import { ActBtn } from "./primitives";

interface BlueprintRailProps {
  blueprints: Tipologia[];
  selId: number;
  onSelect: (id: number) => void;
  onNew: () => void;
  onEdit: (tip: Tipologia) => void;
  onDuplicate: (tip: Tipologia) => void;
  onDelete: (tip: Tipologia) => void;
}

const comps = (t: Tipologia) => t.ambientes.reduce((a, b) => a + b.componentes.length, 0);
const configured = (t: Tipologia) =>
  t.ambientes.reduce(
    (a, b) => a + b.componentes.filter((c) => c.options.some((o) => !o.isDefault)).length,
    0
  );

/** Rail esquerdo do canvas: seletor visual + CRUD de tipologias. */
export function BlueprintRail({
  blueprints,
  selId,
  onSelect,
  onNew,
  onEdit,
  onDuplicate,
  onDelete,
}: BlueprintRailProps) {
  return (
    <div className="flex h-full w-[244px] min-w-[244px] flex-col border-r border-neutral-gray-3 bg-white">
      <div className="flex items-center justify-between px-4 pb-2.5 pt-3.5">
        <span className="text-[13px] font-bold text-neutral-gray-11">Tipologias</span>
        <span className="text-[11px] text-neutral-gray-6">{blueprints.length} plantas</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3">
        {blueprints.map((tip) => {
          const sel = tip.id === selId;
          const tot = comps(tip);
          const cfg = configured(tip);
          return (
            <div
              key={tip.id}
              onClick={() => onSelect(tip.id)}
              className={cn(
                "group relative cursor-pointer rounded-lg px-3.5 py-3 transition-colors",
                sel ? "border-2 border-primary-7 bg-primary-1" : "border border-neutral-gray-5 bg-white"
              )}
            >
              <div className="mb-1.5 flex items-start justify-between gap-1.5">
                <span
                  className={cn(
                    "text-[12.5px] font-bold leading-snug",
                    sel ? "text-primary-7" : "text-neutral-gray-11"
                  )}
                >
                  {tip.nome}
                </span>
                <StatusBadge status={tip.status} />
              </div>
              <p className="mb-2 line-clamp-2 text-[10.5px] leading-snug text-neutral-gray-7">
                {tip.descricao || "Sem descrição"}
              </p>
              <div className="mb-2 flex gap-2.5 text-[10.5px] text-neutral-gray-7">
                <span>
                  <strong className="text-neutral-gray-11">{tip.unidades}</strong> un.
                </span>
                <span>
                  <strong className="text-neutral-gray-11">{tip.ambientes.length}</strong> amb.
                </span>
                <span>
                  <strong className="text-neutral-gray-11">
                    {cfg}/{tot}
                  </strong>{" "}
                  comp.
                </span>
              </div>
              <ProgressBar value={cfg} max={tot || 1} />
              <div className="absolute right-2 top-2 flex gap-0.5 rounded-[7px] border border-neutral-gray-4 bg-white p-0.5 opacity-0 shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition-opacity group-hover:opacity-100">
                <ActBtn icon="edit" title="Editar" onClick={() => onEdit(tip)} />
                <ActBtn icon="copy" title="Duplicar" onClick={() => onDuplicate(tip)} />
                <ActBtn icon="trash" title="Excluir" danger onClick={() => onDelete(tip)} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-neutral-gray-3 px-3 py-2.5">
        <Button variant="bordered" size="sm" icon="plus" fullWidth onPress={onNew}>
          Nova tipologia
        </Button>
      </div>
    </div>
  );
}
