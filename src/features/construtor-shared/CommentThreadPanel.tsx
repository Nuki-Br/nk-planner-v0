"use client";

import React from "react";

import { Button, Card, Icon } from "@/components/ui";
import { useAppendComment, useComments } from "@/lib/hooks/useComments";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { cn } from "@/lib/utils";
import type { Comment } from "@/shared/types/domain";

export interface ThreadRow {
  /** rowKey `${compId}-${optId}` — chave da thread no store. */
  key: string;
  especificacao: string;
  ambiente: string;
  componente: string;
}

const ROLE_LABEL: Record<Comment["autor"], string> = {
  incorporadora: "Incorporadora",
  construtora: "Construtora",
};

/** Iniciais para o avatar (1–2 letras). */
function initials(name: string): string {
  const parts = name.trim().split(/[\s·]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + second).toUpperCase();
}

function CommentBubble({ c }: { c: Comment }) {
  const isInc = c.autor === "incorporadora";
  const nome = c.autorNome?.trim() || ROLE_LABEL[c.autor];
  return (
    <div className="flex gap-2.5">
      <span
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
          isInc ? "bg-primary-7 text-white" : "bg-neutral-gray-11 text-white"
        )}
        aria-hidden
      >
        {initials(nome)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-[12.5px] font-bold text-neutral-gray-11">{nome}</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-px text-[9.5px] font-bold uppercase tracking-wider",
              isInc ? "bg-primary-1 text-primary-7" : "bg-neutral-gray-3 text-neutral-gray-8"
            )}
          >
            {ROLE_LABEL[c.autor]}
          </span>
          <span className="ml-auto whitespace-nowrap text-[10.5px] text-neutral-gray-6">
            {c.data}
          </span>
        </div>
        <div
          className={cn(
            "rounded-lg rounded-tl-sm border px-3 py-2",
            isInc ? "border-primary-7/20 bg-primary-1" : "border-neutral-gray-4 bg-neutral-gray-2"
          )}
        >
          <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-neutral-gray-11">
            {c.texto}
          </p>
        </div>
      </div>
    </div>
  );
}

// Painel de thread de comentários (construtor-shared do protótipo). Reusável em
// dois hosts: no Construtor de Preço vive dentro do Modal compartilhado
// (`embedded`), e na Revisão de custos como card inline (`embedded={false}`).
// Os comentários do incorporador são assinados com o nome do usuário logado.
export function CommentThreadPanel({
  row,
  onClose,
  embedded = false,
}: {
  row: ThreadRow;
  onClose: () => void;
  /** Quando true, o host (Modal) já provê cabeçalho/fechar — renderiza só a thread + composer. */
  embedded?: boolean;
}) {
  const { data: comentarios = [] } = useComments(row.key);
  const appendComment = useAppendComment();
  const currentUser = useCurrentUser();
  const [newComment, setNewComment] = React.useState("");
  const listEndRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    setNewComment("");
  }, [row.key]);
  React.useEffect(() => {
    listEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [comentarios.length]);

  const send = () => {
    const texto = newComment.trim();
    if (texto === "") return;
    appendComment.mutate(
      { rowKey: row.key, input: { autor: "incorporadora", autorNome: currentUser.name, texto } },
      { onSuccess: () => setNewComment("") }
    );
  };

  const thread = (
    <div className={cn("flex min-h-0 flex-1 flex-col", embedded ? "gap-4" : "gap-3")}>
      <div className={cn("min-h-0 flex-1 space-y-4 overflow-y-auto", embedded ? "max-h-[46vh]" : "")}>
        {comentarios.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-10 text-center">
            <Icon name="chat" size={22} className="text-neutral-gray-5" />
            <p className="text-xs text-neutral-gray-6">Nenhum comentário ainda</p>
          </div>
        ) : (
          comentarios.map((c, i) => <CommentBubble key={i} c={c} />)
        )}
        <div ref={listEndRef} />
      </div>

      <div className="border-t border-neutral-gray-3 pt-3">
        <p className="mb-1.5 text-[11px] text-neutral-gray-6">
          Comentando como <span className="font-semibold text-neutral-gray-9">{currentUser.name}</span>
        </p>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Escreva um comentário…"
          aria-label="Adicionar comentário"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              send();
            }
          }}
          rows={2}
          className="mb-2 w-full resize-none rounded-lg border border-neutral-gray-5 px-3 py-2 text-[12.5px] outline-none focus:border-primary-7"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10.5px] text-neutral-gray-5">⌘/Ctrl + Enter para enviar</span>
          <Button
            size="sm"
            onPress={send}
            isLoading={appendComment.isPending}
            isDisabled={newComment.trim() === ""}
          >
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );

  if (embedded) return thread;

  return (
    <Card className="flex max-h-[calc(100vh-100px)] flex-col">
      <div className="mb-3 flex items-start justify-between border-b border-neutral-gray-4 pb-3">
        <div className="min-w-0">
          <p className="mb-0.5 truncate text-xs font-bold text-neutral-gray-11">
            {row.especificacao}
          </p>
          <p className="text-[11px] text-neutral-gray-7">
            {row.ambiente} · {row.componente}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="flex shrink-0 text-neutral-gray-6"
        >
          <Icon name="close" size={16} />
        </button>
      </div>
      {thread}
    </Card>
  );
}
