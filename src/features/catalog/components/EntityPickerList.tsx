"use client";

import React from "react";
import { Input as HeroInput } from "@heroui/react";

import { Icon, MaterialThumb, Pagination, Select } from "@/components/ui";
import { useCategorias } from "@/lib/hooks/useCategorias";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { cn } from "@/lib/utils";
import type { CatalogTipo } from "@/shared/types/catalog";
import type { CatalogEntity, CategoriaCatalogo } from "@/shared/types/domain";

import { CategoryChip } from "./CategoryChip";
import { KitBadge } from "./KitBadge";
import { CATALOG_PICKER_PAGE_SIZE, useCatalogEntities } from "../hooks/useCatalogEntities";

// Corpo de lista compartilhado por TODAS as superfícies que escolhem um item de
// catálogo (material padrão/upgrade, composição de kit, canvas).
//
// É uma lista, não um modal, de propósito: os call sites têm chrome e rodapé
// incompatíveis entre si (wizard de 2 passos, formulário de kit, picker do
// canvas), e modal-dentro-de-modal no HeroUI empilha portais sem necessidade.
// Cada modal embute este componente no seu corpo.
//
// Antes desta extração o mesmo bloco de HeroInput de busca estava copiado
// verbatim em três arquivos, cada um refiltrando o catálogo inteiro no cliente.

type PickerMode = "single" | "multi" | "add";

export interface EntityPickerListProps {
  /** "all" = materiais + kits; "single" = só materiais; "kit" = só kits. */
  tipo?: CatalogTipo;
  /**
   * Categoria travada pelo contexto (a do componente/kit) — esconde o Select.
   * `undefined` = usuário escolhe; `null` = trava em "sem categoria".
   */
  lockedCategoriaId?: number | null;
  /**
   * Categoria sugerida pelo contexto — pré-seleciona o Select, mas o usuário
   * pode trocá-la ou limpar o filtro. Ignorada quando `lockedCategoriaId` vem.
   * `undefined` = sem filtro inicial; `null` = começa em "sem categoria".
   */
  initialCategoriaId?: number | null;
  /** Ids a esconder (já usados). Vai para o servidor, não filtra depois. */
  excludeIds?: readonly number[];
  /**
   * "single" = rádio controlado por `selectedId`; "multi" = checkbox controlado
   * por `selectedIds` (o clique alterna); "add" = clique já adiciona.
   */
  mode?: PickerMode;
  selectedId?: number | null;
  /** Só no modo "multi". */
  selectedIds?: ReadonlySet<number>;
  /** Entrega a ENTIDADE inteira — ver nota em EntityPickerListProps abaixo. */
  onSelect: (entity: CatalogEntity) => void;
  pageSize?: number;
  maxHeightClass?: string;
  emptyText?: string;
}

// Nota sobre `onSelect` entregar a entidade e não o id: antes os call sites
// resolviam o id contra a lista completa em memória (`kits.find`, `getMaterial`).
// Com paginação no servidor essa lista não existe mais — só a página atual —,
// então quem clica é quem tem o objeto.

interface EntityPickerItemProps {
  entity: CatalogEntity;
  categorias: CategoriaCatalogo[];
  selected: boolean;
  mode: PickerMode;
  onSelect: (entity: CatalogEntity) => void;
}

/**
 * React.memo aqui não é otimização especulativa: a versão anterior desta linha
 * no MaterialPicker era um componente declarado DENTRO do corpo do render, o
 * que remontava a lista inteira a cada tecla digitada na busca.
 */
const EntityPickerItem = React.memo(function EntityPickerItem({
  entity,
  categorias,
  selected,
  mode,
  onSelect,
}: EntityPickerItemProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(entity)}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left",
        selected ? "border-primary-7 bg-primary-1" : "border-neutral-gray-4 bg-white",
        mode !== "single" && "hover:bg-primary-1"
      )}
    >
      {mode === "multi" ? (
        <span
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded border-2",
            selected ? "border-primary-7 bg-primary-7 text-white" : "border-neutral-gray-5"
          )}
        >
          {selected && <Icon name="check" size={11} />}
        </span>
      ) : mode === "single" ? (
        <span
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
            selected ? "border-primary-7" : "border-neutral-gray-5"
          )}
        >
          {selected && <span className="h-[7px] w-[7px] rounded-full bg-primary-7" />}
        </span>
      ) : (
        <Icon name="plus" size={14} className="shrink-0 text-primary-7" />
      )}

      <MaterialThumb
        url={entity.isKit ? null : entity.imagem?.url}
        alt={entity.nome}
        isKit={entity.isKit}
        size={44}
      />

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[13px] font-semibold text-neutral-gray-11">
            {entity.nome}
          </span>
          {entity.isKit && <KitBadge />}
        </span>
        <span className="mt-px block truncate text-[11px] text-neutral-gray-7">
          {entity.isKit
            ? `${entity.codigo} · ${entity.itens.length} itens`
            : `${entity.codigo} · ${entity.fabricante || "sem fabricante"}`}
        </span>
      </span>

      <span className="flex shrink-0 flex-col items-end gap-1">
        <CategoryChip nome={entity.categoria} categorias={categorias} />
      </span>
    </button>
  );
});

/** Converte um id de categoria no valor do Select ("" = todas; "none" = sem categoria). */
function toCatFilter(categoriaId: number | null | undefined): string {
  if (categoriaId === undefined) return "";
  return categoriaId === null ? "none" : String(categoriaId);
}

export function EntityPickerList({
  tipo = "all",
  lockedCategoriaId,
  initialCategoriaId,
  excludeIds,
  mode = "single",
  selectedId = null,
  selectedIds,
  onSelect,
  pageSize = CATALOG_PICKER_PAGE_SIZE,
  maxHeightClass = "max-h-[340px]",
  emptyText = "Nenhum item encontrado.",
}: EntityPickerListProps) {
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounce(search, 500);
  // "" = todas; "none" = sem categoria; caso contrário o id em string.
  const [catFilter, setCatFilter] = React.useState(() => toCatFilter(initialCategoriaId));
  const [page, setPage] = React.useState(1);

  // A sugestão costuma chegar depois da montagem (o call site resolve nome →
  // id com as categorias carregadas em paralelo); só re-sincroniza quando ela
  // muda, então a escolha do usuário no Select é preservada.
  React.useEffect(() => {
    setCatFilter(toCatFilter(initialCategoriaId));
  }, [initialCategoriaId]);

  const locked = lockedCategoriaId !== undefined;
  const categoriaId = locked
    ? lockedCategoriaId
    : catFilter === ""
      ? undefined
      : catFilter === "none"
        ? null
        : Number(catFilter);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, catFilter, tipo, lockedCategoriaId]);

  const { data: categorias = [] } = useCategorias();
  const { data, isLoading, isError } = useCatalogEntities({
    tipo,
    page,
    search: debouncedSearch,
    categoriaId,
    excludeIds,
    pageSize,
  });

  const results = data?.results ?? [];
  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <HeroInput
          value={search}
          onValueChange={setSearch}
          placeholder="Buscar por nome, código ou fabricante..."
          aria-label="Buscar no catálogo"
          variant="bordered"
          radius="sm"
          size="sm"
          isClearable
          onClear={() => setSearch("")}
          startContent={<Icon name="search" size={14} className="text-neutral-gray-6" />}
          classNames={{
            base: "flex-1",
            inputWrapper: "!border-small h-10 border-neutral-gray-5 bg-white",
            input: "text-[13px]",
          }}
        />
        {!locked && (
          <Select
            aria-label="Filtrar por categoria"
            placeholder="Todas as categorias"
            value={catFilter}
            onValueChange={setCatFilter}
            small
            className="w-52 shrink-0"
            classNames={{ trigger: "h-10 min-h-10 border-small border-neutral-gray-5 bg-white" }}
            options={[
              { value: "", label: "Todas as categorias" },
              { value: "none", label: "Sem categoria" },
              ...categorias.map((c) => ({ value: String(c.id), label: c.nome })),
            ]}
          />
        )}
      </div>

      <div className={cn("flex flex-col gap-1 overflow-y-auto", maxHeightClass)}>
        {isError && (
          <div className="p-[18px] text-center text-xs text-functional-error">
            Não foi possível carregar o catálogo.
          </div>
        )}
        {!isError && isLoading && (
          <div className="p-[18px] text-center text-xs text-neutral-gray-6">Carregando...</div>
        )}
        {!isError && !isLoading && results.length === 0 && (
          <div className="p-[18px] text-center text-xs text-neutral-gray-6">{emptyText}</div>
        )}
        {results.map((e) => (
          <EntityPickerItem
            key={e.id}
            entity={e}
            categorias={categorias}
            selected={mode === "multi" ? (selectedIds?.has(e.id) ?? false) : selectedId === e.id}
            mode={mode}
            onSelect={onSelect}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-neutral-gray-7">
            {data?.total} {data?.total === 1 ? "item" : "itens"}
          </span>
          <Pagination page={page} total={totalPages} onChange={setPage} />
        </div>
      )}
    </div>
  );
}
