"use client";

import React from "react";

import { Button, EmptyState, Icon, Input, StatusBadge, Switch } from "@/components/ui";
import { CategoryChip } from "@/features/catalog/components/CategoryChip";
import { ActiveChip, FilterMenu } from "@/features/catalog/components/FilterMenu";
import { useCategorias } from "@/lib/hooks/useCategorias";
import { useComposicaoOp } from "@/lib/hooks/useComposicao";
import { useCostItems } from "@/lib/hooks/useCostItems";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { byCategoria, cn, fmtBRL, norm } from "@/lib/utils";
import type { CustoBase, CustoBaseRow } from "@/shared/types/domain";
import {
  composicaoSubtotal,
  custoBasePendente,
  custoBaseStatus,
  custoBaseTotal,
  linhasPendentes,
  type CustoBaseStatus,
} from "@/shared/utils/custoBase";

import { ApplyCompositionModal } from "./ApplyCompositionModal";
import { CompositionPanel } from "./CompositionPanel";
import { CostField, precoToInput, TH } from "./CostField";
import { CostItemsGridModal } from "./CostItemsGridModal";

/** Campo de custo em edição — "" enquanto o usuário limpa para redigitar. */
type Draft = Record<number, { mat?: string; mo?: string }>;

/** "" = todos. "sem_custo" = zero marcado de propósito (ex.: "Não entregue"). */
type StatusFilter = "" | CustoBaseStatus;

const STATUS_LABEL: Record<CustoBaseStatus, string> = {
  pendente: "Pendente",
  preenchido: "Com custo",
  sem_custo: "Sem custo",
};

const COLS = 7;

interface CostBaseViewProps {
  projectId: number;
  /** Todo material que precisa de custo NESTE empreendimento (todas as tipologias). */
  rows: CustoBaseRow[];
  /**
   * Persiste no blur. Campo omitido = não mexe (a grade grava um por vez).
   * `custoMat: null` volta a pendente; `custoMat: 0` marca "sem custo".
   */
  onPersist: (baseId: number, patch: { custoMat?: number | null; custoMO?: number }) => void;
}

/**
 * Visão "Custos base" — grade editável de custo material/MO POR EMPREENDIMENTO,
 * agora com a COMPOSIÇÃO de cada material (insumos × quantitativo, como na
 * planilha da construtora): total = custoMat × custoQtd + custoMO + Σ insumos.
 *
 * Lista de-duplicada: um material usado em cinco componentes aparece uma vez só,
 * porque o custo é um só. A linha expande (chevron ou coluna Composição) para
 * o painel de composição; a grade "Adicionar itens" e o "Aplicar em…" são
 * modais deste componente — o BudgetScreen só entrega as linhas e o persist do
 * custo mat/MO.
 *
 * Filtros (busca, categoria, status) + agrupamento por categoria com subtotal e
 * contagem de pendentes por grupo. SEM coluna de comentários: a thread é por
 * APLICAÇÃO (Material), e aqui uma linha pode ser cinco aplicações.
 */
export function CostBaseView({ projectId, rows, onPersist }: CostBaseViewProps) {
  // Só o que está sendo digitado: o valor de verdade vem do servidor. O
  // rascunho vive entre o keystroke e o blur, mais nada.
  const [draft, setDraft] = React.useState<Draft>({});

  const { data: categorias = [] } = useCategorias();
  const { data: costItemsData } = useCostItems(projectId);
  const costItems = React.useMemo(() => costItemsData ?? [], [costItemsData]);
  const composicao = useComposicaoOp(projectId);

  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounce(search, 250);
  const [catFilters, setCatFilters] = React.useState<string[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("");
  const [grouped, setGrouped] = React.useState(true);
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());

  // Composição: linhas expandidas + modais (grade de itens / aplicar em…).
  const [expanded, setExpanded] = React.useState<Set<number>>(new Set());
  const [gridFor, setGridFor] = React.useState<CustoBaseRow | null>(null);
  const [applyFrom, setApplyFrom] = React.useState<CustoBaseRow | null>(null);

  const setField = (baseId: number, fld: "mat" | "mo", val: string) =>
    setDraft((p) => ({ ...p, [baseId]: { ...p[baseId], [fld]: val } }));

  const valOf = (row: CustoBaseRow, fld: "mat" | "mo"): string => {
    const d = draft[row.baseId]?.[fld];
    if (d !== undefined) return d;
    return precoToInput(fld === "mat" ? row.custoMat : row.custoMO);
  };

  const commit = (row: CustoBaseRow, fld: "mat" | "mo", raw: string) => {
    // Blur sem ter digitado nada (sem rascunho) → nenhum request. Importa para
    // custoMat 0 com composição: o campo mostra "" e não pode virar null no blur.
    if (draft[row.baseId]?.[fld] !== undefined) {
      const n = parseFloat(raw.replace(",", ".")) || 0;
      if (fld === "mat") {
        // Digitar 0 ou limpar volta a PENDENTE, não a "sem custo": um zero
        // acidental não pode virar material grátis. "Sem custo" é a ação explícita.
        const mat = n > 0 ? n : null;
        if (mat !== row.custoMat) onPersist(row.baseId, { custoMat: mat });
      } else if (n !== row.custoMO) {
        onPersist(row.baseId, { custoMO: n });
      }
    }
    setDraft((p) => {
      const next = { ...p };
      const cur = { ...next[row.baseId] };
      delete cur[fld];
      if (cur.mat === undefined && cur.mo === undefined) delete next[row.baseId];
      else next[row.baseId] = cur;
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

  const toggleExpand = (baseId: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(baseId)) next.delete(baseId);
      else next.add(baseId);
      return next;
    });

  const clearFilters = () => {
    setSearch("");
    setCatFilters([]);
    setStatusFilter("");
  };

  const countBy = (status: CustoBaseStatus) =>
    rows.filter((r) => custoBaseStatus(r) === status).length;
  const pendentesTotal = countBy("pendente");

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
          !(
            norm(r.nome).includes(q) ||
            norm(r.codigo).includes(q) ||
            norm(r.fabricante).includes(q) ||
            norm(r.categoria).includes(q)
          )
        )
          return false;
        if (catFilters.length > 0 && !catFilters.includes(r.categoria)) return false;
        if (statusFilter !== "" && custoBaseStatus(r) !== statusFilter) return false;
        return true;
      }),
    [rows, q, catFilters, statusFilter]
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

  const pendentesFiltrados = filtered.filter(custoBasePendente).length;
  const totalBase = filtered.reduce((s, r) => s + custoBaseTotal(r), 0);
  const hasFilters = search !== "" || catFilters.length > 0 || statusFilter !== "";

  // Destinos do "Aplicar em…": mesma categoria (todos quando não há categoria).
  const applyCandidates = React.useMemo(() => {
    if (!applyFrom) return [];
    return rows.filter(
      (r) =>
        r.baseId !== applyFrom.baseId &&
        (applyFrom.categoria === "" || r.categoria === applyFrom.categoria)
    );
  }, [rows, applyFrom]);

  /** Uma linha de material (+ painel de composição quando expandida). `showCat` só na lista plana. */
  const renderRow = (row: CustoBaseRow, showCat: boolean) => {
    const matV = valOf(row, "mat");
    const moV = valOf(row, "mo");
    const matN = parseFloat(matV) || 0;
    const moN = parseFloat(moV) || 0;
    const d = draft[row.baseId];
    // Total/status ao vivo: o rascunho digitado entra antes do blur.
    const eff: CustoBase = d
      ? {
          ...row,
          custoMat: d.mat !== undefined ? (matN > 0 ? matN : null) : row.custoMat,
          custoMO: d.mo !== undefined ? moN : row.custoMO,
        }
      : row;
    const status = custoBaseStatus(eff);
    const total = custoBaseTotal(eff);
    const semCusto = status === "sem_custo";
    const isPending = status === "pendente";
    const matPending = eff.custoMat === null;
    const isOpen = expanded.has(row.baseId);
    const nLinhas = row.composicao.length;
    const nPend = linhasPendentes(row).length;
    const subComp = composicaoSubtotal(row.composicao);

    return (
      <React.Fragment key={row.baseId}>
        <tr
          className={cn(
            "border-b border-neutral-gray-4",
            isPending ? "bg-functional-warning-light" : matN > 0 ? "bg-[#f7fffe]" : "bg-white",
            isOpen && "border-b-0"
          )}
        >
          <td className="min-w-[260px] px-3.5 py-[9px]">
            <div className="flex items-start gap-1.5">
              <button
                type="button"
                onClick={() => toggleExpand(row.baseId)}
                aria-expanded={isOpen}
                aria-label={isOpen ? "Recolher composição" : "Ver composição"}
                title={isOpen ? "Recolher composição" : "Ver composição"}
                className="-ml-1 mt-px flex shrink-0 rounded p-0.5 text-neutral-gray-6 hover:bg-neutral-gray-3 hover:text-neutral-gray-9"
              >
                <Icon name={isOpen ? "chevD" : "chevR"} size={14} />
              </button>
              <div className="min-w-0">
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
                  {row.codigo !== "" && (
                    <code className="font-mono text-[10.5px] text-neutral-gray-6">{row.codigo}</code>
                  )}
                  <span>{row.fabricante || "sem fabricante"}</span>
                  {showCat && row.categoria !== "" && (
                    <CategoryChip nome={row.categoria} categorias={categorias} />
                  )}
                  {/* Não é uma opção ofertada ao cliente: entra no custo por dentro
                      de um kit, e por isso não aparece como linha própria na aba
                      "Preço final". */}
                  {row.somenteIndireto && (
                    <span className="rounded bg-neutral-gray-3 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-neutral-gray-7">
                      Sub-item de kit
                    </span>
                  )}
                  {isPending && (
                    <span className="font-bold text-tint-orange-fg">
                      {matPending ? "Aguardando custo" : "Insumo sem preço"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </td>
          <td className="min-w-[180px] px-3.5 py-[9px] text-[11px] text-neutral-gray-7">
            {/* Três já dizem "é usado em vários lugares"; a lista inteira vira
                parede de texto numa grade densa. */}
            {row.usadoEm.slice(0, 3).join(", ")}
            {row.usadoEm.length > 3 && (
              <span className="text-neutral-gray-6"> +{row.usadoEm.length - 3}</span>
            )}
          </td>
          <td className="px-3 py-[5px] text-right">
            <CostField
              aria-label={`Custo de material de ${row.nome}`}
              value={matV}
              isPending={matPending}
              disabled={semCusto}
              onChange={(v) => setField(row.baseId, "mat", v)}
              onCommit={(v) => commit(row, "mat", v)}
            />
          </td>
          <td className="px-3 py-[5px] text-right">
            <CostField
              aria-label={`Custo de mão de obra de ${row.nome}`}
              value={moV}
              isPending={matPending}
              disabled={semCusto}
              onChange={(v) => setField(row.baseId, "mo", v)}
              onCommit={(v) => commit(row, "mo", v)}
            />
          </td>
          <td className="px-3 py-[9px]">
            <button
              type="button"
              onClick={() => toggleExpand(row.baseId)}
              title={isOpen ? "Recolher composição" : "Ver composição"}
              className="text-left"
            >
              {nLinhas === 0 ? (
                <span className="text-[12.5px] text-neutral-gray-5">—</span>
              ) : (
                <span className="whitespace-nowrap text-[12.5px] font-semibold text-neutral-gray-9">
                  {nLinhas} {nLinhas === 1 ? "item" : "itens"} · {fmtBRL(subComp)}
                </span>
              )}
              {nPend > 0 && (
                <span className="block whitespace-nowrap text-[11px] font-bold text-tint-orange-fg">
                  {nPend} {nPend === 1 ? "insumo sem preço" : "insumos sem preço"}
                </span>
              )}
            </button>
          </td>
          <td
            className={cn(
              "whitespace-nowrap px-3 py-[9px] text-right text-xs font-bold",
              total > 0 || semCusto ? "text-neutral-gray-11" : "text-neutral-gray-5"
            )}
          >
            {total > 0 || semCusto ? fmtBRL(total) : "—"}
          </td>
          <td className="px-3 py-[9px]">
            <div className="flex flex-col items-start gap-1">
              <StatusBadge status={status} />
              {/* Só pendente ↔ sem custo, e só sem composição: com insumos o
                  zero do material é só uma parcela; marcar "sem custo" numa
                  linha COM custo apagaria uma cotação real. */}
              {row.custoMat === null && nLinhas === 0 && !(matN > 0) && (
                <button
                  type="button"
                  onClick={() => onPersist(row.baseId, { custoMat: 0, custoMO: 0 })}
                  title="Material sem custo (ex.: padrão “Não entregue”): deixa de ficar pendente e some do portal do terceiro."
                  className="whitespace-nowrap text-[11px] font-semibold text-primary-7 hover:underline"
                >
                  Marcar sem custo
                </button>
              )}
              {semCusto && (
                <button
                  type="button"
                  onClick={() => onPersist(row.baseId, { custoMat: null })}
                  className="whitespace-nowrap text-[11px] font-semibold text-neutral-gray-7 hover:underline"
                >
                  Desfazer
                </button>
              )}
            </div>
          </td>
        </tr>
        {isOpen && (
          <tr className="border-b border-neutral-gray-4">
            <td colSpan={COLS} className="p-0">
              <CompositionPanel
                projectId={projectId}
                row={row}
                costItems={costItems}
                onAddItems={() => setGridFor(row)}
                onApply={() => setApplyFrom(row)}
              />
            </td>
          </tr>
        )}
      </React.Fragment>
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
        <Input
          small
          value={search}
          onValueChange={setSearch}
          aria-label="Buscar custo base"
          placeholder="Buscar por código, especificação ou fabricante..."
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
              { value: "pendente", label: `Pendente (${pendentesTotal})` },
              { value: "preenchido", label: `Com custo (${countBy("preenchido")})` },
              { value: "sem_custo", label: `Sem custo (${countBy("sem_custo")})` },
            ]}
            value={statusFilter}
            onChange={(v) =>
              setStatusFilter(
                v === "pendente" || v === "preenchido" || v === "sem_custo" ? v : ""
              )
            }
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
          Custo de material, mão de obra e composição deste empreendimento — vale para todas as
          tipologias
        </span>
        <span className="ml-auto whitespace-nowrap text-[11px] text-neutral-gray-7">
          {hasFilters ? `${filtered.length} de ${rows.length}` : filtered.length}{" "}
          {filtered.length === 1 ? "material" : "materiais"}
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
                <TH right teal>
                  Custo mat.
                </TH>
                <TH right teal>
                  Custo MO
                </TH>
                <TH>Composição</TH>
                <TH right>Total base</TH>
                <TH>Status</TH>
              </tr>
            </thead>

            {grouped ? (
              groups.map(([cat, groupRows]) => {
                const isCollapsed = collapsed.has(cat);
                const sub = groupRows.reduce((s, r) => s + custoBaseTotal(r), 0);
                const subPend = groupRows.filter(custoBasePendente).length;
                return (
                  <tbody key={cat || "__sem__"}>
                    <tr className="border-b border-neutral-gray-4 bg-neutral-gray-2">
                      <td colSpan={COLS} className="p-0">
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
                              · {subPend} {subPend === 1 ? "pendente" : "pendentes"}
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
                  colSpan={COLS - 2}
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

      {/* Grade "Adicionar itens" no contexto de um material. Montada só quando
          aberta: cada abertura nasce limpa. */}
      {gridFor && (
        <CostItemsGridModal
          open
          onClose={() => setGridFor(null)}
          costItems={costItems}
          saving={composicao.isPending}
          material={{
            baseId: gridFor.baseId,
            nome: gridFor.nome,
            excludeItemIds: gridFor.composicao.map((l) => l.itemId),
          }}
          onSubmit={(lines) =>
            composicao
              .mutateAsync({ baseId: gridFor.baseId, body: { op: "addLines", lines } })
              .then(() => setGridFor(null))
              // O toast global já avisou; o modal fica aberto para corrigir.
              .catch(() => undefined)
          }
        />
      )}

      {applyFrom && (
        <ApplyCompositionModal
          open
          onClose={() => setApplyFrom(null)}
          source={applyFrom}
          candidates={applyCandidates}
          saving={composicao.isPending}
          onApply={(i) =>
            composicao
              .mutateAsync({
                baseId: applyFrom.baseId,
                body: {
                  op: "applyTo",
                  targetBaseIds: i.targetBaseIds,
                  mode: i.mode,
                  lines: i.lines,
                  copiarCustoQtd: i.copiarCustoQtd,
                },
              })
              .then(() => setApplyFrom(null))
              .catch(() => undefined)
          }
        />
      )}
    </div>
  );
}
