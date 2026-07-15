"use client";

import React from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Input as HeroInput } from "@heroui/react";

import {
  Button,
  Card,
  DataTable,
  EmptyState,
  Icon,
  LoadingState,
  MaterialThumb,
  PageHeader,
  type DataTableColumn,
} from "@/components/ui";
import type { Entity } from "@/lib/data/entities";
import { useKits } from "@/lib/hooks/useKits";
import { useMateriais } from "@/lib/hooks/useMateriais";
import { useProject } from "@/lib/hooks/useProjects";
import { useTipologias } from "@/lib/hooks/useTipologias";
import { useSelection } from "@/lib/store/selection";
import { cn } from "@/lib/utils";
import { CAT_COLORS, type Categoria } from "@/shared/constants/categorias";
import type { Kit, Material } from "@/shared/types/domain";

import { getUsageCounts } from "../usage";
import { AddSplitButton } from "./AddSplitButton";
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

// Tela 6 — Catálogo de materiais e kits (protótipo: MaterialsCatalogScreen).
export function CatalogScreen() {
  const router = useRouter();
  const { data: materiais = [], isLoading: matLoading, isError: matError, refetch: refetchMat } =
    useMateriais();
  const { data: kits = [], isLoading: kitLoading } = useKits();
  const { data: tipologias = [] } = useTipologias();
  const activeProjectId = useSelection((s) => s.activeProjectId);
  const { data: project } = useProject(activeProjectId);

  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>("");
  const [catFilters, setCatFilters] = React.useState<string[]>([]);

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
  const categorias = React.useMemo(
    () => [...new Set(materiais.map((m) => m.categoria))],
    [materiais]
  );

  const matchTxt = (e: Entity) => {
    const q = search.toLowerCase();
    return (
      e.nome.toLowerCase().includes(q) ||
      e.codigo.toLowerCase().includes(q) ||
      (!e.isKit && e.fabricante.toLowerCase().includes(q))
    );
  };
  const filtered = entities.filter(
    (e) =>
      matchTxt(e) &&
      (catFilters.length === 0 || catFilters.includes(e.categoria)) &&
      (typeFilter === "" || (typeFilter === "Kit") === e.isKit)
  );

  // Entity é Material/Kit + flag isKit — estruturalmente atribuível aos tipos base.
  const openEdit = (e: Entity) => {
    if (e.isKit) setKitModal({ open: true, kit: e });
    else setMaterialModal({ open: true, material: e });
  };

  const columns: DataTableColumn<Entity>[] = [
    {
      key: "codigo",
      label: "Código",
      sortValue: (r) => r.codigo,
      render: (r) => (
        <code className="rounded bg-neutral-gray-3 px-1.5 py-px font-mono text-[11px] text-neutral-gray-7">
          {r.codigo}
        </code>
      ),
    },
    {
      key: "tipo",
      label: "Tipo",
      sortValue: (r) => (r.isKit ? "Kit" : "Material"),
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
      sortValue: (r) => r.nome,
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
      sortValue: (r) => r.categoria,
      render: (r) => (
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
            CAT_COLORS[r.categoria as Categoria] ?? "bg-neutral-gray-3 text-neutral-gray-8"
          )}
        >
          {r.categoria}
        </span>
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
            <Button variant="bordered" icon="send" onPress={() => router.push("/enviar")}>
              Enviar para construtora
            </Button>
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

      <div className="mb-3 flex flex-wrap items-center gap-2.5">
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
          options={categorias.map((c) => ({
            value: c,
            label: `${c} (${materiais.filter((m) => m.categoria === c).length})`,
          }))}
          value={catFilters}
          onChange={(v) =>
            setCatFilters((cs) => (cs.includes(v) ? cs.filter((x) => x !== v) : [...cs, v]))
          }
        />
      </div>

      {(catFilters.length > 0 || typeFilter !== "") && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
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

      <Card padding={0}>
        {matLoading || kitLoading ? (
          <LoadingState label="Carregando catálogo…" />
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
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-neutral-gray-4 px-4 py-3.5">
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
            <DataTable
              aria-label="Catálogo de materiais e kits"
              columns={columns}
              rows={filtered}
              rowKey={(r) => r.id}
              emptyText="Nenhum material ou kit encontrado."
            />
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
