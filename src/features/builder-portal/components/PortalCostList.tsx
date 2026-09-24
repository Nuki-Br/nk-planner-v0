"use client";

import React from "react";
import { Input as HeroInput } from "@heroui/react";

import { Button, EmptyState, Icon, StatusBadge, Switch } from "@/components/ui";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { CategoryChip } from "@/features/catalog/components/CategoryChip";
import { ActiveChip, FilterMenu } from "@/features/catalog/components/FilterMenu";
import { byCategoria, cn, fmtBRL, norm, parseBR } from "@/lib/utils";
import type {
  CategoriaCatalogo,
  CustoBaseRow,
  FillLinkCampos,
  PortalFill,
} from "@/shared/types/domain";

/** "" = todos. */
type StatusFilter = "" | "pendente" | "preenchido";

const EMPTY_FILL: PortalFill = { mat: "", mo: "", comment: "" };

/**
 * Um item está "preenchido" quando seu campo PRIMÁRIO tem valor > 0 — custo de
 * material se o link o liberou, senão mão de obra. Coerente com "pendente =
 * custo material" e com o gating de colunas. Fonte única usada pela grade e pelo
 * contador de progresso do cabeçalho.
 */
export function isFillFilled(fill: PortalFill | undefined, campos: FillLinkCampos): boolean {
  const c = fill ?? EMPTY_FILL;
  return parseBR(campos.mat ? c.mat : c.mo) > 0;
}

/** Campo de custo do portal — atualiza o rascunho a cada tecla (envio em lote). */
function CostInput({
  value,
  pending,
  onChange,
}: {
  value: string;
  pending: boolean;
  onChange: (v: string) => void;
}) {
  const filled = parseBR(value) > 0;
  return (
    <div className="relative inline-block">
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-neutral-gray-6">
        R$
      </span>
      <input
        type="number"
        step="0.01"
        value={value}
        placeholder="0,00"
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-[34px] w-[112px] rounded-md border py-0 pl-[26px] pr-2 text-right text-[12.5px] outline-none",
          pending && !filled
            ? "border-functional-error bg-functional-error-light text-neutral-gray-9"
            : filled
              ? "border-primary-7 bg-white font-bold text-primary-8"
              : "border-neutral-gray-5 bg-white text-neutral-gray-9"
        )}
      />
    </div>
  );
}

interface PortalCostListProps {
  /** Linhas de custo do escopo do link (lista plana e de-duplicada). */
  rows: CustoBaseRow[];
  /** Campos liberados pelo link (colunas mat/MO/comentário). */
  campos: FillLinkCampos;
  /** Cores das categorias (vêm no payload — o portal é público). */
  categorias: CategoriaCatalogo[];
  /** Rascunho por baseId (string). */
  costs: Record<string, PortalFill>;
  setCostField: (baseId: string, fld: keyof PortalFill, val: string) => void;
  openComment: string | null;
  setOpenComment: (id: string | null) => void;
}

/**
 * Grade de preenchimento do portal — mesma apresentação da aba "Custos base"
 * (busca + filtros + agrupamento por categoria + subtotais + status), mas com
 * rascunho local (o envio é em lote) e colunas condicionadas ao escopo do link.
 *
 * A pendência aqui é do RASCUNHO (o que a construtora digitou), não do servidor:
 * conforme preenche, "sem custo" encolhe. O campo primário é o custo de material
 * quando liberado, senão a mão de obra — coerente com "pendente = custo material".
 */
export function PortalCostList({
  rows,
  campos,
  categorias,
  costs,
  setCostField,
  openComment,
  setOpenComment,
}: PortalCostListProps) {
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounce(search, 250);
  const [catFilters, setCatFilters] = React.useState<string[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("");
  const [grouped, setGrouped] = React.useState(true);
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());

  const toggleCollapse = (cat: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });

  const clearFilters = () => {
    setSearch("");
    setCatFilters([]);
    setStatusFilter("");
  };

  const fillOf = React.useCallback(
    (row: CustoBaseRow): PortalFill => costs[String(row.baseId)] ?? EMPTY_FILL,
    [costs]
  );
  const isFilled = React.useCallback(
    (row: CustoBaseRow): boolean => isFillFilled(fillOf(row), campos),
    [fillOf, campos]
  );

  const pendentesTotal = rows.filter((r) => !isFilled(r)).length;

  const catCounts = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.categoria, (m.get(r.categoria) ?? 0) + 1);
    return m;
  }, [rows]);

  const catOptions = React.useMemo(
    () =>
      [...catCounts.keys()].sort(byCategoria).map((nome) => ({
        value: nome,
        label: `${nome === "" ? "Sem categoria" : nome} (${catCounts.get(nome) ?? 0})`,
      })),
    [catCounts]
  );

  const q = React.useMemo(() => norm(debouncedSearch.trim()), [debouncedSearch]);

  const filtered = React.useMemo(
    () =>
      rows.filter((r) => {
        if (
          q &&
          !(norm(r.nome).includes(q) || norm(r.fabricante).includes(q) || norm(r.categoria).includes(q))
        )
          return false;
        if (catFilters.length > 0 && !catFilters.includes(r.categoria)) return false;
        const filled = isFilled(r);
        if (statusFilter === "pendente" && filled) return false;
        if (statusFilter === "preenchido" && !filled) return false;
        return true;
      }),
    [rows, q, catFilters, statusFilter, isFilled]
  );

  const groups = React.useMemo(() => {
    const m = new Map<string, CustoBaseRow[]>();
    for (const r of filtered) {
      const arr = m.get(r.categoria);
      if (arr) arr.push(r);
      else m.set(r.categoria, [r]);
    }
    return [...m.entries()].sort(([a], [b]) => byCategoria(a, b));
  }, [filtered]);

  // Subtotal do rascunho (soma dos campos liberados) — não do servidor.
  const subtotalOf = React.useCallback(
    (list: CustoBaseRow[]): number =>
      list.reduce((s, r) => {
        const c = fillOf(r);
        return s + (campos.mat ? parseBR(c.mat) : 0) + (campos.mo ? parseBR(c.mo) : 0);
      }, 0),
    [fillOf, campos.mat, campos.mo]
  );

  const pendentesFiltrados = filtered.filter((r) => !isFilled(r)).length;
  const totalInformado = subtotalOf(filtered);
  const hasFilters = search !== "" || catFilters.length > 0 || statusFilter !== "";

  // Colunas dependem do escopo do link (campos).
  const colSpan =
    2 + (campos.mat ? 1 : 0) + (campos.mo ? 1 : 0) + (campos.comment ? 1 : 0);

  const TH = ({
    children,
    right = false,
    teal = false,
  }: {
    children?: React.ReactNode;
    right?: boolean;
    teal?: boolean;
  }) => (
    <th
      className={cn(
        "whitespace-nowrap px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider",
        right ? "text-right" : "text-left",
        teal ? "bg-primary-1 text-primary-7" : "text-neutral-gray-7"
      )}
    >
      {children}
    </th>
  );

  const renderRow = (row: CustoBaseRow, showCat: boolean) => {
    const key = String(row.baseId);
    const c = fillOf(row);
    const filled = isFilled(row);
    const pending = !filled;
    return (
      <tr
        key={row.baseId}
        className={cn(
          "border-b border-neutral-gray-4",
          pending ? "bg-functional-warning-light" : "bg-[#f7fffe]"
        )}
      >
        <td className="min-w-[240px] px-3.5 py-[9px]">
          <div
            className={cn(
              "text-xs font-semibold",
              pending ? "text-tint-amber-fg" : "text-neutral-gray-11"
            )}
          >
            {row.nome}
          </div>
          <div
            className={cn(
              "mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px]",
              pending ? "text-[#b45309]" : "text-neutral-gray-6"
            )}
          >
            <span>{row.fabricante || "sem fabricante"}</span>
            {showCat && row.categoria !== "" && (
              <CategoryChip nome={row.categoria} categorias={categorias} />
            )}
            {row.somenteIndireto && (
              <span className="rounded bg-neutral-gray-3 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-neutral-gray-7">
                Sub-item de kit
              </span>
            )}
            {row.usadoEm.length > 0 && (
              <span className="text-neutral-gray-6">
                · {row.usadoEm.slice(0, 3).join(", ")}
                {row.usadoEm.length > 3 && ` +${row.usadoEm.length - 3}`}
              </span>
            )}
          </div>
        </td>
        {campos.mat && (
          <td className="px-3 py-[5px] text-right">
            <CostInput
              value={c.mat}
              pending={pending}
              onChange={(v) => setCostField(key, "mat", v)}
            />
          </td>
        )}
        {campos.mo && (
          <td className="px-3 py-[5px] text-right">
            <CostInput
              value={c.mo}
              pending={pending && !campos.mat}
              onChange={(v) => setCostField(key, "mo", v)}
            />
          </td>
        )}
        {campos.comment && (
          <td className="w-[190px] px-3 py-[5px]">
            {openComment === key ? (
              <input
                autoFocus
                value={c.comment}
                onChange={(e) => setCostField(key, "comment", e.target.value)}
                onBlur={() => setOpenComment(null)}
                placeholder="Adicionar comentário..."
                className="h-[34px] w-full rounded-md border border-neutral-gray-5 px-2 text-xs outline-none focus:border-primary-7"
              />
            ) : (
              <button
                type="button"
                onClick={() => setOpenComment(key)}
                className={cn(
                  "flex items-center gap-1 text-xs",
                  c.comment ? "font-medium text-tint-orange-fg" : "text-neutral-gray-6"
                )}
              >
                <Icon name="chat" size={14} />
                {c.comment ? "Ver comentário" : "Adicionar"}
              </button>
            )}
          </td>
        )}
        <td className="px-3 py-[9px]">
          <StatusBadge status={filled ? "preenchido" : "pendente"} />
        </td>
      </tr>
    );
  };

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-gray-4 bg-white">
      {/* Toolbar: busca + filtros + agrupar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-neutral-gray-4 px-4 py-3">
        <HeroInput
          value={search}
          onValueChange={setSearch}
          aria-label="Buscar item"
          placeholder="Buscar por especificação ou fabricante..."
          variant="bordered"
          radius="sm"
          size="sm"
          isClearable
          onClear={() => setSearch("")}
          startContent={<Icon name="search" size={14} className="text-neutral-gray-6" />}
          classNames={{
            base: "w-72 max-w-full flex-none",
            inputWrapper: "!border-small h-10 border-neutral-gray-5 bg-white",
            input: "text-[13px]",
          }}
        />
        <div className="flex flex-wrap items-center gap-2.5">
          <FilterMenu
            label="Categoria"
            icon="filter"
            multi
            options={catOptions}
            value={catFilters}
            onChange={(v) =>
              setCatFilters((cs) => (cs.includes(v) ? cs.filter((x) => x !== v) : [...cs, v]))
            }
          />
          <FilterMenu
            label="Status"
            icon="tune"
            options={[
              { value: "", label: `Todos (${rows.length})` },
              { value: "pendente", label: `Sem custo (${pendentesTotal})` },
              { value: "preenchido", label: `Com custo (${rows.length - pendentesTotal})` },
            ]}
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as StatusFilter)}
          />
        </div>
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-[12px] font-medium text-neutral-gray-8">
          <Switch size="sm" isSelected={grouped} onValueChange={setGrouped} />
          Agrupar por categoria
        </label>
      </div>

      {/* Chips dos filtros ativos */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2 border-b border-neutral-gray-4 px-4 py-2.5">
          {search !== "" && <ActiveChip label={`"${search}"`} onRemove={() => setSearch("")} />}
          {catFilters.map((c) => (
            <ActiveChip
              key={c || "__sem__"}
              label={c === "" ? "Sem categoria" : c}
              onRemove={() => setCatFilters((cs) => cs.filter((x) => x !== c))}
            />
          ))}
          {statusFilter !== "" && (
            <ActiveChip
              label={statusFilter === "pendente" ? "Sem custo" : "Com custo"}
              onRemove={() => setStatusFilter("")}
            />
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

      {/* Resumo */}
      <div className="flex items-center gap-2 border-b border-neutral-gray-4 bg-neutral-gray-2 px-4 py-[9px]">
        <Icon name="edit" size={13} className="text-primary-7" />
        <span className="text-xs font-semibold text-primary-7">
          Preencha o custo de material e mão de obra de cada item
        </span>
        <span className="ml-auto whitespace-nowrap text-[11px] text-neutral-gray-7">
          {hasFilters ? `${filtered.length} de ${rows.length}` : filtered.length}{" "}
          {filtered.length === 1 ? "item" : "itens"}
          {pendentesFiltrados > 0 && (
            <strong className="ml-1.5 font-bold text-tint-orange-fg">
              · {pendentesFiltrados} sem custo
            </strong>
          )}
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="search"
          title="Nenhum item encontrado"
          subtitle="Ajuste a busca ou os filtros para ver os itens a preencher."
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
                <TH>Especificação</TH>
                {campos.mat && (
                  <TH right teal>
                    Custo mat.
                  </TH>
                )}
                {campos.mo && (
                  <TH right teal>
                    Custo MO
                  </TH>
                )}
                {campos.comment && <TH>Comentário</TH>}
                <TH>Status</TH>
              </tr>
            </thead>

            {grouped ? (
              groups.map(([cat, groupRows]) => {
                const isCollapsed = collapsed.has(cat);
                const sub = subtotalOf(groupRows);
                const subPend = groupRows.filter((r) => !isFilled(r)).length;
                return (
                  <tbody key={cat || "__sem__"}>
                    <tr className="border-b border-neutral-gray-4 bg-neutral-gray-2">
                      <td colSpan={colSpan} className="p-0">
                        <button
                          type="button"
                          onClick={() => toggleCollapse(cat)}
                          aria-expanded={!isCollapsed}
                          className="flex w-full items-center gap-2 px-3.5 py-2 text-left hover:bg-neutral-gray-3"
                        >
                          <Icon
                            name={isCollapsed ? "chevR" : "chevD"}
                            size={14}
                            className="shrink-0 text-neutral-gray-6"
                          />
                          <CategoryChip nome={cat} categorias={categorias} />
                          <span className="text-[11px] font-medium text-neutral-gray-7">
                            {groupRows.length} {groupRows.length === 1 ? "item" : "itens"}
                          </span>
                          {subPend > 0 && (
                            <span className="text-[11px] font-bold text-tint-orange-fg">
                              · {subPend} sem custo
                            </span>
                          )}
                          <span className="ml-auto whitespace-nowrap text-[11px] text-neutral-gray-7">
                            Subtotal{" "}
                            <strong className="font-bold text-neutral-gray-11">
                              {sub > 0 ? fmtBRL(sub) : "—"}
                            </strong>
                          </span>
                        </button>
                      </td>
                    </tr>
                    {!isCollapsed && groupRows.map((row) => renderRow(row, false))}
                  </tbody>
                );
              })
            ) : (
              <tbody>{filtered.map((row) => renderRow(row, true))}</tbody>
            )}

            <tfoot>
              <tr className="border-t-2 border-neutral-gray-4 bg-neutral-gray-2">
                <td className="px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-neutral-gray-7">
                  Total informado — soma dos custos unitários
                </td>
                <td
                  colSpan={colSpan - 2}
                  className="whitespace-nowrap px-3 py-2.5 text-right text-xs font-bold text-neutral-gray-11"
                >
                  {totalInformado > 0 ? fmtBRL(totalInformado) : "—"}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
