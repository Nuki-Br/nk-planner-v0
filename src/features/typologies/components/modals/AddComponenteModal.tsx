"use client";

import React from "react";

import { Button, Input, Modal, Select } from "@/components/ui";
import { useCreateComponente } from "@/lib/hooks/useTipologiaMutations";
import { parseBR } from "@/lib/utils";
import type { Ambiente, Unidade } from "@/shared/types/domain";

const UNIDADE_OPTIONS = [
  { value: "m²", label: "m² — área" },
  { value: "ml", label: "ml — linear" },
  { value: "und", label: "und — peça" },
];

interface AddComponenteModalProps {
  open: boolean;
  onClose: () => void;
  tipologiaId: number;
  ambiente: Ambiente | null;
}

/** Modal Adicionar componente (material padrão é definido depois, na etapa de materiais). */
export function AddComponenteModal({
  open,
  onClose,
  tipologiaId,
  ambiente,
}: AddComponenteModalProps) {
  const createComponente = useCreateComponente();
  const [nome, setNome] = React.useState("");
  const [unidade, setUnidade] = React.useState("m²");
  const [qtd, setQtd] = React.useState("");
  const [rt, setRt] = React.useState("15");

  React.useEffect(() => {
    if (!open) return;
    setNome("");
    setUnidade("m²");
    setQtd("");
    setRt("15");
  }, [open]);

  const handleAdd = () => {
    if (!ambiente || nome.trim() === "") return;
    createComponente.mutate(
      {
        tipologiaId,
        ambienteId: ambiente.blueprintRoomId,
        input: {
          nome: nome.trim(),
          unidade: unidade as Unidade,
          qtd: parseBR(qtd),
          rt: parseBR(rt),
          padraoBaseId: null,
        },
      },
      { onSuccess: onClose }
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={ambiente ? `Novo componente — ${ambiente.nome}` : "Novo componente"}
      actions={
        <>
          <Button variant="bordered" onPress={onClose}>
            Cancelar
          </Button>
          <Button
            onPress={handleAdd}
            isDisabled={nome.trim() === ""}
            isLoading={createComponente.isPending}
          >
            Adicionar componente
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Input
          label="Nome do componente"
          value={nome}
          onValueChange={setNome}
          placeholder="Ex: Piso, Rodapé, Revestimento de parede, Cuba…"
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Select label="Unidade" options={UNIDADE_OPTIONS} value={unidade} onValueChange={setUnidade} small />
          <Input label="Quantidade" value={qtd} onValueChange={setQtd} type="number" small placeholder="0,00" />
          <Input label="Tolerância RT (%)" value={rt} onValueChange={setRt} type="number" small placeholder="15" />
        </div>
      </div>
    </Modal>
  );
}
