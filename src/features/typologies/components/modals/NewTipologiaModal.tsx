"use client";

import React from "react";

import { Button, Icon, Input, Modal, Textarea } from "@/components/ui";
import { useCreateTipologia } from "@/lib/hooks/useTipologiaMutations";
import type { Tipologia } from "@/shared/types/domain";

import { CaracteristicasPicker } from "./CaracteristicasPicker";

interface NewTipologiaModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (tip: Tipologia) => void;
}

// Modal Nova tipologia — espelha o Editar tipologia (mesmas seções e ordem).
// Quartos/suítes, características e grupos são locais como no protótipo (o
// domínio ainda não os comporta); metragem/unidades saíram da UI e nascem 0.
export function NewTipologiaModal({ open, onClose, onCreated }: NewTipologiaModalProps) {
  const createTipologia = useCreateTipologia();
  const [nome, setNome] = React.useState("");
  const [descricao, setDescricao] = React.useState("");
  const [quartos, setQuartos] = React.useState("");
  const [suites, setSuites] = React.useState("");
  const [grupoInput, setGrupoInput] = React.useState("");
  const [grupos, setGrupos] = React.useState<string[]>([]);
  const [caracts, setCaracts] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!open) return;
    setNome("");
    setDescricao("");
    setQuartos("");
    setSuites("");
    setGrupoInput("");
    setGrupos([]);
    setCaracts([]);
  }, [open]);

  const addGrupo = () => {
    const g = grupoInput.trim().toUpperCase();
    if (g && !grupos.includes(g)) {
      setGrupos((gs) => [...gs, g]);
      setGrupoInput("");
    }
  };
  const toggleCaract = (c: string) =>
    setCaracts((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]));

  const handleCreate = () => {
    if (nome.trim() === "") return;
    createTipologia.mutate(
      {
        nome: nome.trim(),
        metragem: 0,
        unidades: 0,
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

  const SectionTitle = ({ children, sub }: { children: React.ReactNode; sub?: string }) => (
    <div>
      <p className="text-[13px] font-bold text-neutral-gray-11">{children}</p>
      {sub && <p className="mb-3 mt-0.5 text-xs text-neutral-gray-7">{sub}</p>}
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nova tipologia"
      width={680}
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
      <div className="flex flex-col gap-[18px]">
        <div className="flex flex-col gap-3">
          <Input
            label="Nome da tipologia"
            value={nome}
            onValueChange={setNome}
            placeholder="Ex: Planta D — 180m²"
          />
          <Textarea
            label="Descrição"
            value={descricao}
            onValueChange={setDescricao}
            placeholder="Ex: 3 dormitórios (1 suíte master), sala ampla, varanda gourmet…"
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input label="Número de quartos" value={quartos} onValueChange={setQuartos} type="number" small />
            <Input label="Número de suítes" value={suites} onValueChange={setSuites} type="number" small />
          </div>
        </div>

        <div className="border-t border-neutral-gray-4 pt-4">
          <SectionTitle sub="Subconjuntos de unidades com precificação independente — ex: andares altos, vista privilegiada.">
            Grupos de unidades
          </SectionTitle>
          {grupos.length > 0 && (
            <div className="mb-2.5 flex flex-wrap gap-1.5">
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
          )}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                label="Identificador do grupo"
                value={grupoInput}
                onValueChange={setGrupoInput}
                placeholder="Ex: UG-AP-A-01 ou Vista Mar"
                small
              />
            </div>
            <Button variant="bordered" icon="plus" onPress={addGrupo}>
              Adicionar grupo
            </Button>
          </div>
          {grupos.length === 0 && (
            <p className="mt-2 text-[11px] text-neutral-gray-5">
              Nenhum grupo. Você pode adicionar depois.
            </p>
          )}
        </div>

        <div className="border-t border-neutral-gray-4 pt-4">
          <SectionTitle sub="Selecione as personalizações estruturais disponíveis nesta planta.">
            Características da planta
          </SectionTitle>
          <CaracteristicasPicker value={caracts} onToggle={toggleCaract} />
        </div>
      </div>
    </Modal>
  );
}
