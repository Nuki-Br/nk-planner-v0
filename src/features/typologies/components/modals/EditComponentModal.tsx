"use client";

import React from "react";

import { Button, Icon, Input, Modal, Select } from "@/components/ui";
import { cn, parseBR } from "@/lib/utils";
import type { Componente, Unidade } from "@/shared/types/domain";

const UNIDADE_OPTIONS = [
  { value: "m²", label: "m² — área" },
  { value: "ml", label: "ml — linear" },
  { value: "und", label: "und — peça" },
];

export interface ComponentEditValue {
  nome: string;
  unidade: Unidade;
  qtd: number;
  rt: number;
  ghost: boolean;
  ordem: number;
}

interface EditComponentModalProps {
  open: boolean;
  comp: Componente | null;
  ambNome: string;
  defaultOrdem: number;
  onClose: () => void;
  onSave: (value: ComponentEditValue) => void;
  saving?: boolean;
}

/** Modal Editar componente (nome, unidade, qtd, RT, fantasma, ordem). */
export function EditComponentModal({
  open,
  comp,
  ambNome,
  defaultOrdem,
  onClose,
  onSave,
  saving,
}: EditComponentModalProps) {
  const [nome, setNome] = React.useState("");
  const [unidade, setUnidade] = React.useState("m²");
  const [qtd, setQtd] = React.useState("");
  const [rt, setRt] = React.useState("");
  const [ghost, setGhost] = React.useState(false);
  const [ordem, setOrdem] = React.useState("");

  React.useEffect(() => {
    if (!open || !comp) return;
    setNome(comp.nome);
    setUnidade(comp.unidade);
    setQtd(String(comp.qtd));
    setRt(String(comp.rt));
    setGhost(!!comp.ghost);
    setOrdem(String(comp.ordem ?? defaultOrdem));
  }, [open, comp, defaultOrdem]);

  const handleSave = () => {
    if (!comp) return;
    onSave({
      nome: nome.trim() || comp.nome,
      unidade: unidade as Unidade,
      qtd: parseBR(qtd),
      rt: parseBR(rt),
      ghost,
      ordem: parseInt(ordem, 10) || 0,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar componente"
      actions={
        <>
          <Button variant="bordered" onPress={onClose}>
            Cancelar
          </Button>
          <Button onPress={handleSave} isLoading={saving}>
            Salvar alterações
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {ambNome && (
          <p className="text-xs text-neutral-gray-7">
            Ambiente: <strong className="text-neutral-gray-9">{ambNome}</strong>
          </p>
        )}
        <Input
          label="Nome do componente"
          value={nome}
          onValueChange={setNome}
          placeholder="Ex: Piso, Rodapé, Revestimento…"
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Select
            label="Unidade de medida"
            options={UNIDADE_OPTIONS}
            value={unidade}
            onValueChange={setUnidade}
            small
          />
          <Input label="Quantidade" value={qtd} onValueChange={setQtd} type="number" small placeholder="0,00" />
          <Input label="Tolerância RT (%)" value={rt} onValueChange={setRt} type="number" small placeholder="15" />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex h-16 flex-col justify-between rounded-lg border border-neutral-gray-13 bg-white px-3 py-2.5">
            <span className="text-[11px] text-neutral-gray-7">Componente fantasma</span>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setGhost((g) => !g)}
                title={ghost ? "Fantasma ativado" : "Ativar componente fantasma"}
                className={cn(
                  "flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border transition-colors",
                  ghost
                    ? "border-primary-7 bg-primary-1 text-primary-7"
                    : "border-neutral-gray-5 bg-white text-neutral-gray-6"
                )}
              >
                <Icon name="ghost" size={18} />
              </button>
              <span
                className={cn(
                  "text-xs",
                  ghost ? "font-bold text-primary-7" : "text-neutral-gray-7"
                )}
              >
                {ghost ? "Ativado" : "Desativado"}
              </span>
            </div>
          </div>
          <Input
            label="Ordem de renderização"
            value={ordem}
            onValueChange={setOrdem}
            type="number"
            small
          />
        </div>
      </div>
    </Modal>
  );
}
