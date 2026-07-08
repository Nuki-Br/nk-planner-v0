"use client";

import React from "react";

import { Button, Card, Icon } from "@/components/ui";
import { useAppendComment, useComments } from "@/lib/hooks/useComments";
import { cn } from "@/lib/utils";

export interface ThreadRow {
  /** rowKey `${compId}-${optId}` — chave da thread no store. */
  key: string;
  especificacao: string;
  ambiente: string;
  componente: string;
}

// Painel de thread de comentários (construtor-shared do protótipo) —
// centralizado aqui para reuso na Revisão de custos (Fase 8). Diferencial:
// os comentários vêm do store (persistem) em vez de rascunho local.
export function CommentThreadPanel({
  row,
  onClose,
}: {
  row: ThreadRow;
  onClose: () => void;
}) {
  const { data: comentarios = [] } = useComments(row.key);
  const appendComment = useAppendComment();
  const [newComment, setNewComment] = React.useState("");
  React.useEffect(() => {
    setNewComment("");
  }, [row.key]);

  const send = () => {
    const texto = newComment.trim();
    if (texto === "") return;
    appendComment.mutate(
      { rowKey: row.key, input: { autor: "incorporadora", texto } },
      { onSuccess: () => setNewComment("") }
    );
  };

  return (
    <Card className="flex max-h-[calc(100vh-100px)] flex-col">
      <div className="mb-3 flex items-start justify-between border-b border-neutral-gray-4 pb-3">
        <div>
          <p className="mb-0.5 text-xs font-bold text-neutral-gray-11">
            {row.especificacao.length > 38
              ? row.especificacao.substring(0, 38) + "…"
              : row.especificacao}
          </p>
          <p className="text-[11px] text-neutral-gray-7">
            {row.ambiente} · {row.componente}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="flex text-neutral-gray-6"
        >
          <Icon name="close" size={16} />
        </button>
      </div>
      <div className="mb-3 flex-1 overflow-y-auto">
        {comentarios.length === 0 ? (
          <p className="py-6 text-center text-xs text-neutral-gray-6">Sem comentários</p>
        ) : (
          comentarios.map((c, i) => (
            <div
              key={i}
              className={cn(
                "mb-2.5 rounded-lg border px-3 py-2.5",
                c.autor === "incorporadora"
                  ? "border-primary-7/20 bg-primary-1"
                  : "border-neutral-gray-4 bg-neutral-gray-2"
              )}
            >
              <div className="mb-1 flex justify-between">
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wider",
                    c.autor === "incorporadora" ? "text-primary-7" : "text-neutral-gray-8"
                  )}
                >
                  {c.autor}
                </span>
                <span className="text-[10px] text-neutral-gray-6">{c.data}</span>
              </div>
              <p className="text-xs leading-relaxed text-neutral-gray-11">{c.texto}</p>
            </div>
          ))
        )}
      </div>
      <div>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Adicionar comentário..."
          aria-label="Adicionar comentário"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              send();
            }
          }}
          rows={2}
          className="mb-2 w-full resize-none rounded-lg border border-neutral-gray-5 px-2.5 py-2 text-xs outline-none focus:border-primary-7"
        />
        <Button fullWidth size="sm" onPress={send} isLoading={appendComment.isPending}>
          Enviar
        </Button>
      </div>
    </Card>
  );
}
