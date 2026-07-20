"use client";

import React from "react";

import { Button, Input, Modal, Select } from "@/components/ui";
import { parseBR } from "@/lib/utils";
import { UNIDADE_OPTIONS } from "@/shared/constants/unidades";
import type { Componente, Unidade } from "@/shared/types/domain";

export interface ComponentEditValue {
  nome: string;
  unidade: Unidade;
  qtd: number;
  rt: number;
}

interface EditComponentModalProps {
  open: boolean;
  comp: Componente | null;
  ambNome: string;
  onClose: () => void;
  onSave: (value: ComponentEditValue) => void;
  saving?: boolean;
}

/** Modal Editar componente (nome, unidade, qtd, RT). */
export function EditComponentModal({
  open,
  comp,
  ambNome,
  onClose,
  onSave,
  saving,
}: EditComponentModalProps) {
  const [nome, setNome] = React.useState("");
  const [unidade, setUnidade] = React.useState("m²");
  const [qtd, setQtd] = React.useState("");
  const [rt, setRt] = React.useState("");

  React.useEffect(() => {
    if (!open || !comp) return;
    setNome(comp.nome);
    setUnidade(comp.unidade);
    setQtd(String(comp.qtd));
    setRt(comp.rt ? String(comp.rt) : "");
  }, [open, comp]);

  const handleSave = () => {
    if (!comp) return;
    onSave({
      nome: nome.trim() || comp.nome,
      unidade: unidade as Unidade,
      qtd: parseBR(qtd),
      rt: parseBR(rt),
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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Select
            label="Unidade de medida"
            options={UNIDADE_OPTIONS}
            value={unidade}
            onValueChange={setUnidade}
            small
          />
          <Input label="Quantidade" value={qtd} onValueChange={setQtd} type="number" small placeholder="0,00" />
        </div>
        <Input label="Tolerância RT (%)" value={rt} onValueChange={setRt} type="number" small placeholder="15" />
      </div>
    </Modal>
  );
}
