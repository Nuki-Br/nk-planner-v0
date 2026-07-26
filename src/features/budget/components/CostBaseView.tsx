"use client";

import React from "react";
import { Input as HeroInput } from "@heroui/react";

import { Button, EmptyState, Icon, StatusBadge, Switch } from "@/components/ui";
import { useCategorias } from "@/lib/hooks/useCategorias";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { CategoryChip } from "@/features/catalog/components/CategoryChip";
import { ActiveChip, FilterMenu } from "@/features/catalog/components/FilterMenu";
import { cn, fmtBRL } from "@/lib/utils";
import type { CustoBaseRow } from "@/shared/types/domain";

/** Campo de custo em edição — "" enquanto o usuário limpa para redigitar. */
type Draft = Record<number, { mat?: string; mo?: string }>;

/** "" = todos. */
type StatusFilter = "" | "pendente" | "preenchido";
/** "" = todos; "opcao" = ofertável; "item" = só sub-item de kit / item de custo. */
type TipoFilter = "" | "opcao" | "item";

/** Busca sem acento/maiúscula (mesma normalização da busca do catálogo). */
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Ordena nomes de categoria em PT-BR; "" (sem categoria) sempre por último. */
const byCategoria = (a: string, b: string) =>
  a === "" ? 1 : b === "" ? -1 : a.localeCompare(b, "pt-BR");

function CostField({
  value,
  isPending,
  onChange,
  onCommit,
}: {
  value: string;
  isPending: boolean;
  onChange: (v: string) => void;
  onCommit: (v: string) => void;
}) {
  const filledNow = value !== "" && parseFloat(value) > 0;
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
        onBlur={(e) => onCommit(e.target.value)}
        className={cn(
          "h-[34px] w-[118px] rounded-md border py-0 pl-[26px] pr-2 text-right text-[12.5px] outline-none",
          isPending && !filledNow
            ? "border-functional-error bg-functional-error-light text-neutral-gray-9"
            : filledNow
              ? "border-primary-7 bg-white font-bold text-primary-8"
              : "border-neutral-gray-5 bg-white text-neutral-gray-9"
        )}
      />
    </div>
  );
}

interface CostBaseViewProps {
  /** Todo material que precisa de custo NESTE empreendimento (todas as tipologias). */
  rows: CustoBaseRow[];
  /** Persiste no blur. Campo omitido = não mexe (a grade grava um por vez). */
  onPersist: (baseId: number, patch: { custoMat?: number; custoMO?: number }) => void;
}

/**
 * Visão "Custos base" — grade editável de custo material/MO POR EMPREENDIMENTO.
 *
 * Lista de-duplicada: um material usado em cinco componentes aparece uma vez só,
 * porque o custo é um só. Antes esta grade era por tipologia e repetia o mesmo
 * material em cada ambiente, dando a impressão de que dava para cobrar preços
 * diferentes — não dá, e não deveria dar.
 *
 * Filtros (busca, categoria, status, tipo) + agrupamento por categoria com
 * subtotal e contagem de pendentes por grupo. O agrupamento é o padrão; o
 * interruptor "Agrupar por categoria" volta à lista plana quando incomoda.
 *
 * SEM coluna de comentários, ao contrário da versão por tipologia: a thread é
 * por APLICAÇÃO (Material), e aqui uma linha pode ser cinco aplicações. Um
 * contador somado abriria uma thread escolhida a esmo. Os comentários seguem na
 * aba "Preço final", onde cada linha é uma aplicação só.
 */
export function CostBaseView({ rows, onPersist }: CostBaseViewProps) {
  // Só o que está sendo digitado: o valor de verdade vem do servidor. Guardar a
  // grade inteira em estado local traria de volta o bug de custo que sumia no
  // reload — o rascunho aqui vive entre o keystroke e o blur, mais nada.
  const [draft, setDraft] = React.useState<Draft>({});

  const { data: categorias = [] } = useCategorias();

  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounce(search, 250);
  const [catFilters, setCatFilters] = React.useState<string[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("");
  const [tipoFilter, setTipoFilter] = React.useState<TipoFilter>("");
  const [grouped, setGrouped] = React.useState(true);
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());

  const setField = (baseId: number, fld: "mat" | "mo", val: string) =>
    setDraft((p) => ({ ...p, [baseId]: { ...p[baseId], [fld]: val } }));

  const valOf = (row: CustoBaseRow, fld: "mat" | "mo"): string => {
    const d = draft[row.baseId]?.[fld];
    if (d !== undefined) return d;
    const v = fld === "mat" ? row.custoMat : row.custoMO;
    return v > 0 ? String(v) : "";
  };

  const commit = (row: CustoBaseRow, fld: "mat" | "mo", raw: string) => {
    const n = parseFloat(raw.replace(",", ".")) || 0;
    const atual = fld === "mat" ? row.custoMat : row.custoMO;
    // Sai do campo sem ter mudado nada → nenhum request.
    if (n !== atual) onPersist(row.baseId, fld === "mat" ? { custoMat: n } : { custoMO: n });
    setDraft((p) => {
      const next = { ...p };
      delete next[row.baseId];
      return next;
    });
  };

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
    setTipoFilter("");
  };

  const pendentesTotal = rows.filter((r) => r.custoMat <= 0).length;

  // Opções do filtro de categoria a partir das linhas presentes (com contagem).
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
        if (statusFilter === "pendente" && r.custoMat > 0) return false;
        if (statusFilter === "preenchido" && r.custoMat <= 0) return false;
        if (tipoFilter === "item" && !r.somenteIndireto) return false;
        if (tipoFilter === "opcao" && r.somenteIndireto) return false;
        return true;
      }),
    [rows, q, catFilters, statusFilter, tipoFilter]
  );

  // Grupos ordenados por categoria (sem categoria por último); a ordem das
  // linhas dentro do grupo herda a do servidor (pendentes primeiro, depois A→Z).
  const groups = React.useMemo(() => {
    const m = new Map<string, CustoBaseRow[]>();
    for (const r of filtered) {
      const arr = m.get(r.categoria);
      if (arr) arr.push(r);
      else m.set(r.categoria, [r]);
    }
    return [...m.entries()].sort(([a], [b]) => byCategoria(a, b));
  }, [filtered]);

  const pendentesFiltrados = filtered.filter((r) => r.custoMat <= 0).length;
  const totalBase = filtered.reduce((s, r) => s + r.custoMat + r.custoMO, 0);
  const hasFilters =
    search !== "" || catFilters.length > 0 || statusFilter !== "" || tipoFilter !== "";

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

  /** Uma linha de material. `showCat` mostra o chip de categoria (só na lista plana). */
  const renderRow = (row: CustoBaseRow, showCat: boolean) => {
    const matV = valOf(row, "mat");
    const moV = valOf(row, "mo");
    const matN = parseFloat(matV) || 0;
    const moN = parseFloat(moV) || 0;
    const isPending = row.custoMat <= 0 && !(matN > 0);
    return (
      <tr
        key={row.baseId}
        className={cn(
          "border-b border-neutral-gray-4",
          isPending ? "bg-functional-warning-light" : matN > 0 ? "bg-[#f7fffe]" : "bg-white"
        )}
      >
        <td className="min-w-[240px] px-3.5 py-[9px]">
          <div
            className={cn(
              "text-xs font-semibold",
              isPending ? "text-tint-amber-fg" : "text-neutral-gray-11"
            )}
          >
            {row.nome}
          </div>
          <div
            className={cn(
              "mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px]",
              isPending ? "text-[#b45309]" : "text-neutral-gray-6"
            )}
          >
            <span>{row.fabricante || "sem fabricante"}</span>
            {showCat && row.categoria !== "" && (
              <CategoryChip nome={row.categoria} categorias={categorias} />
            )}
            {/* Não é uma opção ofertada ao cliente: entra no custo por dentro
                (sub-item de kit ou item de custo), e por isso não aparece como
                linha própria na aba "Preço final". */}
            {row.somenteIndireto && (
              <span className="rounded bg-neutral-gray-3 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-neutral-gray-7">
                Item de custo
              </span>
            )}
            {isPending && <span className="font-bold text-tint-orange-fg">Aguardando custo</span>}
          </div>
        </td>
        <td className="min-w-[200px] px-3.5 py-[9px] text-[11px] text-neutral-gray-7">
          {/* Três já dizem "é usado em vários lugares"; a lista inteira vira
              parede de texto numa grade densa. */}
          {row.usadoEm.slice(0, 3).join(", ")}
          {row.usadoEm.length > 3 && (
            <span className="text-neutral-gray-6"> +{row.usadoEm.length - 3}</span>
          )}
        </td>
        <td className="px-3 py-[5px] text-right">
          <CostField
            value={matV}
            isPending={isPending}
            onChange={(v) => setField(row.baseId, "mat", v)}
            onCommit={(v) => commit(row, "mat", v)}
          />
        </td>
        <td className="px-3 py-[5px] text-right">
          <CostField
            value={moV}
            isPending={isPending}
            onChange={(v) => setField(row.baseId, "mo", v)}
            onCommit={(v) => commit(row, "mo", v)}
          />
        </td>
        <td
          className={cn(
            "whitespace-nowrap px-3 py-[9px] text-right text-xs font-bold",
            matN + moN > 0 ? "text-neutral-gray-11" : "text-neutral-gray-5"
          )}
        >
          {matN + moN > 0 ? fmtBRL(matN + moN) : "—"}
        </td>
        <td className="px-3 py-[9px]">
          <StatusBadge status={isPending ? "pendente" : "preenchido"} />
        </td>
      </tr>
    );
  };

  // Sem nenhum material aplicado: estado vazio de verdade (não é filtro).
  if (rows.length === 0) {
    return (
      <div className="mb-6 rounded-b-lg border border-t-0 border-neutral-gray-4 bg-white">
        <EmptyState
          icon="layers"
          title="Nenhum material aplicado neste empreendimento"
          subtitle="Cadastre as tipologias e seus componentes para preencher os custos base."
        />
      </div>
    );
  }

  return (
    <div className="mb-6 overflow-hidden rounded-b-lg border border-neutral-gray-4 bg-white">
      {/* Toolbar: busca + filtros + agrupar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-neutral-gray-4 px-4 py-3">
        <HeroInput
          value={search}
          onValueChange={setSearch}
          aria-label="Buscar custo base"
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
          <FilterMenu
            label="Tipo"
            icon="tune"
            options={[
              { value: "", label: "Todos" },
              { value: "opcao", label: "Opções de acabamento" },
              { value: "item", label: "Itens de custo" },
            ]}
            value={tipoFilter}
            onChange={(v) => setTipoFilter(v as TipoFilter)}
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
          {tipoFilter !== "" && (
            <ActiveChip
              label={tipoFilter === "opcao" ? "Opções de acabamento" : "Itens de custo"}
              onRemove={() => setTipoFilter("")}
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

      {/* Banner explicativo + resumo */}
      <div className="flex items-center gap-2 border-b border-neutral-gray-4 bg-neutral-gray-2 px-4 py-[9px]">
        <Icon name="edit" size={13} className="text-primary-7" />
        <span className="text-xs font-semibold text-primary-7">
          Custo de material e mão de obra deste empreendimento — vale para todas as tipologias
        </span>
        <span className="ml-auto whitespace-nowrap text-[11px] text-neutral-gray-7">
          {hasFilters ? `${filtered.length} de ${rows.length}` : filtered.length}{" "}
          {filtered.length === 1 ? "material" : "materiais"}
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
          title="Nenhum material encontrado"
          subtitle="Ajuste a busca ou os filtros para ver os custos base deste empreendimento."
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
                <TH>Onde é usado</TH>
                <TH right teal>Custo mat.</TH>
                <TH right teal>Custo MO</TH>
                <TH right>Total base</TH>
                <TH>Status</TH>
              </tr>
            </thead>

            {grouped ? (
              groups.map(([cat, groupRows]) => {
                const isCollapsed = collapsed.has(cat);
                const sub = groupRows.reduce((s, r) => s + r.custoMat + r.custoMO, 0);
                const subPend = groupRows.filter((r) => r.custoMat <= 0).length;
                return (
                  <tbody key={cat || "__sem__"}>
                    <tr className="border-b border-neutral-gray-4 bg-neutral-gray-2">
                      <td colSpan={6} className="p-0">
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
                            {groupRows.length} {groupRows.length === 1 ? "material" : "materiais"}
                          </span>
                          {subPend > 0 && (
                            <span className="text-[11px] font-bold text-tint-orange-fg">
                              · {subPend} sem custo
                            </span>
                          )}
                          <span className="ml-auto whitespace-nowrap text-[11px] text-neutral-gray-7">
                            Total base{" "}
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
                <td
                  colSpan={4}
                  className="px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-neutral-gray-7"
                >
                  Total base — soma dos custos unitários
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right text-xs font-bold text-neutral-gray-11">
                  {totalBase > 0 ? fmtBRL(totalBase) : "—"}
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
