"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Input as HeroInput, type SortDescriptor } from "@heroui/react";

import {
  Button,
  Card,
  DataTable,
  EmptyState,
  Icon,
  MaterialThumb,
  PageHeader,
  Pagination,
  TableSkeleton,
  sortRows,
  type DataTableColumn,
} from "@/components/ui";
import type { Entity } from "@/lib/data/entities";
import { useCategorias } from "@/lib/hooks/useCategorias";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { useKits, useUpdateKit } from "@/lib/hooks/useKits";
import { useMateriais, useUpdateMaterial } from "@/lib/hooks/useMateriais";
import { useProject } from "@/lib/hooks/useProjects";
import { useTipologias } from "@/lib/hooks/useTipologias";
import { useRequireActiveProject } from "@/lib/hooks/useRequireActiveProject";
import type { Kit, Material } from "@/shared/types/domain";

import { getUsageCounts } from "../usage";
import { AddSplitButton } from "./AddSplitButton";
import { CategoryCellPicker } from "./CategoryCombobox";
import { ActiveChip, FilterMenu } from "./FilterMenu";
import { KitBadge } from "./KitBadge";
import { KitModal } from "./KitModal";
import { MaterialModal } from "./MaterialModal";
import { UsageModal } from "./UsageModal";

// Import dinâmico: o CsvImportModal (e o papaparse ~45kB dentro dele) só entra
// no bundle quando o import de CSV é aberto — fora do First Load JS do catálogo.
const CsvImportModal = dynamic(() =>
  import("./CsvImportModal").then((m) => m.CsvImportModal)
);

type TypeFilter = "" | "Material" | "Kit";

/**
 * Paginação client-side: a tela mescla materiais e kits de duas queries e
 * ordena por coluna, então continua buscando as duas listas inteiras. O que a
 * página corta é o custo de montar 600+ linhas de tabela no DOM de uma vez.
 */
const CATALOG_PAGE_SIZE = 50;

/**
 * Critérios de ordenação em escopo de módulo: são funções puras da linha, e
 * mantê-las fora do render dá ao `sorted` uma dependência estável — senão o
 * array de colunas (que fecha sobre handlers) reordenaria 600+ itens a cada
 * render. As colunas abaixo referenciam estas mesmas funções.
 */
const SORT_VALUES = {
  codigo: (r: Entity) => r.codigo,
  tipo: (r: Entity) => (r.isKit ? "Kit" : "Material"),
  nome: (r: Entity) => r.nome,
  categoria: (r: Entity) => r.categoria,
} as const;

const SORT_COLUMNS = Object.entries(SORT_VALUES).map(([key, sortValue]) => ({
  key,
  sortValue,
}));

// Tela 6 — Catálogo de materiais e kits (protótipo: MaterialsCatalogScreen).
export function CatalogScreen() {
  const activeProjectId = useRequireActiveProject();
  const { data: materiais = [], isLoading: matLoading, isError: matError, refetch: refetchMat } =
    useMateriais();
  const { data: kits = [], isLoading: kitLoading } = useKits();
  const { data: categoriasCatalogo = [] } = useCategorias();
  const { data: tipologias = [] } = useTipologias(activeProjectId);
  const updateMaterial = useUpdateMaterial();
  const updateKit = useUpdateKit();
  const { data: project } = useProject(activeProjectId);

  const [search, setSearch] = React.useState("");
  // Filtrar 600+ entidades e remontar a tabela a cada tecla trava a digitação.
  const debouncedSearch = useDebounce(search, 300);
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>("");
  const [catFilters, setCatFilters] = React.useState<string[]>([]);
  const [page, setPage] = React.useState(1);
  // Ordenação controlada: com a página já fatiada, deixar o DataTable ordenar
  // ordenaria só as 50 linhas visíveis.
  const [sort, setSort] = React.useState<SortDescriptor | undefined>(undefined);

  // Modais
  const [materialModal, setMaterialModal] = React.useState<{ open: boolean; material: Material | null }>({ open: false, material: null });
  const [kitModal, setKitModal] = React.useState<{ open: boolean; kit: Kit | null }>({ open: false, kit: null });
  const [usageMaterial, setUsageMaterial] = React.useState<Material | null>(null);
  const [showCsv, setShowCsv] = React.useState(false);

  // Catálogo unificado: materiais + kits em uma lista com coluna Tipo.
  const entities = React.useMemo<Entity[]>(
    () => [
      ...materiais.map((m): Entity => ({ ...m, isKit: false })),
      ...kits.map((k): Entity => ({ ...k, isKit: true })),
    ],
    [materiais, kits]
  );

  const usageCounts = React.useMemo(() => getUsageCounts(tipologias), [tipologias]);

  const filtered = React.useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    const matchTxt = (e: Entity) =>
      e.nome.toLowerCase().includes(q) ||
      e.codigo.toLowerCase().includes(q) ||
      (!e.isKit && e.fabricante.toLowerCase().includes(q));
    return entities.filter(
      (e) =>
        matchTxt(e) &&
        (catFilters.length === 0 || catFilters.includes(e.categoria)) &&
        (typeFilter === "" || (typeFilter === "Kit") === e.isKit)
    );
  }, [entities, debouncedSearch, catFilters, typeFilter]);

  // Entity é Material/Kit + flag isKit — estruturalmente atribuível aos tipos base.
  const openEdit = (e: Entity) => {
    if (e.isKit) setKitModal({ open: true, kit: e });
    else setMaterialModal({ open: true, material: e });
  };

  const columns: DataTableColumn<Entity>[] = [
    {
      key: "codigo",
      label: "Código",
      sortValue: SORT_VALUES.codigo,
      render: (r) => (
        <code className="rounded bg-neutral-gray-3 px-1.5 py-px font-mono text-[11px] text-neutral-gray-7">
          {!r.codigo || r.codigo === '' ? '-' : r.codigo}
        </code>
      ),
    },
    {
      key: "tipo",
      label: "Tipo",
      sortValue: SORT_VALUES.tipo,
      render: (r) =>
        r.isKit ? (
          <KitBadge />
        ) : (
          <span className="text-[11px] font-semibold text-neutral-gray-7">Material</span>
        ),
    },
    {
      key: "nome",
      label: "Especificação",
      sortValue: SORT_VALUES.nome,
      // A miniatura vai DENTRO da célula do nome (não em coluna própria): é onde
      // o olho já está e não mexe na largura das outras colunas.
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <MaterialThumb
            url={r.isKit ? null : r.imagem?.url}
            alt={r.nome}
            isKit={r.isKit}
            size={36}
          />
          {r.isKit ? (
            <div className="min-w-0">
              <span className="font-bold text-neutral-gray-11">{r.nome}</span>
              <span className="block text-[11px] text-neutral-gray-7">
                {r.itens
                  .map((it) => it.nome)
                  .filter(Boolean)
                  .slice(0, 2)
                  .join(" · ")}
                {r.itens.length > 2 ? ` · +${r.itens.length - 2}` : ""} · {r.itens.length} itens
              </span>
            </div>
          ) : (
            <div className="min-w-0">
              <span className="font-semibold text-neutral-gray-11">{r.nome}</span>
              <span className="block text-[11px] text-neutral-gray-7">{r.fabricante}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "categoria",
      label: "Categoria",
      sortValue: SORT_VALUES.categoria,
      render: (r) => (
        <CategoryCellPicker
          value={r.categoria}
          onChange={(nome) => {
            if (r.isKit) updateKit.mutate({ id: r.id, patch: { categoria: nome } });
            else updateMaterial.mutate({ id: r.id, patch: { categoria: nome } });
          }}
        />
      ),
    },
    {
      key: "uso",
      label: "Uso",
      render: (r) => {
        const count = usageCounts.get(r.id) ?? 0;
        if (count === 0) return <span className="text-xs text-neutral-gray-5">—</span>;
        const label = (
          <>
            <Icon name="link" size={12} className="text-primary-7" />
            {count} uso{count !== 1 ? "s" : ""}
          </>
        );
        return r.isKit ? (
          <span className="flex items-center gap-1 text-xs font-semibold text-primary-7">
            {label}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setUsageMaterial(r)}
            className="flex items-center gap-1 text-xs font-semibold text-primary-7 hover:underline"
          >
            {label}
          </button>
        );
      },
    },
    {
      key: "editar",
      label: "",
      render: (r) => (
        <Button variant="ghost" size="sm" icon="edit" onPress={() => openEdit(r)}>
          Editar
        </Button>
      ),
    },
  ];

  // Ordena a lista INTEIRA antes de fatiar — é o que mantém "ordenar por
  // código" honesto com 600+ itens.
  const sorted = React.useMemo(() => sortRows(filtered, SORT_COLUMNS, sort), [filtered, sort]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / CATALOG_PAGE_SIZE));
  const pageRows = React.useMemo(
    () => sorted.slice((page - 1) * CATALOG_PAGE_SIZE, page * CATALOG_PAGE_SIZE),
    [sorted, page]
  );

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, typeFilter, catFilters]);

  // Filtrar estando na última página pode deixar `page` além do fim.
  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const primeiro = (page - 1) * CATALOG_PAGE_SIZE + 1;
  const ultimo = Math.min(page * CATALOG_PAGE_SIZE, sorted.length);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        breadcrumb={[
          { label: "Empreendimentos", href: "/dashboard" },
          { label: project?.nome ?? "Projeto" },
          { label: "Catálogo de materiais" },
        ]}
        title="Catálogo de materiais"
        subtitle={`${materiais.length} materiais · ${kits.length} kits · organizados por categoria`}
        action={
          <>
            <Button variant="bordered" icon="upload" onPress={() => setShowCsv(true)}>
              Importar CSV
            </Button>
            <AddSplitButton
              onAddMaterial={() => setMaterialModal({ open: true, material: null })}
              onCreateKit={() => setKitModal({ open: true, kit: null })}
            />
          </>
        }
      />

      <Card padding={0}>
        {matLoading || kitLoading ? (
          <TableSkeleton rows={6} showToolbar />
        ) : matError ? (
          <EmptyState
            icon="warning"
            title="Não foi possível carregar o catálogo"
            subtitle="Verifique sua conexão e tente novamente."
            action={
              <Button variant="bordered" onPress={() => void refetchMat()}>
                Tentar novamente
              </Button>
            }
          />
        ) : entities.length === 0 ? (
          <EmptyState
            icon="box"
            title="Catálogo vazio"
            subtitle="Cadastre materiais e kits ou importe um CSV para montar o catálogo do empreendimento."
            action={
              <div className="flex items-center gap-2.5">
                <Button variant="bordered" icon="upload" onPress={() => setShowCsv(true)}>
                  Importar CSV
                </Button>
                <AddSplitButton
                  onAddMaterial={() => setMaterialModal({ open: true, material: null })}
                  onCreateKit={() => setKitModal({ open: true, kit: null })}
                />
              </div>
            }
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-gray-4 px-4 py-3.5">
              <div className="flex items-center gap-3">
                <HeroInput
                  value={search}
                  onValueChange={setSearch}
                  aria-label="Buscar no catálogo"
                  placeholder="Buscar por nome, código ou fabricante..."
                  variant="bordered"
                  radius="sm"
                  size="sm"
                  startContent={<Icon name="search" size={14} className="text-neutral-gray-6" />}
                  classNames={{
                    base: "w-80 max-w-full flex-none",
                    inputWrapper: "!border-small h-10 border-neutral-gray-5 bg-white",
                    input: "text-[13px]",
                  }}
                />
                <span className="text-xs text-neutral-gray-7">
                  {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <FilterMenu
                  label="Tipo"
                  icon="tune"
                  options={[
                    { value: "", label: `Todos (${entities.length})` },
                    { value: "Material", label: `Materiais (${materiais.length})` },
                    { value: "Kit", label: `Kits (${kits.length})` },
                  ]}
                  value={typeFilter}
                  onChange={(v) => setTypeFilter(v as TypeFilter)}
                />
                <FilterMenu
                  label="Categoria"
                  icon="filter"
                  multi
                  options={categoriasCatalogo.map((c) => ({
                    value: c.nome,
                    label: `${c.nome} (${c.usos} uso${c.usos !== 1 ? "s" : ""})`,
                  }))}
                  value={catFilters}
                  onChange={(v) =>
                    setCatFilters((cs) =>
                      cs.includes(v) ? cs.filter((x) => x !== v) : [...cs, v]
                    )
                  }
                />
              </div>
            </div>
            {(catFilters.length > 0 || typeFilter !== "") && (
              <div className="flex flex-wrap items-center gap-2 border-b border-neutral-gray-4 px-4 py-2.5">
                {typeFilter !== "" && (
                  <ActiveChip
                    label={typeFilter === "Kit" ? "Apenas kits" : "Apenas materiais"}
                    onRemove={() => setTypeFilter("")}
                  />
                )}
                {catFilters.map((c) => (
                  <ActiveChip
                    key={c}
                    label={c}
                    onRemove={() => setCatFilters((cs) => cs.filter((x) => x !== c))}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setCatFilters([]);
                    setTypeFilter("");
                  }}
                  className="text-xs font-semibold text-neutral-gray-7 underline"
                >
                  Limpar filtros
                </button>
              </div>
            )}
            <DataTable
              aria-label="Catálogo de materiais e kits"
              columns={columns}
              rows={pageRows}
              rowKey={(r) => r.id}
              emptyText="Nenhum material ou kit encontrado."
              sortDescriptor={sort}
              onSortChange={setSort}
            />
            {sorted.length > 0 && (
              <div className="flex items-center justify-between border-t border-neutral-gray-4 px-4 py-3">
                <span className="text-xs text-neutral-gray-7">
                  Mostrando {primeiro}–{ultimo} de {sorted.length}
                </span>
                <Pagination page={page} total={totalPages} onChange={setPage} />
              </div>
            )}
          </>
        )}
      </Card>

      <MaterialModal
        open={materialModal.open}
        onClose={() => setMaterialModal((s) => ({ ...s, open: false }))}
        material={materialModal.material}
      />
      <KitModal
        open={kitModal.open}
        onClose={() => setKitModal((s) => ({ ...s, open: false }))}
        kit={kitModal.kit}
        materiais={materiais}
      />
      <UsageModal
        open={usageMaterial !== null}
        onClose={() => setUsageMaterial(null)}
        material={usageMaterial}
      />
      <CsvImportModal open={showCsv} onClose={() => setShowCsv(false)} />
    </div>
  );
}
