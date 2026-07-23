"use client";

import React from "react";

import { Button, Icon, Input, Modal, Select } from "@/components/ui";
import { UNIDADE_OPTIONS } from "@/shared/constants/unidades";

import type { CostRegistro, Unidade } from "@/shared/types/domain";

export interface RegistroValue {
  nome: string;
  valorUnitario: number;
  unidade: Unidade;
  qtd: number;
}

/**
 * Cria/edita uma linha de custo avulsa (registro) do ambiente. Nome em texto
 * livre e valor unitário digitado — não vincula a nenhum componente nem
 * material. Só consta como custo na tabela.
 */
export function RegistroModal({
  open,
  editing,
  ambNome,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  /** null = criando. */
  editing: CostRegistro | null;
  ambNome: string;
  saving: boolean;
  onClose: () => void;
  onSave: (v: RegistroValue) => void;
}) {
  const [nome, setNome] = React.useState("");
  const [valor, setValor] = React.useState("");
  const [unidade, setUnidade] = React.useState<Unidade>("m²");
  const [qtd, setQtd] = React.useState("1");

  const seededRef = React.useRef(false);
  React.useEffect(() => {
    if (!open) {
      seededRef.current = false;
      return;
    }
    if (seededRef.current) return;
    seededRef.current = true;
    setNome(editing?.nome ?? "");
    setValor(editing ? String(editing.valorUnitario) : "");
    setUnidade(editing?.unidade ?? "m²");
    setQtd(String(editing?.qtd || 1));
  }, [open, editing]);

  const valorNum = parseFloat(valor.replace(",", ".")) || 0;
  const qtdNum = parseFloat(qtd.replace(",", ".")) || 0;
  const invalido = nome.trim() === "" || valorNum <= 0 || qtdNum <= 0;

  const submit = () => {
    onSave({ nome: nome.trim(), valorUnitario: valorNum, unidade, qtd: qtdNum });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      width={520}
      title={editing ? "Editar item de custo" : "Novo item de custo"}
      actions={
        <>
          <Button variant="bordered" onPress={onClose}>
            Cancelar
          </Button>
          <Button isDisabled={invalido} isLoading={saving} onPress={submit}>
            {editing ? "Salvar" : "Adicionar"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-neutral-gray-4 bg-neutral-gray-2 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="rounded bg-neutral-gray-3 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-neutral-gray-7">
              Item de custo · só registro
            </span>
            <span className="text-xs font-semibold text-neutral-gray-9">{ambNome}</span>
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-neutral-gray-7">
            Linha avulsa do ambiente, com nome livre — <strong>não vinculada a nenhum
            componente</strong>. Só consta como custo na tabela: não é ofertada ao cliente, não
            gera crédito nem afeta a troca.
          </p>
        </div>

        <Input
          label="Nome"
          value={nome}
          onValueChange={setNome}
          placeholder="Parede — Pintura látex, Impermeabilização…"
          description="Texto livre — aparece como linha própria na seção padrão"
        />

        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Valor unitário (R$)"
            type="number"
            step="0.01"
            value={valor}
            onValueChange={setValor}
            placeholder="0,00"
          />
          <Select
            label="Unidade"
            value={unidade}
            onValueChange={(v) => setUnidade(v as Unidade)}
            options={UNIDADE_OPTIONS}
          />
          <Input
            label="Quantidade"
            type="number"
            step="0.01"
            value={qtd}
            onValueChange={setQtd}
            description="Já com a RT embutida"
          />
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-neutral-gray-2 px-3 py-2">
          <Icon name="info" size={13} className="mt-px shrink-0 text-neutral-gray-7" />
          <p className="text-[11px] leading-snug text-neutral-gray-8">
            Vale para <strong>todas as tipologias</strong> que usam &ldquo;{ambNome}&rdquo; —
            definição e quantidade são compartilhadas.
          </p>
        </div>
      </div>
    </Modal>
  );
}
