"use client";

import React from "react";

import { Button, Icon, Input, Modal } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { AmbienteImagem } from "@/shared/types/domain";

import { AMB_ICON_KEYS, guessAmbIcon } from "../../ambIcons";
import { AmbIcon } from "../AmbIcon";

export interface AmbienteFormValue {
  nome: string;
  icon: string;
  imagem: AmbienteImagem | null;
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

// Modal Adicionar/Editar ambiente: ícone (picker de 23), nome* e imagem
// base. "Local na planta" (BlueprintDrawModal) está ADIADO até haver planta
// real — o shape RoomShape fica reservado no domínio.
export function AmbienteModal({ open, mode, initial, onClose, onSave, saving }: AmbienteModalProps) {
  const [nome, setNome] = React.useState("");
  const [icon, setIcon] = React.useState("apps");
  const [imagem, setImagem] = React.useState<AmbienteImagem | null>(null);
  const [showIcons, setShowIcons] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    setNome(initial?.nome ?? "");
    setIcon(initial?.icon ?? guessAmbIcon(initial?.nome ?? ""));
    setImagem(initial?.imagem ?? null);
    setShowIcons(false);
  }, [open, initial]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setImagem({ name: f.name, url: URL.createObjectURL(f) });
    e.target.value = "";
  };

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
              onPress={() => onSave({ nome: nome.trim() || "Novo ambiente", icon, imagem })}
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

          <div className="border-t border-neutral-gray-4 pt-4">
            <p className="text-[13px] font-bold text-neutral-gray-11">Imagem base</p>
            <p className="mb-3 mt-0.5 text-xs text-neutral-gray-7">
              Imagem de referência do ambiente (render ou foto).
            </p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
            {imagem ? (
              <div className="flex items-center gap-3 rounded-lg border border-neutral-gray-4 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagem.url}
                  alt="Imagem base"
                  className="h-[72px] w-[72px] rounded-lg border border-neutral-gray-4 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-neutral-gray-11">
                    {imagem.name}
                  </p>
                  <p className="text-xs text-neutral-gray-7">Imagem carregada</p>
                </div>
                <div className="flex gap-1.5">
                  <Button variant="bordered" size="sm" onPress={() => fileRef.current?.click()}>
                    Substituir
                  </Button>
                  <Button variant="ghost" size="sm" icon="trash" onPress={() => setImagem(null)}>
                    Remover
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-neutral-gray-5 bg-neutral-gray-2 p-[18px]"
              >
                <Icon name="upload" size={24} className="text-neutral-gray-7" />
                <p className="text-[13px] font-semibold text-neutral-gray-9">
                  Clique para enviar a imagem base
                </p>
                <p className="text-[11px] text-neutral-gray-6">PNG, JPG ou SVG até 10MB</p>
              </button>
            )}
          </div>
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
