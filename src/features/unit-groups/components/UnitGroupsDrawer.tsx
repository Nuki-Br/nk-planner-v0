"use client";

import React from "react";
import { FocusScope } from "@react-aria/focus";

import { Button, Icon } from "@/components/ui";
import {
  useCreateUnitGroup,
  useDeleteUnitGroup,
  useTorres,
  useUnitGroups,
  useUpdateUnitGroup,
} from "@/lib/hooks/useUnitGroups";
import { cn } from "@/lib/utils";
import type { UnitGroup } from "@/shared/types/domain";

import { UnitGroupEditor, UnitGroupEditorEmpty } from "./UnitGroupEditor";

interface UnitGroupsDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Nome do empreendimento exibido no subtítulo. */
  empreendimento: string;
}

// Tela 5 — Grupos de unidades (modal master-detail em nível de
// empreendimento, protótipo: UnitGroupsDrawer). CRUD direto no store.
export function UnitGroupsDrawer({ open, onClose, empreendimento }: UnitGroupsDrawerProps) {
  const { data: groups = [] } = useUnitGroups();
  const { data: torres = [] } = useTorres();
  const createGroup = useCreateUnitGroup();
  const updateGroup = useUpdateUnitGroup();
  const deleteGroup = useDeleteUnitGroup();

  const [selectedId, setSelectedId] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setSelectedId((prev) =>
      groups.some((g) => g.id === prev) ? prev : (groups[0]?.id ?? null)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const selected = groups.find((g) => g.id === selectedId) ?? null;

  const handleRemove = (id: number) => {
    const idx = groups.findIndex((g) => g.id === id);
    const next = groups.filter((g) => g.id !== id);
    deleteGroup.mutate(id);
    setSelectedId(next.length > 0 ? (next[Math.max(0, idx - 1)]?.id ?? null) : null);
  };

  const handleAdd = () => {
    createGroup.mutate(
      { nome: "Novo grupo", torre: "", unidades: [] },
      { onSuccess: (g: UnitGroup) => setSelectedId(g.id) }
    );
  };

  // Agrupa por torre na ordem das torres + bucket "Sem torre definida".
  const torreNames = torres.map((t) => t.nome);
  const buckets = [
    ...torreNames.map((t) => ({ torre: t, items: groups.filter((g) => g.torre === t) })),
    { torre: "Sem torre definida", items: groups.filter((g) => !torreNames.includes(g.torre)) },
  ].filter((b) => b.items.length > 0);

  const totalUnidades = groups.reduce((a, g) => a + g.unidades.length, 0);

  return (
    <FocusScope contain restoreFocus autoFocus>
      <div
        className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/45 p-6"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ug-drawer-title"
          className="flex h-[600px] max-h-[90vh] w-[920px] max-w-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.22)]"
        >
        <div className="flex items-center justify-between border-b border-neutral-gray-3 px-6 py-[18px]">
          <div>
            <p id="ug-drawer-title" className="text-[17px] font-bold text-neutral-gray-11">
              Grupos de unidades
            </p>
            <p className="mt-0.5 text-xs text-neutral-gray-7">
              {empreendimento} · {groups.length} grupos · {totalUnidades} unidades
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex p-1 text-neutral-gray-7 hover:text-neutral-gray-10"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="flex w-[296px] min-w-[296px] flex-col border-r border-neutral-gray-3 bg-neutral-gray-2">
            <div className="flex-1 overflow-y-auto px-3 pb-1 pt-3">
              {buckets.map((b) => (
                <div key={b.torre} className="mb-3.5">
                  <div className="flex items-center gap-1.5 px-2 pb-2 pt-0.5">
                    <Icon name="building" size={13} className="text-neutral-gray-6" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-gray-6">
                      {b.torre}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {b.items.map((g) => {
                      const sel = g.id === selectedId;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setSelectedId(g.id)}
                          className={cn(
                            "rounded-lg border px-3 py-[9px] text-left transition-colors",
                            sel
                              ? "border-primary-7 bg-white"
                              : "border-transparent hover:bg-white/60"
                          )}
                        >
                          <p
                            className={cn(
                              "truncate text-[13px] font-semibold leading-tight",
                              sel ? "text-primary-7" : "text-neutral-gray-11"
                            )}
                          >
                            {g.nome || "Sem nome"}
                          </p>
                          <p className="mt-[3px] text-[11px] text-neutral-gray-7">
                            {g.unidades.length} unidade{g.unidades.length === 1 ? "" : "s"}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {groups.length === 0 && (
                <p className="px-3 py-6 text-center text-xs text-neutral-gray-6">
                  Nenhum grupo ainda.
                </p>
              )}
            </div>
            <div className="border-t border-neutral-gray-3 p-3">
              <Button icon="plus" fullWidth onPress={handleAdd} isLoading={createGroup.isPending}>
                Novo grupo
              </Button>
            </div>
          </div>

          {selected ? (
            <UnitGroupEditor
              key={selected.id}
              group={selected}
              torres={torreNames}
              onPatch={(patch) => updateGroup.mutate({ id: selected.id, patch })}
              onRemove={handleRemove}
            />
          ) : (
            <UnitGroupEditorEmpty />
          )}
        </div>
      </div>
      </div>
    </FocusScope>
  );
}
