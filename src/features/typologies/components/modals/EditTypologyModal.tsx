"use client";

import React from "react";

import { Button, Input, Modal, Textarea } from "@/components/ui";
import { useUpdateTipologia } from "@/lib/hooks/useTipologiaMutations";
import type { Tipologia, UnitGroup } from "@/shared/types/domain";

import { UnitGroupsField } from "../UnitGroupLinks";
import { CaracteristicasPicker } from "./CaracteristicasPicker";

interface EditTypologyModalProps {
  onClose: () => void;
  tip: Tipologia;
  /** Todos os grupos de unidades do empreendimento. */
  unitGroups: UnitGroup[];
  tipNome: (tipologiaId: number) => string;
}

const mesmosIds = (a: readonly number[], b: readonly number[]) =>
  a.length === b.length && a.every((id) => b.includes(id));

// Modal Editar tipologia. Persiste nome/descrição e os grupos de unidades
// vinculados (a lista inteira, `unitGroupIds`); quartos/suítes (derivados por
// regex) e características são locais como no protótipo (o domínio ainda não
// os comporta).
//
// Montada só aberta (TypologiesScreen): o rascunho nasce da tipologia no
// momento de abrir. Antes um efeito o reiniciava a cada render — a lista de
// grupos chegava como array novo a cada vez —, e o que se removia sumia antes
// do salvar.
//
// A seção "Imagem da planta" foi REMOVIDA: além de imagem de planta ser assunto
// do Personaliza (docs/context/product.md), o campo era um mock morto — o
// handleSave nunca enviou a imagem, então ela sumia em silêncio ao salvar.
export function EditTypologyModal({ onClose, tip, unitGroups, tipNome }: EditTypologyModalProps) {
  const updateTipologia = useUpdateTipologia();
  const vinculados = React.useMemo(
    () => unitGroups.filter((g) => g.tipologiaId === tip.id).map((g) => g.id),
    [unitGroups, tip.id]
  );

  const defaults = React.useMemo(
    () => ({
      quartos: tip.ambientes.filter(
        (a) => /dormit|quarto|su[ií]te/i.test(a.nome) && !/banheiro/i.test(a.nome)
      ).length,
      suites: tip.ambientes.filter((a) => /^su[ií]te/i.test(a.nome.trim())).length,
    }),
    [tip]
  );

  const [nome, setNome] = React.useState(tip.nome);
  const [descricao, setDescricao] = React.useState(tip.descricao);
  const [quartos, setQuartos] = React.useState(String(defaults.quartos));
  const [suites, setSuites] = React.useState(String(defaults.suites));
  const [grupos, setGrupos] = React.useState<number[]>(vinculados);
  const [caracts, setCaracts] = React.useState<string[]>([]);

  const toggleCaract = (c: string) =>
    setCaracts((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]));

  const handleSave = () => {
    updateTipologia.mutate(
      {
        id: tip.id,
        patch: {
          nome: nome.trim() || tip.nome,
          descricao,
          // Só quando mudou: poupa duas idas ao banco no salvar comum.
          ...(mesmosIds(grupos, vinculados) ? {} : { unitGroupIds: grupos }),
        },
      },
      { onSuccess: onClose }
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
      open
      onClose={onClose}
      title="Editar tipologia"
      width={680}
      actions={
        <>
          <Button variant="bordered" onPress={onClose}>
            Cancelar
          </Button>
          <Button onPress={handleSave} isLoading={updateTipologia.isPending}>
            Salvar alterações
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-[18px]">
        <div className="flex flex-col gap-3">
          <Input label="Nome da tipologia" value={nome} onValueChange={setNome} />
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
          <SectionTitle sub="Grupos de unidades desta planta — as unidades da tipologia são as desses grupos.">
            Grupos de unidades vinculados
          </SectionTitle>
          <UnitGroupsField
            value={grupos}
            onChange={setGrupos}
            groups={unitGroups}
            tipologiaId={tip.id}
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
