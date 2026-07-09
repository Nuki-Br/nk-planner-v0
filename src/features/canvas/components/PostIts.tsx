"use client";

import React from "react";

import { Icon } from "@/components/ui";

import { CV_PRESENCE, CV_USER, STICKY, stickyById, type CanvasUser } from "../swatch";

export interface PostItNote {
  id: string;
  tipId: string;
  x: number;
  y: number;
  color: string;
  rot: number;
  text: string;
  editing: boolean;
  author: CanvasUser;
}

const CANVAS_STORE_KEY = "nuki-canvas-postits-p001-v2";

function seedPostits(tipId: string): PostItNote[] {
  const base = { author: CV_PRESENCE[1] ?? CV_USER, editing: false };
  if (tipId === "t3")
    return [
      { id: "seed-1", tipId, x: 884, y: 58, color: "coral", rot: -1.5, text: "Mármore Carrara ainda sem custo — cobrar a Vertex antes de publicar.", ...base },
      { id: "seed-2", tipId, x: 902, y: 452, color: "menta", rot: 1.4, text: "Nicho da suíte: aguardando definição de material com o arquiteto.", author: CV_PRESENCE[2] ?? CV_USER, editing: false },
    ];
  if (tipId === "t2")
    return [
      { id: "seed-3", tipId, x: 884, y: 64, color: "amarelo", rot: -1, text: "Cliente VIP pediu opção de mármore na suíte master.", ...base },
    ];
  return [];
}

type NotesStore = Record<string, PostItNote[]>;

function readStore(): NotesStore {
  try {
    const raw = localStorage.getItem(CANVAS_STORE_KEY);
    return raw ? (JSON.parse(raw) as NotesStore) : {};
  } catch {
    return {};
  }
}

/**
 * Post-its por tipologia, persistidos em localStorage (single-user; a
 * colaboração real fica pós-MVP). Seeds do protótipo na primeira visita.
 */
export function usePostIts(tipId: string) {
  const [store, setStore] = React.useState<NotesStore>({});
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => {
    setStore(readStore());
    setHydrated(true);
  }, []);

  const notes = hydrated ? (store[tipId] ?? seedPostits(tipId)) : [];

  const setNotes = React.useCallback(
    (updater: (cur: PostItNote[]) => PostItNote[]) => {
      setStore((prev) => {
        const cur = prev[tipId] ?? seedPostits(tipId);
        const next = { ...prev, [tipId]: updater(cur) };
        try {
          localStorage.setItem(CANVAS_STORE_KEY, JSON.stringify(next));
        } catch {
          // quota/modo privado — mantém só em memória
        }
        return next;
      });
    },
    [tipId]
  );

  const addNote = React.useCallback(
    (x: number, y: number) => {
      setNotes((ns) => [
        ...ns,
        {
          id: "n-" + Date.now(),
          tipId,
          x,
          y,
          color: STICKY[0].id,
          rot: Math.random() * 4 - 2,
          text: "",
          author: CV_USER,
          editing: true,
        },
      ]);
    },
    [setNotes, tipId]
  );

  const changeNote = React.useCallback(
    (id: string, patch: Partial<PostItNote>) =>
      setNotes((ns) => ns.map((n) => (n.id === id ? { ...n, ...patch } : n))),
    [setNotes]
  );

  const deleteNote = React.useCallback(
    (id: string) => setNotes((ns) => ns.filter((n) => n.id !== id)),
    [setNotes]
  );

  return { notes, addNote, changeNote, deleteNote };
}

export function PostIt({
  note,
  onChange,
  onDelete,
  onStartDrag,
}: {
  note: PostItNote;
  onChange: (id: string, patch: Partial<PostItNote>) => void;
  onDelete: (id: string) => void;
  onStartDrag: (e: React.MouseEvent, note: PostItNote) => void;
}) {
  const [hover, setHover] = React.useState(false);
  const sk = stickyById(note.color);
  const taRef = React.useRef<HTMLTextAreaElement>(null);
  React.useEffect(() => {
    if (note.editing) taRef.current?.focus();
  }, [note.editing]);

  return (
    <div
      onMouseDown={(e) => {
        e.stopPropagation();
        if (!note.editing) onStartDrag(e, note);
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "absolute",
        left: note.x,
        top: note.y,
        width: 184,
        zIndex: 500,
        transform: `rotate(${note.rot}deg)`,
        transformOrigin: "center center",
        background: sk.bg,
        border: `1px solid ${sk.edge}`,
        cursor: note.editing ? "default" : "grab",
      }}
      className="flex flex-col gap-2 rounded p-[10px_11px_9px] shadow-[0_6px_16px_rgba(0,0,0,0.18)]"
    >
      {(hover || note.editing) && (
        <button
          type="button"
          title="Excluir post-it"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(note.id);
          }}
          style={{ border: `1px solid ${sk.edge}`, color: sk.ink }}
          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white p-0 shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
        >
          <Icon name="close" size={12} />
        </button>
      )}
      {note.editing ? (
        <textarea
          ref={taRef}
          value={note.text}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => onChange(note.id, { text: e.target.value })}
          onBlur={() => onChange(note.id, { editing: false })}
          placeholder="Escreva uma nota…"
          style={{ color: sk.ink }}
          className="min-h-16 w-full resize-none border-none bg-transparent p-0 text-[13px] leading-[1.4] outline-none"
        />
      ) : (
        <div
          onDoubleClick={(e) => {
            e.stopPropagation();
            onChange(note.id, { editing: true });
          }}
          style={{ color: sk.ink }}
          className="min-h-16 whitespace-pre-wrap break-words text-[13px] leading-[1.4]"
        >
          {note.text || (
            <span style={{ color: sk.ink }} className="opacity-45">
              Post-it vazio — duplo clique para editar
            </span>
          )}
        </div>
      )}
      {note.editing && (
        <div onMouseDown={(e) => e.stopPropagation()} className="flex gap-1.5">
          {STICKY.map((s) => (
            <button
              key={s.id}
              type="button"
              title={s.id}
              onClick={(e) => {
                e.stopPropagation();
                onChange(note.id, { color: s.id });
              }}
              style={{
                background: s.bg,
                border: note.color === s.id ? `2px solid ${sk.ink}` : `1px solid ${s.edge}`,
              }}
              className="h-4 w-4 rounded-full p-0"
            />
          ))}
        </div>
      )}
      <div style={{ borderColor: sk.edge }} className="flex items-center gap-1.5 border-t pt-[7px]">
        <span
          style={{ background: note.author.color }}
          className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[8.5px] font-bold text-white"
        >
          {note.author.initials}
        </span>
        <span style={{ color: sk.ink }} className="text-[10.5px] opacity-80">
          {note.author.name}
        </span>
      </div>
    </div>
  );
}

export function PresenceStack() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex">
        {CV_PRESENCE.map((u, i) => (
          <div
            key={u.initials}
            title={`${u.name} está visualizando`}
            style={{ background: u.color, marginLeft: i === 0 ? 0 : -8, zIndex: 10 - i }}
            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white"
          >
            {u.initials}
          </div>
        ))}
      </div>
      <span className="text-[11px] text-neutral-gray-7">editando agora</span>
    </div>
  );
}
