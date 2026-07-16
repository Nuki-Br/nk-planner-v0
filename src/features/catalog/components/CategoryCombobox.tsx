"use client";

import React from "react";
import { Input as HeroInput, Popover, PopoverContent, PopoverTrigger } from "@heroui/react";

import { Icon } from "@/components/ui";
import { normName } from "@/lib/formula";
import {
  useCategorias,
  useCreateCategoria,
  useDeleteCategoria,
  useUpdateCategoria,
} from "@/lib/hooks/useCategorias";
import { cn } from "@/lib/utils";
import {
  CATEGORY_COLOR_KEYS,
  COLOR_SCHEMES,
  DEFAULT_COLOR,
  toColorKey,
  type CategoryColorKey,
} from "@/shared/constants/categorias";
import type { CategoriaCatalogo } from "@/shared/types/domain";

import { CategoryChip } from "./CategoryChip";

// ─── Painel (lista "Selecione ou crie uma" + edição nome/cor/excluir) ────

interface CategoryPanelProps {
  /** Categoria selecionada ("" = nenhuma). */
  value: string;
  /** Seleção/criação EXPLÍCITA pelo usuário. */
  onSelect: (nome: string) => void;
  /**
   * Valor mudou sem escolha do usuário (rename/exclusão da selecionada).
   * Separado de onSelect: o KitModal reseta a composição só em onSelect.
   */
  onRenamed: (nome: string) => void;
  close: () => void;
}

function CategoryPanel({ value, onSelect, onRenamed, close }: CategoryPanelProps) {
  const { data: categorias = [] } = useCategorias();
  const createCategoria = useCreateCategoria();
  const updateCategoria = useUpdateCategoria();
  const deleteCategoria = useDeleteCategoria();

  const [search, setSearch] = React.useState("");
  const [editing, setEditing] = React.useState<CategoriaCatalogo | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Form de edição
  const [nome, setNome] = React.useState("");
  const [cor, setCor] = React.useState<CategoryColorKey>(DEFAULT_COLOR);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const startEdit = (cat: CategoriaCatalogo) => {
    setEditing(cat);
    setNome(cat.nome);
    setCor(toColorKey(cat.cor));
    setConfirmDelete(false);
    setError(null);
  };

  const filtered = categorias.filter((c) => normName(c.nome).includes(normName(search)));
  const exact = categorias.some((c) => normName(c.nome) === normName(search));
  const canCreate = search.trim() !== "" && !exact;

  const fail = (e: unknown) => setError(e instanceof Error ? e.message : "Erro inesperado.");

  const handleCreate = () => {
    createCategoria.mutate(
      { nome: search.trim(), cor: DEFAULT_COLOR },
      {
        onSuccess: (cat) => {
          onSelect(cat.nome);
          close();
        },
        onError: fail,
      }
    );
  };

  const handleSave = () => {
    if (!editing || nome.trim() === "") return;
    const novoNome = nome.trim();
    updateCategoria.mutate(
      { id: editing.id, patch: { nome: novoNome, cor } },
      {
        onSuccess: () => {
          // Renomeou a selecionada → sincroniza o campo sem "escolher de novo".
          if (editing.nome === value && novoNome !== value) onRenamed(novoNome);
          setEditing(null);
          setError(null);
        },
        onError: fail,
      }
    );
  };

  const handleDelete = () => {
    if (!editing) return;
    deleteCategoria.mutate(editing.id, {
      onSuccess: () => {
        if (editing.nome === value) onRenamed("");
        setEditing(null);
        setError(null);
      },
      onError: fail,
    });
  };

  if (editing) {
    return (
      <div className="flex w-[248px] flex-col gap-3 p-1">
        <HeroInput
          label="Nome"
          value={nome}
          onValueChange={setNome}
          variant="bordered"
          radius="sm"
          size="sm"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") setEditing(null);
          }}
          classNames={{ inputWrapper: "!border-small border-neutral-gray-5 bg-white" }}
        />
        <div>
          <p className="mb-1.5 text-xs font-semibold text-neutral-gray-8">Cor</p>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_COLOR_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                title={k}
                onClick={() => setCor(k)}
                style={{ backgroundColor: COLOR_SCHEMES[k].swatch }}
                className={cn(
                  "h-6 w-6 rounded-full transition-transform hover:scale-110",
                  cor === k && "ring-2 ring-neutral-gray-9 ring-offset-1"
                )}
              />
            ))}
          </div>
        </div>
        {error && <p className="text-xs text-functional-error">{error}</p>}
        {/* Botões nativos com preventDefault no pointerdown: não recebem foco,
            então as trocas de view não desmontam o elemento focado (o que
            faria o react-aria fechar o popover). */}
        {confirmDelete ? (
          <div className="flex flex-col gap-2 border-t border-neutral-gray-4 pt-2.5">
            <p className="text-xs text-neutral-gray-8">
              Excluir a categoria?
              {editing.usos > 0 && ` ${editing.usos} ${editing.usos === 1 ? "item ficará" : "itens ficarão"} sem categoria.`}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => setConfirmDelete(false)}
                className="rounded px-2.5 py-1.5 text-xs font-semibold text-neutral-gray-9 hover:bg-neutral-gray-3"
              >
                Cancelar
              </button>
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={handleDelete}
                disabled={deleteCategoria.isPending}
                className="rounded bg-functional-error px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              >
                {deleteCategoria.isPending ? "Excluindo…" : "Excluir"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between border-t border-neutral-gray-4 pt-2.5">
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 rounded px-2 py-1.5 text-[13px] font-semibold text-functional-error hover:bg-red-50"
            >
              <Icon name="trash" size={14} />
              Deletar
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={handleSave}
              disabled={nome.trim() === "" || updateCategoria.isPending}
              className="rounded-lg bg-primary-7 px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            >
              {updateCategoria.isPending ? "Salvando…" : "Salvar"}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex w-[248px] flex-col gap-1.5 p-1">
      <HeroInput
        value={search}
        onValueChange={setSearch}
        placeholder="Selecione ou crie uma"
        aria-label="Buscar ou criar categoria"
        variant="bordered"
        radius="sm"
        size="sm"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && canCreate) handleCreate();
        }}
        classNames={{ inputWrapper: "!border-small border-neutral-gray-5 bg-white" }}
      />
      {error && <p className="px-1 text-xs text-functional-error">{error}</p>}
      <div className="max-h-[220px] overflow-y-auto">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="group flex w-full items-center gap-2 rounded px-1.5 py-1.5 hover:bg-neutral-gray-2"
          >
            <button
              type="button"
              onClick={() => {
                onSelect(c.nome);
                close();
              }}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
            >
              <CategoryChip nome={c.nome} categorias={categorias} />
              <span className="ml-auto flex shrink-0 items-center gap-1 text-[11px] text-neutral-gray-6">
                <Icon name="link" size={11} />
                {c.usos} usos
              </span>
              {c.nome === value && <Icon name="check" size={14} className="shrink-0 text-primary-7" />}
            </button>
            <button
              type="button"
              title="Editar categoria"
              // preventDefault no pointerdown: o botão não recebe foco — sem
              // isso, trocar a view desmonta o elemento focado e o react-aria
              // fecha o popover por perda de foco.
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => startEdit(c)}
              className="flex shrink-0 p-1 text-neutral-gray-5 hover:text-neutral-gray-9 group-hover:text-neutral-gray-7"
            >
              <Icon name="edit" size={13} />
            </button>
          </div>
        ))}
        {filtered.length === 0 && !canCreate && (
          <p className="px-1.5 py-2 text-xs text-neutral-gray-6">Nenhuma categoria ainda.</p>
        )}
        {canCreate && (
          <button
            type="button"
            onClick={handleCreate}
            disabled={createCategoria.isPending}
            className="flex w-full items-center gap-2 rounded px-1.5 py-2 text-left text-[13px] text-neutral-gray-9 hover:bg-primary-1"
          >
            <Icon name="plus" size={14} className="shrink-0 text-primary-7" />
            <span className="min-w-0 truncate">
              Criar <span className="font-semibold">&ldquo;{search.trim()}&rdquo;</span>
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

const POPOVER_CLASS =
  "rounded-lg border border-neutral-gray-4 bg-white p-1.5 shadow-[0_8px_28px_rgba(0,0,0,0.12)]";

// ─── Campo de formulário (MaterialModal / KitModal) ──────────────────────

interface CategoryComboboxProps {
  label?: string;
  value: string;
  /** Seleção explícita do usuário (pode resetar dependentes, ex.: itens do kit). */
  onChange: (nome: string) => void;
  /** Rename/exclusão da categoria selecionada; default: onChange. */
  onRenamed?: (nome: string) => void;
}

/** Campo "Categoria" com combobox criável (Selecione ou crie uma). */
export function CategoryCombobox({ label = "Categoria", value, onChange, onRenamed }: CategoryComboboxProps) {
  const { data: categorias = [] } = useCategorias();
  const [open, setOpen] = React.useState(false);

  return (
    <Popover isOpen={open} onOpenChange={setOpen} placement="bottom-start" offset={6}>
      <PopoverTrigger>
        <button
          type="button"
          className="relative flex h-14 w-full flex-col items-start justify-center gap-0.5 rounded-medium border-medium border-default-200 px-3 text-left transition-colors hover:border-default-400"
        >
          <span className="text-xs text-foreground-500">{label}</span>
          {value === "" ? (
            <span className="text-sm text-foreground-500">Selecione ou crie uma</span>
          ) : (
            <CategoryChip nome={value} categorias={categorias} />
          )}
          <Icon
            name="chevD"
            size={14}
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 text-neutral-gray-7 transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className={POPOVER_CLASS}>
        <CategoryPanel
          value={value}
          onSelect={onChange}
          onRenamed={onRenamed ?? onChange}
          close={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}

// ─── Chip clicável (célula da tabela do catálogo) ────────────────────────

interface CategoryCellPickerProps {
  value: string;
  onChange: (nome: string) => void;
}

/** Chip de categoria da tabela — clique abre o combobox para reatribuir/editar. */
export function CategoryCellPicker({ value, onChange }: CategoryCellPickerProps) {
  const { data: categorias = [] } = useCategorias();
  const [open, setOpen] = React.useState(false);

  return (
    <Popover isOpen={open} onOpenChange={setOpen} placement="bottom-start" offset={4}>
      <PopoverTrigger>
        <button type="button" title="Alterar categoria" className="inline-flex">
          {value === "" ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-neutral-gray-5 px-[9px] py-0.5 text-[11px] font-semibold text-neutral-gray-6 hover:border-neutral-gray-7 hover:text-neutral-gray-8">
              <Icon name="plus" size={10} />
              Categoria
            </span>
          ) : (
            <CategoryChip
              nome={value}
              categorias={categorias}
              className="cursor-pointer hover:opacity-80"
            />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className={POPOVER_CLASS}>
        <CategoryPanel
          value={value}
          onSelect={onChange}
          onRenamed={onChange}
          close={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
