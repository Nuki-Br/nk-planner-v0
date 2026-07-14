"use client";

import React from "react";

import { Button, EmptyState, Input, Select } from "@/components/ui";
import type { UnitGroup } from "@/shared/types/domain";

import { UnitNumberInput } from "./UnitNumberInput";

interface UnitGroupEditorProps {
  group: UnitGroup;
  torres: string[];
  onPatch: (patch: Partial<Omit<UnitGroup, "id">>) => void;
  onRemove: (id: number) => void;
}

export function UnitGroupEditorEmpty() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <EmptyState
        icon="building"
        title="Selecione um grupo"
        subtitle="Escolha um grupo à esquerda para editar, ou crie um novo."
      />
    </div>
  );
}

/**
 * Painel direito do drawer. Os campos são estado LOCAL (montar com
 * key={group.id}): a digitação fica fluida e cada mudança dispara a mutation
 * em segundo plano — o refetch confirma o mesmo valor.
 */
export function UnitGroupEditor({ group, torres, onPatch, onRemove }: UnitGroupEditorProps) {
  const [confirming, setConfirming] = React.useState(false);
  const [nome, setNome] = React.useState(group.nome);
  const [torre, setTorre] = React.useState(group.torre);
  const [unidades, setUnidades] = React.useState(group.unidades);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-7 py-6">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-gray-6">
            Editando grupo
          </span>
          {confirming ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-functional-error">Remover grupo?</span>
              <Button variant="ghost" size="sm" onPress={() => setConfirming(false)}>
                Não
              </Button>
              <Button variant="danger" size="sm" onPress={() => onRemove(group.id)}>
                Sim, remover
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" icon="trash" onPress={() => setConfirming(true)}>
              Remover grupo
            </Button>
          )}
        </div>

        <Input
          label="Nome do grupo"
          value={nome}
          onValueChange={(v) => {
            setNome(v);
            onPatch({ nome: v });
          }}
          placeholder="Ex: Coluna final 01 — Vista Parque"
        />

        <Select
          label="Torre"
          placeholder="Selecione a torre…"
          options={torres.map((t) => ({ value: t, label: t }))}
          value={torre}
          onValueChange={(v) => {
            setTorre(v);
            onPatch({ torre: v });
          }}
        />

        <div className="border-t border-neutral-gray-4 pt-4">
          <UnitNumberInput
            values={unidades}
            onChange={(v) => {
              setUnidades(v);
              onPatch({ unidades: v });
            }}
          />
        </div>
      </div>
    </div>
  );
}
