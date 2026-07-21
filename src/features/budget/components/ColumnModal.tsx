"use client";

import React from "react";

import { Button, Input, Modal } from "@/components/ui";
import { evalCell, type Scope } from "@/lib/formula";
import { cn, fmtBRL } from "@/lib/utils";
import type { BudgetColumn } from "@/shared/types/domain";

import type { ScopeRef } from "../calc";
import { useFormulaSuggestions } from "../hooks/useFormulaSuggestions";

export interface ColumnDraft {
  nome: string;
  expr: string;
}

interface ColumnModalProps {
  open: boolean;
  onClose: () => void;
  /** Coluna em edição; null = nova coluna. */
  col: BudgetColumn | null;
  /** Escopo/refs de amostra (1ª linha) para a prévia da expressão. */
  scope: Scope;
  refs: ScopeRef[];
  isLoading?: boolean;
  onSubmit: (draft: ColumnDraft) => void;
}

/**
 * Criar/editar coluna do Construtor de Preço: nome + a expressão padrão
 * aplicada a todas as linhas. Substitui o rename inline + o popover "Nova
 * coluna", que eram dois caminhos separados e não expunham `expr`.
 */
export function ColumnModal({
  open,
  onClose,
  col,
  scope,
  refs,
  isLoading = false,
  onSubmit,
}: ColumnModalProps) {
  const isEdit = col !== null;

  const [nome, setNome] = React.useState("");
  const [expr, setExpr] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setNome(col?.nome ?? "");
    setExpr(col?.expr ?? "");
  }, [open, col]);

  const { sugg, withToken } = useFormulaSuggestions(expr, refs);
  const ev = evalCell(expr, scope);
  const valid = nome.trim() !== "" && !ev.error;

  const insert = (tok: string) => setExpr(withToken(tok));

  const handleSubmit = () => {
    if (!valid) return;
    onSubmit({ nome: nome.trim(), expr: expr.trim() });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar coluna" : "Nova coluna"}
      width={480}
      actions={
        <>
          <Button variant="bordered" onPress={onClose} isDisabled={isLoading}>
            Cancelar
          </Button>
          <Button onPress={handleSubmit} isDisabled={!valid} isLoading={isLoading}>
            {isEdit ? "Salvar alterações" : "Adicionar"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          label="Nome"
          autoFocus
          value={nome}
          onValueChange={setNome}
          placeholder="Ex: Taxa Construtora"
        />

        <div className="flex flex-col gap-1.5">
          <Input
            label="Expressão padrão"
            value={expr}
            onValueChange={setExpr}
            isInvalid={Boolean(ev.error)}
            errorMessage={ev.error}
            placeholder="Ex: =custo_troca * 8%"
            description="Aplicada a todas as linhas. Cada célula pode sobrescrevê-la individualmente."
          />

          {!ev.error && expr.trim() !== "" && (
            <span className="text-[11px] font-semibold text-primary-7">
              Prévia na primeira linha: {fmtBRL(ev.value)}
            </span>
          )}

          {sugg.length > 0 && (
            <div className="overflow-hidden rounded-md border border-neutral-gray-5">
              <div className="bg-neutral-gray-2 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-neutral-gray-6">
                Inserir referência
              </div>
              {sugg.map((r) => (
                <button
                  key={r.token}
                  type="button"
                  // mouseDown + preventDefault: insere sem tirar o foco do
                  // input, senão a lista some antes do clique registrar.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insert(r.token);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-2 py-[5px]",
                    "text-left hover:bg-primary-1"
                  )}
                >
                  <span className="font-mono text-xs font-semibold text-primary-8">
                    {r.token}
                  </span>
                  <span className="whitespace-nowrap text-[10px] text-neutral-gray-6">
                    {r.desc}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
