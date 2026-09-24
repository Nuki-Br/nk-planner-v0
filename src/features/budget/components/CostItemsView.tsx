"use client";

import React from "react";

import {
  AlertModal,
  Button,
  EmptyState,
  Icon,
  Input,
  Select,
  TableSkeleton,
} from "@/components/ui";
import { ActiveChip, FilterMenu } from "@/features/catalog/components/FilterMenu";
import {
  useCostItems,
  useCreateCostItems,
  useDeleteCostItem,
  useUpdateCostItem,
} from "@/lib/hooks/useCostItems";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { cn, norm, parseBR } from "@/lib/utils";
import { isUnidade, UNIDADE_OPTIONS } from "@/shared/constants/unidades";
import type { CostItemLineInput } from "@/shared/types/costItems";
import type { CostItemRow } from "@/shared/types/domain";

import { CostField, precoToInput, TH } from "./CostField";
import { CostItemsGridModal } from "./CostItemsGridModal";

interface CostItemsViewProps {
  projectId: number;
}

/** "" = todos. */
type StatusFilter = "" | "pendente" | "com_preco";

const STATUS_LABEL: Record<Exclude<StatusFilter, "">, string> = {
  pendente: "Pendente",
  com_preco: "Com preço",
};

/** Rascunho por célula: `${id}:codigo` | `${id}:nome` | `${id}:preco`. */
type Draft = Record<string, string>;

const TEXT_INPUT =
  "h-[34px] rounded-md border border-neutral-gray-5 bg-white px-2 text-[12.5px] text-neutral-gray-9 outline-none placeholder:text-neutral-gray-5 focus:border-primary-7";

/**
 * Terceira visão do Construtor de Preço — os insumos (itens de custo) da
 * organização com o preço NESTE empreendimento. Código, nome e unidade são do
 * catálogo da org; só o preço é do empreendimento. Mesmo padrão de edição das
 * outras grades: rascunho no keystroke, grava no blur se mudou.
 */
export function CostItemsView({ projectId }: CostItemsViewProps) {
  const { data: items, isLoading } = useCostItems(projectId);
  const updateItem = useUpdateCostItem(projectId);
  const createItems = useCreateCostItems(projectId);
  const deleteItem = useDeleteCostItem(projectId);

  const [draft, setDraft] = React.useState<Draft>({});
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounce(search, 250);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("");
  const [gridOpen, setGridOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<CostItemRow | null>(null);

  const rows = React.useMemo(() => items ?? [], [items]);

  const setField = (key: string, val: string) => setDraft((p) => ({ ...p, [key]: val }));
  const clearField = (key: string) =>
    setDraft((p) => {
      const next = { ...p };
      delete next[key];
      return next;
    });

  // Blur sem rascunho (nada digitado) → nenhum request.
  const commitCodigo = (row: CostItemRow, raw: string) => {
    const key = `${row.id}:codigo`;
    if (draft[key] !== undefined) {
      const v = raw.trim();
      const codigo = v === "" ? null : v;
      if (codigo !== row.codigo) updateItem.mutate({ itemId: row.id, patch: { codigo } });
    }
    clearField(key);
  };

  const commitNome = (row: CostItemRow, raw: string) => {
    const key = `${row.id}:nome`;
    if (draft[key] !== undefined) {
      const nome = raw.trim();
      // Nome vazio não grava — o campo volta ao nome atual.
      if (nome !== "" && nome !== row.nome) updateItem.mutate({ itemId: row.id, patch: { nome } });
    }
    clearField(key);
  };

  const commitPreco = (row: CostItemRow, raw: string) => {
    const key = `${row.id}:preco`;
    if (draft[key] !== undefined) {
      const n = parseBR(raw);
      const preco = n > 0 ? n : null;
      if (preco !== row.preco) updateItem.mutate({ itemId: row.id, patch: { preco } });
    }
    clearField(key);
  };

  const changeUnidade = (row: CostItemRow, v: string) => {
    if (isUnidade(v) && v !== row.unidade)
      updateItem.mutate({ itemId: row.id, patch: { unidade: v } });
  };

  const q = React.useMemo(() => norm(debouncedSearch.trim()), [debouncedSearch]);
  const filtered = React.useMemo(
    () =>
      rows.filter((r) => {
        if (q && !(norm(r.nome).includes(q) || (r.codigo !== null && norm(r.codigo).includes(q))))
          return false;
        if (statusFilter === "pendente" && r.preco !== null) return false;
        if (statusFilter === "com_preco" && r.preco === null) return false;
        return true;
      }),
    [rows, q, statusFilter]
  );

  const pendentesTotal = rows.filter((r) => r.preco === null).length;
  const pendentesFiltrados = filtered.filter((r) => r.preco === null).length;
  const hasFilters = search !== "" || statusFilter !== "";
  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
  };

  const handleCreate = (lines: CostItemLineInput[]) =>
    createItems
      .mutateAsync(lines)
      .then(() => setGridOpen(false))
      // O toast global já avisou; o modal fica aberto para corrigir.
      .catch(() => undefined);

  const handleDelete = () => {
    if (!deleting) return;
    deleteItem
      .mutateAsync(deleting.id)
      .then(() => setDeleting(null))
      .catch(() => undefined);
  };

  const addButton = (
    <Button variant="teal" icon="plus" onPress={() => setGridOpen(true)}>
      Adicionar itens
    </Button>
  );

  const gridModal = (
    <CostItemsGridModal
      open={gridOpen}
      onClose={() => setGridOpen(false)}
      costItems={rows}
      saving={createItems.isPending}
      onSubmit={handleCreate}
    />
  );

  if (isLoading) {
    return (
      <div className="mb-6 overflow-hidden rounded-b-lg border border-neutral-gray-4 bg-white">
        <TableSkeleton rows={6} showToolbar />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="mb-6 rounded-b-lg border border-t-0 border-neutral-gray-4 bg-white">
        <EmptyState
          icon="box"
          title="Nenhum item de custo"
          subtitle="Cadastre os insumos, serviços e fretes que compõem o custo dos materiais."
          action={addButton}
        />
        {gridModal}
      </div>
    );
  }

  return (
    <div className="mb-6 overflow-hidden rounded-b-lg border border-neutral-gray-4 bg-white">
      {/* Toolbar: busca + filtro + adicionar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-neutral-gray-4 px-4 py-3">
        <Input
          small
          value={search}
          onValueChange={setSearch}
          aria-label="Buscar item de custo"
          placeholder="Buscar por código ou nome..."
          radius="sm"
          isClearable
          onClear={() => setSearch("")}
          startContent={<Icon name="search" size={14} className="text-neutral-gray-6" />}
          classNames={{
            base: "w-72 max-w-full flex-none",
            inputWrapper: "!border-small h-10 border-neutral-gray-5 bg-white",
            input: "text-[13px]",
          }}
        />
        <FilterMenu
          label="Status"
          icon="tune"
          options={[
            { value: "", label: `Todos (${rows.length})` },
            { value: "pendente", label: `Pendente (${pendentesTotal})` },
            { value: "com_preco", label: `Com preço (${rows.length - pendentesTotal})` },
          ]}
          value={statusFilter}
          onChange={(v) => setStatusFilter(v === "pendente" || v === "com_preco" ? v : "")}
        />
        <div className="ml-auto">{addButton}</div>
      </div>

      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2 border-b border-neutral-gray-4 px-4 py-2.5">
          {search !== "" && <ActiveChip label={`"${search}"`} onRemove={() => setSearch("")} />}
          {statusFilter !== "" && (
            <ActiveChip label={STATUS_LABEL[statusFilter]} onRemove={() => setStatusFilter("")} />
          )}
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-semibold text-neutral-gray-7 underline"
          >
            Limpar filtros
          </button>
        </div>
      )}

      {/* Banner explicativo + resumo */}
      <div className="flex items-center gap-2 border-b border-neutral-gray-4 bg-neutral-gray-2 px-4 py-[9px]">
        <Icon name="edit" size={13} className="text-primary-7" />
        <span className="text-xs font-semibold text-primary-7">
          Itens de custo da organização — código, nome e unidade valem para todos os
          empreendimentos; o preço é deste empreendimento
        </span>
        <span className="ml-auto whitespace-nowrap text-[11px] text-neutral-gray-7">
          {hasFilters ? `${filtered.length} de ${rows.length}` : filtered.length}{" "}
          {filtered.length === 1 ? "item" : "itens"}
          {pendentesFiltrados > 0 && (
            <strong className="ml-1.5 font-bold text-tint-orange-fg">
              · {pendentesFiltrados} {pendentesFiltrados === 1 ? "pendente" : "pendentes"}
            </strong>
          )}
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="search"
          title="Nenhum item encontrado"
          subtitle="Ajuste a busca ou o filtro para ver os itens de custo."
          action={
            <Button variant="bordered" onPress={clearFilters}>
              Limpar filtros
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-neutral-gray-4 bg-neutral-gray-2">
                <TH>Cód</TH>
                <TH>Nome</TH>
                <TH>Unidade</TH>
                <TH right teal>
                  Preço
                </TH>
                <TH>Usado em</TH>
                <TH />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const pendente = row.preco === null;
                const precoV = draft[`${row.id}:preco`] ?? precoToInput(row.preco);
                const filledNow = parseFloat(precoV) > 0;
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-neutral-gray-4",
                      pendente && !filledNow
                        ? "bg-functional-warning-light"
                        : filledNow
                          ? "bg-[#f7fffe]"
                          : "bg-white"
                    )}
                  >
                    <td className="w-[130px] px-3 py-[5px]">
                      <input
                        type="text"
                        aria-label={`Código de ${row.nome}`}
                        value={draft[`${row.id}:codigo`] ?? row.codigo ?? ""}
                        placeholder="—"
                        onChange={(e) => setField(`${row.id}:codigo`, e.target.value)}
                        onBlur={(e) => commitCodigo(row, e.target.value)}
                        className={cn(TEXT_INPUT, "w-[110px] font-mono text-[11.5px]")}
                      />
                    </td>
                    <td className="min-w-[260px] px-3 py-[5px]">
                      <input
                        type="text"
                        aria-label={`Nome de ${row.nome}`}
                        value={draft[`${row.id}:nome`] ?? row.nome}
                        onChange={(e) => setField(`${row.id}:nome`, e.target.value)}
                        onBlur={(e) => commitNome(row, e.target.value)}
                        className={cn(TEXT_INPUT, "w-full font-semibold text-neutral-gray-11")}
                      />
                    </td>
                    <td className="w-[160px] px-3 py-[5px]">
                      <Select
                        aria-label={`Unidade de ${row.nome}`}
                        options={UNIDADE_OPTIONS}
                        value={row.unidade}
                        onValueChange={(v) => changeUnidade(row, v)}
                        small
                        className="w-[140px]"
                        classNames={{ trigger: "h-[34px] min-h-[34px] bg-white" }}
                      />
                    </td>
                    <td className="px-3 py-[5px] text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <CostField
                          aria-label={`Preço de ${row.nome}`}
                          value={precoV}
                          isPending={pendente}
                          onChange={(v) => setField(`${row.id}:preco`, v)}
                          onCommit={(v) => commitPreco(row, v)}
                        />
                        {pendente && !filledNow && (
                          <span className="text-[10px] font-bold text-tint-orange-fg">
                            aguardando preço
                          </span>
                        )}
                      </div>
                    </td>
                    <td
                      className="whitespace-nowrap px-3 py-[9px] text-[11px] text-neutral-gray-7"
                      title={row.usadoEm.join(", ")}
                    >
                      {row.usos === 0
                        ? "—"
                        : `${row.usos} ${row.usos === 1 ? "material" : "materiais"}`}
                    </td>
                    <td className="w-[40px] px-2 py-[5px] text-right">
                      <button
                        type="button"
                        title="Remover item de custo"
                        aria-label={`Remover ${row.nome}`}
                        onClick={() => setDeleting(row)}
                        className="flex p-1 text-neutral-gray-6 hover:text-functional-error"
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-neutral-gray-4 bg-neutral-gray-2">
                <td
                  colSpan={6}
                  className="px-3.5 py-2.5 text-[11px] font-semibold text-neutral-gray-7"
                >
                  {rows.length} {rows.length === 1 ? "item" : "itens"} · {pendentesTotal}{" "}
                  {pendentesTotal === 1 ? "pendente" : "pendentes"}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {gridModal}

      <AlertModal
        open={deleting !== null}
        variant="error"
        title="Remover item de custo?"
        confirmLabel="Remover"
        isLoading={deleteItem.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
        body={
          deleting && (
            <>
              <strong>{deleting.nome}</strong>{" "}
              {deleting.usos === 0
                ? "não é usado em nenhuma composição."
                : `sai da composição de ${deleting.usos} ${deleting.usos === 1 ? "material" : "materiais"}.`}
            </>
          )
        }
      />
    </div>
  );
}
