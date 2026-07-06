"use client";

import React from "react";

import { Button, Icon, Input, Modal, Textarea } from "@/components/ui";
import { useUpdateTipologia } from "@/lib/hooks/useTipologiaMutations";
import { cn } from "@/lib/utils";
import type { Tipologia } from "@/shared/types/domain";

import { PLANTA_CARACTERISTICAS } from "../../shared";

interface EditTypologyModalProps {
  open: boolean;
  onClose: () => void;
  tip: Tipologia;
  /** Identificadores de grupos vinculados exibidos como chips (mock). */
  unitGroups: string[];
}

// Modal Editar tipologia. Persiste nome/descrição via store; quartos/suítes
// (derivados por regex), características, grupos vinculados e imagem da
// planta são locais como no protótipo (o domínio ainda não os comporta).
export function EditTypologyModal({ open, onClose, tip, unitGroups }: EditTypologyModalProps) {
  const updateTipologia = useUpdateTipologia();

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
  const [grupos, setGrupos] = React.useState<string[]>(unitGroups);
  const [grupoInput, setGrupoInput] = React.useState("");
  const [caracts, setCaracts] = React.useState<string[]>([]);
  const [blueprint, setBlueprint] = React.useState<{ name: string; url: string } | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    setNome(tip.nome);
    setDescricao(tip.descricao);
    setQuartos(String(defaults.quartos));
    setSuites(String(defaults.suites));
    setGrupos(unitGroups);
    setGrupoInput("");
    setCaracts([]);
    setBlueprint(null);
  }, [open, tip, defaults, unitGroups]);

  const addGrupo = () => {
    const g = grupoInput.trim();
    if (g && !grupos.includes(g)) {
      setGrupos((gs) => [...gs, g]);
      setGrupoInput("");
    }
  };
  const toggleCaract = (c: string) =>
    setCaracts((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]));
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setBlueprint({ name: f.name, url: URL.createObjectURL(f) });
    e.target.value = "";
  };

  const handleSave = () => {
    updateTipologia.mutate(
      { id: tip.id, patch: { nome: nome.trim() || tip.nome, descricao } },
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
      open={open}
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
          <SectionTitle sub="Vincule ou desvincule grupos de unidades desta tipologia.">
            Grupos de unidades vinculados
          </SectionTitle>
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {grupos.length === 0 && (
              <span className="text-xs text-neutral-gray-6">Nenhum grupo vinculado.</span>
            )}
            {grupos.map((g) => (
              <span
                key={g}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary-1 px-2.5 py-1 text-xs font-semibold text-primary-7"
              >
                {g}
                <button
                  type="button"
                  onClick={() => setGrupos((gs) => gs.filter((x) => x !== g))}
                  className="flex text-primary-7"
                >
                  <Icon name="close" size={11} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                label="Vincular grupo"
                value={grupoInput}
                onValueChange={setGrupoInput}
                placeholder="Ex: UG-AP-A-03 ou Vista Mar"
                small
              />
            </div>
            <Button variant="bordered" icon="plus" onPress={addGrupo}>
              Vincular
            </Button>
          </div>
        </div>

        <div className="border-t border-neutral-gray-4 pt-4">
          <SectionTitle sub="Selecione as personalizações estruturais disponíveis nesta planta.">
            Características da planta
          </SectionTitle>
          <div className="flex flex-wrap gap-2">
            {PLANTA_CARACTERISTICAS.map((c) => {
              const on = caracts.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCaract(c)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-[7px] text-xs font-semibold transition-colors",
                    on
                      ? "border-primary-7 bg-primary-1 text-primary-7"
                      : "border-neutral-gray-5 bg-white text-neutral-gray-8 hover:border-neutral-gray-6"
                  )}
                >
                  <Icon name={on ? "check" : "plus"} size={13} />
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-neutral-gray-4 pt-4">
          <SectionTitle>Imagem da planta</SectionTitle>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
          {blueprint ? (
            <div className="flex items-center gap-3 rounded-lg border border-neutral-gray-4 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={blueprint.url}
                alt="Planta"
                className="h-24 w-24 rounded-lg border border-neutral-gray-4 object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-neutral-gray-11">
                  {blueprint.name}
                </p>
                <p className="text-xs text-neutral-gray-7">Imagem carregada</p>
              </div>
              <div className="flex gap-1.5">
                <Button variant="bordered" size="sm" onPress={() => fileRef.current?.click()}>
                  Substituir
                </Button>
                <Button variant="ghost" size="sm" icon="trash" onPress={() => setBlueprint(null)}>
                  Remover
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-gray-5 bg-neutral-gray-2 p-6"
            >
              <Icon name="upload" size={26} className="text-neutral-gray-7" />
              <p className="text-[13px] font-semibold text-neutral-gray-9">
                Clique para enviar a imagem da planta
              </p>
              <p className="text-[11px] text-neutral-gray-6">PNG, JPG ou SVG até 10MB</p>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
