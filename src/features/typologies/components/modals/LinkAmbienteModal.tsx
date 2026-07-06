"use client";

import React from "react";
import { Input as HeroInput } from "@heroui/react";

import { Button, Icon, Modal } from "@/components/ui";
import type { Ambiente, Tipologia } from "@/shared/types/domain";

import { guessAmbIcon } from "../../ambIcons";
import { SHARED } from "../../shared";
import { AmbIcon } from "../AmbIcon";

interface LinkAmbienteModalProps {
  open: boolean;
  onClose: () => void;
  currentTip: Tipologia;
  tipologias: Tipologia[];
  /** shareIds já vinculados nesta tipologia (evita vínculo duplicado). */
  linkedShareIds: Set<string>;
  getSourceSid: (ambId: string) => string;
  onPick: (srcTip: Tipologia, srcAmb: Ambiente) => void;
}

/** Picker de ambientes das OUTRAS tipologias para vincular na atual. */
export function LinkAmbienteModal({
  open,
  onClose,
  currentTip,
  tipologias,
  linkedShareIds,
  getSourceSid,
  onPick,
}: LinkAmbienteModalProps) {
  const [q, setQ] = React.useState("");
  React.useEffect(() => {
    if (open) setQ("");
  }, [open]);

  const ql = q.trim().toLowerCase();
  const others = tipologias.filter((t) => t.id !== currentTip.id);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Vincular ambiente de outra tipologia"
      width={560}
      actions={
        <Button variant="bordered" onPress={onClose}>
          Fechar
        </Button>
      }
    >
      <p className="mb-3 text-[13px] text-neutral-gray-7">
        Selecione um ambiente existente em outra planta. Ele será vinculado a esta tipologia e os
        componentes permanecerão sincronizados entre as plantas.
      </p>
      <HeroInput
        value={q}
        onValueChange={setQ}
        placeholder="Buscar ambiente ou tipologia..."
        variant="bordered"
        radius="sm"
        size="sm"
        startContent={<Icon name="search" size={14} className="text-neutral-gray-6" />}
        classNames={{
          base: "mb-3.5",
          inputWrapper: "!border-small h-[38px] border-neutral-gray-5 bg-white",
          input: "text-[13px]",
        }}
      />
      <div className="flex max-h-[46vh] flex-col gap-4 overflow-y-auto">
        {others.map((t) => {
          const ambs = t.ambientes.filter(
            (a) =>
              ql === "" ||
              a.nome.toLowerCase().includes(ql) ||
              t.nome.toLowerCase().includes(ql)
          );
          if (ambs.length === 0) return null;
          return (
            <div key={t.id}>
              <div className="mb-2 flex items-baseline gap-2">
                <span className="text-xs font-bold text-neutral-gray-9">{t.nome}</span>
                <span className="text-[11px] text-neutral-gray-6">
                  {t.ambientes.length} ambientes
                </span>
              </div>
              <div className="grid gap-1.5">
                {ambs.map((a) => {
                  const linked = linkedShareIds.has(getSourceSid(a.id));
                  return (
                    <button
                      key={a.id}
                      type="button"
                      disabled={linked}
                      onClick={() => !linked && onPick(t, a)}
                      style={
                        linked
                          ? undefined
                          : ({ "--shared-soft": SHARED.soft, "--shared-border": SHARED.border } as React.CSSProperties)
                      }
                      className={
                        linked
                          ? "flex w-full items-center gap-2.5 rounded-lg border border-neutral-gray-4 bg-neutral-gray-2 px-3 py-[9px] text-left opacity-75"
                          : "flex w-full items-center gap-2.5 rounded-lg border border-neutral-gray-4 bg-white px-3 py-[9px] text-left transition-colors hover:border-[var(--shared-border)] hover:bg-[var(--shared-soft)]"
                      }
                    >
                      <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-neutral-gray-2 text-neutral-gray-8">
                        <AmbIcon name={guessAmbIcon(a.nome)} size={16} />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-px">
                        <span className="truncate text-[13px] font-semibold text-neutral-gray-11">
                          {a.nome}
                        </span>
                        <span className="text-[11px] text-neutral-gray-7">
                          {a.componentes.length} componentes
                        </span>
                      </span>
                      {linked ? (
                        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-neutral-gray-6">
                          <Icon name="check" size={12} /> Já vinculado
                        </span>
                      ) : (
                        <span
                          className="inline-flex shrink-0 items-center gap-1 text-xs font-bold"
                          style={{ color: SHARED.icon }}
                        >
                          Vincular <Icon name="share" size={12} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
