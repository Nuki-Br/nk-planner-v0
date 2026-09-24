"use client";

import React from "react";

import { Button, Input, Modal, Textarea } from "@/components/ui";
import { useCreateTipologia } from "@/lib/hooks/useTipologiaMutations";
import { useActiveProjectId } from "@/lib/hooks/useActiveProject";
import { useTipologias } from "@/lib/hooks/useTipologias";
import { useUnitGroups } from "@/lib/hooks/useUnitGroups";
import type { Tipologia } from "@/shared/types/domain";

import { UnitGroupsField } from "../UnitGroupLinks";
import { CaracteristicasPicker } from "./CaracteristicasPicker";

interface NewTipologiaModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (tip: Tipologia) => void;
}

// Modal Nova tipologia — espelha o Editar tipologia (mesmas seções e ordem).
// Os grupos de unidades escolhidos são vinculados na criação (as unidades da
// tipologia derivam deles); quartos/suítes e características são locais como
// no protótipo (o domínio ainda não os comporta); metragem saiu da UI e nasce 0.
export function NewTipologiaModal({ open, onClose, onCreated }: NewTipologiaModalProps) {
  const projectId = useActiveProjectId();
  const createTipologia = useCreateTipologia(projectId ?? 0);
  const { data: unitGroups = [] } = useUnitGroups(projectId);
  const { data: tipologias = [] } = useTipologias(projectId);
  const tipNome = (id: number) => tipologias.find((t) => t.id === id)?.nome ?? "outra tipologia";
  const [nome, setNome] = React.useState("");
  const [descricao, setDescricao] = React.useState("");
  const [quartos, setQuartos] = React.useState("");
  const [suites, setSuites] = React.useState("");
  const [grupos, setGrupos] = React.useState<number[]>([]);
  const [caracts, setCaracts] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!open) return;
    setNome("");
    setDescricao("");
    setQuartos("");
    setSuites("");
    setGrupos([]);
    setCaracts([]);
  }, [open]);

  const toggleCaract = (c: string) =>
    setCaracts((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]));

  const handleCreate = () => {
    if (nome.trim() === "") return;
    createTipologia.mutate(
      {
        nome: nome.trim(),
        metragem: 0,
        descricao: descricao.trim(),
        ...(grupos.length > 0 ? { unitGroupIds: grupos } : {}),
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
          <SectionTitle sub="Grupos de unidades desta planta — as unidades da tipologia são as desses grupos. Você pode vincular depois.">
            Grupos de unidades
          </SectionTitle>
          <UnitGroupsField
            value={grupos}
            onChange={setGrupos}
            groups={unitGroups}
            tipologiaId={null}
            tipNome={tipNome}
          />
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
