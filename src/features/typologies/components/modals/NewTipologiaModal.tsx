"use client";

import React from "react";

import { Button, Icon, Input, Modal, Textarea } from "@/components/ui";
import { useCreateTipologia } from "@/lib/hooks/useTipologiaMutations";
import { parseBR } from "@/lib/utils";
import type { Tipologia } from "@/shared/types/domain";

interface NewTipologiaModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (tip: Tipologia) => void;
}

/** Modal Nova tipologia (grupos de unidades aqui são identificadores mock, como no protótipo). */
export function NewTipologiaModal({ open, onClose, onCreated }: NewTipologiaModalProps) {
  const createTipologia = useCreateTipologia();
  const [nome, setNome] = React.useState("");
  const [metragem, setMetragem] = React.useState("");
  const [unidades, setUnidades] = React.useState("");
  const [descricao, setDescricao] = React.useState("");
  const [grupoInput, setGrupoInput] = React.useState("");
  const [grupos, setGrupos] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!open) return;
    setNome("");
    setMetragem("");
    setUnidades("");
    setDescricao("");
    setGrupoInput("");
    setGrupos([]);
  }, [open]);

  const addGrupo = () => {
    const g = grupoInput.trim().toUpperCase();
    if (g && !grupos.includes(g)) {
      setGrupos((gs) => [...gs, g]);
      setGrupoInput("");
    }
  };

  const handleCreate = () => {
    if (nome.trim() === "") return;
    createTipologia.mutate(
      {
        nome: nome.trim(),
        metragem: parseBR(metragem),
        unidades: Math.round(parseBR(unidades)),
        descricao: descricao.trim(),
      },
      {
        onSuccess: (tip) => {
          onCreated(tip);
          onClose();
        },
      }
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nova tipologia"
      width={560}
      actions={
        <>
          <Button variant="bordered" onPress={onClose}>
            Cancelar
          </Button>
          <Button
            onPress={handleCreate}
            isDisabled={nome.trim() === ""}
            isLoading={createTipologia.isPending}
          >
            Criar tipologia
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Input
          label="Nome da tipologia"
          value={nome}
          onValueChange={setNome}
          placeholder="Ex: Planta D — 180m²"
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input label="Metragem (m²)" value={metragem} onValueChange={setMetragem} type="number" />
          <Input label="Nº de unidades" value={unidades} onValueChange={setUnidades} type="number" />
        </div>
        <Textarea
          label="Descrição do layout"
          value={descricao}
          onValueChange={setDescricao}
          placeholder="Ex: 4 dormitórios, sendo 2 suítes..."
        />

        <div className="border-t border-neutral-gray-4 pt-3.5">
          <p className="text-[13px] font-bold text-neutral-gray-9">Grupos de unidades</p>
          <p className="mb-3 mt-1 text-xs text-neutral-gray-7">
            Subconjuntos de unidades com precificação independente — ex: andares altos, vista
            privilegiada.
          </p>
          <Input
            label="Identificador do grupo"
            value={grupoInput}
            onValueChange={setGrupoInput}
            placeholder="Ex: UG-AP-A-01 ou Vista Mar"
          />
          <div className="mt-2">
            <Button variant="bordered" size="sm" icon="plus" onPress={addGrupo}>
              Adicionar grupo
            </Button>
          </div>
          {grupos.length > 0 ? (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {grupos.map((g, i) => (
                <span
                  key={g}
                  className="inline-flex items-center gap-[5px] rounded-full bg-primary-1 px-2.5 py-1 text-xs font-semibold text-primary-7"
                >
                  {g}
                  <button
                    type="button"
                    onClick={() => setGrupos((gs) => gs.filter((_, j) => j !== i))}
                    className="flex text-primary-7"
                  >
                    <Icon name="close" size={11} />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-neutral-gray-5">
              Nenhum grupo. Você pode adicionar depois.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
