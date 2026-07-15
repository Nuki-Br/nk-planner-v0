"use client";

import React from "react";

import { Button, Input, Modal } from "@/components/ui";
import { cn } from "@/lib/utils";

import { AMB_ICON_KEYS, guessAmbIcon } from "../../ambIcons";
import { AmbIcon } from "../AmbIcon";

export interface AmbienteFormValue {
  nome: string;
  icon: string;
}

interface AmbienteModalProps {
  open: boolean;
  mode: "add" | "edit";
  initial: (Partial<AmbienteFormValue> & { nome?: string }) | null;
  onClose: () => void;
  onSave: (value: AmbienteFormValue) => void;
  saving?: boolean;
}

function IconPickerModal({
  open,
  initial,
  onClose,
  onSelect,
}: {
  open: boolean;
  initial: string;
  onClose: () => void;
  onSelect: (icon: string) => void;
}) {
  const [sel, setSel] = React.useState(initial);
  React.useEffect(() => {
    if (open) setSel(initial || "apps");
  }, [open, initial]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Selecione um ícone"
      width={480}
      actions={
        <Button variant="teal" onPress={() => onSelect(sel)}>
          Selecionar
        </Button>
      }
    >
      <p className="mb-4 text-sm text-neutral-gray-9">
        Selecione um dos ícones disponíveis abaixo para o ambiente
      </p>
      <div className="grid grid-cols-6 gap-3">
        {AMB_ICON_KEYS.map((k) => {
          const on = sel === k;
          return (
            <button
              key={k}
              type="button"
              title={k}
              onClick={() => setSel(k)}
              className={cn(
                "flex aspect-square items-center justify-center rounded-xl border transition-colors",
                on
                  ? "border-primary-7 bg-primary-1 text-primary-7"
                  : "border-neutral-gray-5 bg-white text-neutral-gray-9 hover:border-neutral-gray-6"
              )}
            >
              <AmbIcon name={k} size={24} />
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

// Modal Adicionar/Editar ambiente: ícone (picker de 23) e nome*.
// Sem imagem: no Planner só o Material tem imagem (docs/context/product.md).
// "Local na planta" (BlueprintDrawModal) está ADIADO até haver planta real — o
// shape RoomShape fica reservado no domínio.
export function AmbienteModal({ open, mode, initial, onClose, onSave, saving }: AmbienteModalProps) {
  const [nome, setNome] = React.useState("");
  const [icon, setIcon] = React.useState("apps");
  const [showIcons, setShowIcons] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setNome(initial?.nome ?? "");
    setIcon(initial?.icon ?? guessAmbIcon(initial?.nome ?? ""));
    setShowIcons(false);
  }, [open, initial]);

  const title = mode === "edit" ? "Editar ambiente" : "Adicionar ambiente";
  const subtitle =
    mode === "edit"
      ? "Atualize as informações do ambiente abaixo"
      : "Para adicionar um ambiente preencha as informações abaixo";

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={title}
        actions={
          <>
            <Button variant="bordered" onPress={onClose}>
              Cancelar
            </Button>
            <Button
              variant="teal"
              isLoading={saving}
              onPress={() => onSave({ nome: nome.trim() || "Novo ambiente", icon })}
            >
              Salvar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-neutral-gray-7">{subtitle}</p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowIcons(true)}
              className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border border-neutral-gray-5 bg-white text-primary-7"
            >
              <AmbIcon name={icon} size={24} />
            </button>
            <button
              type="button"
              onClick={() => setShowIcons(true)}
              className="text-sm font-semibold text-primary-7"
            >
              Selecionar ícone
            </button>
          </div>

          <Input
            label="Nome *"
            value={nome}
            onValueChange={setNome}
            placeholder="Digite o nome do ambiente"
          />
        </div>
      </Modal>

      <IconPickerModal
        open={showIcons}
        initial={icon}
        onClose={() => setShowIcons(false)}
        onSelect={(k) => {
          setIcon(k);
          setShowIcons(false);
        }}
      />
    </>
  );
}
