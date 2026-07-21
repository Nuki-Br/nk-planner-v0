"use client";

import React from "react";

import { Button, Icon, Input } from "@/components/ui";

export interface TowerDraft {
  /** Tower id; null = torre nova (ainda não salva). */
  id: number | null;
  nome: string;
}

interface TowersEditorProps {
  towers: TowerDraft[];
  onChange: (towers: TowerDraft[]) => void;
  /** Contagem de grupos de unidades por nome de torre — aviso na remoção. */
  groupCountByTorre: (nome: string) => number;
}

/** Lista editável de torres/blocos (adicionar, renomear, remover). */
export function TowersEditor({ towers, onChange, groupCountByTorre }: TowersEditorProps) {
  // Índice da linha aguardando confirmação de remoção (só quando há grupos).
  const [confirming, setConfirming] = React.useState<number | null>(null);

  const setNome = (index: number, nome: string) =>
    onChange(towers.map((t, i) => (i === index ? { ...t, nome } : t)));

  const remove = (index: number) => {
    setConfirming(null);
    onChange(towers.filter((_, i) => i !== index));
  };

  const handleRemoveClick = (index: number) => {
    const t = towers[index];
    if (t && t.id != null && groupCountByTorre(t.nome) > 0) setConfirming(index);
    else remove(index);
  };

  return (
    <div className="flex flex-col gap-2.5">
      {towers.length === 0 && (
        <p className="rounded-lg border border-dashed border-neutral-gray-5 p-3.5 text-center text-xs text-neutral-gray-6">
          Nenhuma torre cadastrada — o empreendimento pode ter uma ou várias.
        </p>
      )}
      {towers.map((t, i) => {
        const groups = t.id != null ? groupCountByTorre(t.nome) : 0;
        return (
          <div key={t.id ?? `new-${i}`} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Input
                aria-label={`Nome da torre ${i + 1}`}
                value={t.nome}
                onValueChange={(v) => setNome(i, v)}
                placeholder={`Ex: Torre ${String.fromCharCode(65 + i)}`}
                small
                className="flex-1"
              />
              {confirming === i ? (
                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="ghost" size="sm" onPress={() => setConfirming(null)}>
                    Não
                  </Button>
                  <Button variant="danger" size="sm" onPress={() => remove(i)}>
                    Sim, remover
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  title="Remover torre"
                  onClick={() => handleRemoveClick(i)}
                  className="flex shrink-0 p-1.5 text-neutral-gray-6 hover:text-functional-error"
                >
                  <Icon name="trash" size={15} />
                </button>
              )}
            </div>
            {confirming === i && (
              <p className="text-xs font-semibold text-functional-error">
                {groups} grupo{groups === 1 ? "" : "s"} de unidades ficar
                {groups === 1 ? "á" : "ão"} sem torre definida. Remover?
              </p>
            )}
          </div>
        );
      })}
      <div>
        <Button
          variant="ghost"
          size="sm"
          icon="plus"
          onPress={() => onChange([...towers, { id: null, nome: "" }])}
        >
          Adicionar torre
        </Button>
      </div>
    </div>
  );
}
