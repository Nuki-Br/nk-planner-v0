"use client";

import React from "react";

import { Button, Input, Modal, Textarea } from "@/components/ui";
import { parseBR } from "@/lib/utils";
import type { Tipologia } from "@/shared/types/domain";

export interface TipFormValue {
  nome: string;
  descricao: string;
  metragem: number;
}

interface TipFormModalProps {
  open: boolean;
  mode: "add" | "edit";
  initial: Tipologia | null;
  onClose: () => void;
  onSave: (value: TipFormValue) => void;
  saving?: boolean;
}

/**
 * Criar/editar tipologia (rail do canvas). Sem "Nº de unidades": as unidades
 * derivam dos grupos de unidades vinculados (tela de Tipologias).
 */
export function TipFormModal({ open, mode, initial, onClose, onSave, saving }: TipFormModalProps) {
  const [nome, setNome] = React.useState("");
  const [descricao, setDescricao] = React.useState("");
  const [metragem, setMetragem] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setNome(initial?.nome ?? "");
    setDescricao(initial?.descricao ?? "");
    setMetragem(initial ? String(initial.metragem || "") : "");
  }, [open, initial]);

  const save = () =>
    onSave({
      nome: nome.trim() || "Nova tipologia",
      descricao: descricao.trim(),
      metragem: parseBR(metragem),
    });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "edit" ? "Editar tipologia" : "Nova tipologia"}
      actions={
        <>
          <Button variant="bordered" onPress={onClose}>
            Cancelar
          </Button>
          <Button onPress={save} isLoading={saving}>
            {mode === "edit" ? "Salvar" : "Criar tipologia"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Input
          label="Nome da tipologia"
          value={nome}
          onValueChange={setNome}
          placeholder="Ex: Planta D — 180m²"
        />
        <Input label="Metragem (m²)" value={metragem} onValueChange={setMetragem} type="number" small />
        <Textarea
          label="Descrição do layout"
          value={descricao}
          onValueChange={setDescricao}
          placeholder="Ex: 3 dormitórios (1 suíte master)…"
        />
      </div>
    </Modal>
  );
}
