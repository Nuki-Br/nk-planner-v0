"use client";

import React from "react";
import { useRouter } from "next/navigation";

import { Button, Icon, LoadingState, Modal, PageHeader, Textarea } from "@/components/ui";
import { upgradeKey } from "@/lib/budget";
import { getKit, getMaterial, isKitId } from "@/lib/data/entities";
import { SEED_ACTIVE_PROJECT_ID } from "@/lib/data/seed";
import { useBudgetColumns, useUpdateBudgetColumns } from "@/lib/hooks/useBudgetColumns";
import { useCommentThreads } from "@/lib/hooks/useComments";
import { useKits } from "@/lib/hooks/useKits";
import { useMateriais } from "@/lib/hooks/useMateriais";
import { usePendingItems } from "@/lib/hooks/usePendingItems";
import { useProject } from "@/lib/hooks/useProjects";
import { useTipologias } from "@/lib/hooks/useTipologias";
import { useCreateVersion, useRestoreVersion, useVersions } from "@/lib/hooks/useVersions";
import { useSelection } from "@/lib/store/selection";
import { cn, fmtBRL, fmtNum } from "@/lib/utils";
import { CommentThreadPanel, type ThreadRow } from "@/features/construtor-shared/CommentThreadPanel";
import { LinkFillModal } from "@/features/construtor-shared/LinkFillModal";
import type { BudgetColumn, BudgetVersion, ColumnKind } from "@/shared/types/domain";

import {
  ambTotal,
  buildScopeRefs,
  calcAnyRow,
  isBasePending,
  type BaseCosts,
  type BudgetDeps,
  type CellOverrides,
} from "../calc";
import { AddColumnTh, ColHeaderCell } from "./ColHeaderCell";
import { CostBaseView } from "./CostBaseView";
import { FormulaCellEditor } from "./FormulaCellEditor";
import { HistoryGlyph, SaveGlyph, VersionDrawer, VersionToast } from "./Versioning";

type PendingFillMode = "inline" | "expandRow";

interface EditingCell {
  rowKey: string;
  colId: string;
}

function Th({
  children,
  right = false,
  teal = false,
  sticky = false,
  minW,
}: {
  children?: React.ReactNode;
  right?: boolean;
  teal?: boolean;
  sticky?: boolean;
  minW?: number;
}) {
  return (
    <th
      style={{ minWidth: minW }}
      className={cn(
        "whitespace-nowrap border-b-2 border-neutral-gray-4 px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider",
        right ? "text-right" : "text-left",
        teal ? "bg-primary-1 text-primary-7" : "bg-neutral-gray-2 text-neutral-gray-7",
        sticky && "sticky left-0 z-[2]"
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  right = false,
  className,
  sticky = false,
}: {
  children?: React.ReactNode;
  right?: boolean;
  className?: string;
  sticky?: boolean;
}) {
  return (
    <td
      className={cn(
        "border-b border-neutral-gray-4 px-2.5 py-[7px] align-middle text-xs text-neutral-gray-11",
        right ? "text-right" : "text-left",
        sticky && "sticky left-0 z-[1] border-r border-r-neutral-gray-4",
        className
      )}
    >
      {children}
    </td>
  );
}

function FillInput({
  value,
  onChange,
  onEnter,
  onEscape,
  autoFocus = false,
  big = false,
}: {
  value: string;
  onChange: (v: string) => void;
  onEnter: () => void;
  onEscape: () => void;
  autoFocus?: boolean;
  big?: boolean;
}) {
  return (
    <div className="relative inline-block">
      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-neutral-gray-6">
        R$
      </span>
      <input
        autoFocus={autoFocus}
        type="number"
        step="0.01"
        value={value}
        placeholder="0,00"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onEnter();
          if (e.key === "Escape") onEscape();
        }}
        className={cn(
          "rounded-md border-2 border-primary-7 bg-primary-1 text-right font-bold text-primary-8 outline-none",
          big ? "h-[38px] w-[140px] pl-[26px] pr-2 text-[13px]" : "h-[30px] w-[84px] pl-[22px] pr-1.5 text-[11.5px]"
        )}
      />
    </div>
  );
}

// Tela 10 — Construtor de Preço (protótipo: BudgetTableScreen). Colunas e
// versões persistem no store; overrides/custos base são estado de sessão
// (snapshot real por versão fica adiado — §12).
export function BudgetScreen({ pendingFill = "inline" }: { pendingFill?: PendingFillMode }) {
  const router = useRouter();
  const activeProjectId = useSelection((s) => s.activeProjectId);
  const projectId = activeProjectId ?? SEED_ACTIVE_PROJECT_ID;
  const { data: project } = useProject(projectId);
  const { data: tipologias = [], isLoading: tipsLoading } = useTipologias();
  const { data: materiais = [] } = useMateriais();
  const { data: kits = [] } = useKits();
  const { data: pendingSet = new Set<string>() } = usePendingItems();
  const { data: cols = [] } = useBudgetColumns(projectId);
  const { data: versions = [] } = useVersions();
  const { data: commentThreads = {} } = useCommentThreads();
  const updateCols = useUpdateBudgetColumns();
  const createVersion = useCreateVersion();
  const restoreVersion = useRestoreVersion();

  const [activeTipId, setActiveTipId] = React.useState<string | null>(null);
  const [view, setView] = React.useState<"preco" | "custos">("preco");
  const [baseCosts, setBaseCosts] = React.useState<BaseCosts>({});
  const [fillOpen, setFillOpen] = React.useState<Set<string>>(new Set());
  const [fillDraft, setFillDraft] = React.useState<BaseCosts>({});
  const [openThread, setOpenThread] = React.useState<ThreadRow | null>(null);
  const [overrides, setOverrides] = React.useState<CellOverrides>({});
  const [editingCell, setEditingCell] = React.useState<EditingCell | null>(null);
  const [showAdd, setShowAdd] = React.useState(false);
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [dragTarget, setDragTarget] = React.useState<string | null>(null);
  const [collapsedKits, setCollapsedKits] = React.useState<Set<string>>(new Set());
  const [showDrawer, setShowDrawer] = React.useState(false);
  const [showLinkModal, setShowLinkModal] = React.useState(false);
  const [showSaveModal, setShowSaveModal] = React.useState(false);
  const [saveSummary, setSaveSummary] = React.useState("");
  const [restoreTarget, setRestoreTarget] = React.useState<BudgetVersion | null>(null);
  const [toastMsg, setToastMsg] = React.useState("");
  const toastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const fireToast = (m: string) => {
    setToastMsg(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(""), 3200);
  };
  React.useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  const tip = tipologias.find((t) => t.id === activeTipId) ?? tipologias[0] ?? null;
  const currentVersion = versions.find((v) => v.isCurrent) ?? versions[0] ?? null;

  const deps = React.useMemo<BudgetDeps>(
    () => ({ materiais, kits, cols, overrides, baseCosts, pendingSet }),
    [materiais, kits, cols, overrides, baseCosts, pendingSet]
  );

  if (tipsLoading) return <LoadingState label="Carregando orçamento…" />;
  if (!tip) return null;
  const colCount = 7 + cols.length;

  // ── colunas (persistem no store) ──
  const persistCols = (next: BudgetColumn[]) => updateCols.mutate({ projectId, cols: next });
  const addColumn = ({ nome, kind }: { nome: string; kind: ColumnKind }) => {
    persistCols([...cols, { id: "col_" + Date.now(), nome, kind, expr: "", visivel: false }]);
    setShowAdd(false);
  };
  const renameColumn = (id: string, nome: string) =>
    persistCols(cols.map((c) => (c.id === id ? { ...c, nome } : c)));
  const deleteColumn = (id: string) => {
    persistCols(cols.filter((c) => c.id !== id));
    setOverrides((prev) => {
      const next: CellOverrides = {};
      for (const rk of Object.keys(prev)) {
        const row = { ...prev[rk] };
        delete row[id];
        next[rk] = row;
      }
      return next;
    });
    if (editingCell?.colId === id) setEditingCell(null);
  };
  const reorder = (fromId: string | null, toId: string) => {
    if (!fromId || fromId === toId) return;
    const arr = [...cols];
    const fi = arr.findIndex((c) => c.id === fromId);
    const ti = arr.findIndex((c) => c.id === toId);
    if (fi < 0 || ti < 0) return;
    const [moved] = arr.splice(fi, 1);
    if (!moved) return;
    arr.splice(ti, 0, moved);
    persistCols(arr);
  };

  // ── overrides por célula ──
  const setOverride = (rowKey: string, colId: string, expr: string) =>
    setOverrides((prev) => ({ ...prev, [rowKey]: { ...prev[rowKey], [colId]: expr } }));
  const clearOverride = (rowKey: string, colId: string) =>
    setOverrides((prev) => {
      const next = { ...prev };
      const row = { ...next[rowKey] };
      delete row[colId];
      next[rowKey] = row;
      return next;
    });

  // ── preenchimento de custo pendente ──
  const openFill = (rowKey: string, uid: string) => {
    const m = getMaterial(materiais, uid);
    setFillDraft((p) => ({
      ...p,
      [uid]:
        p[uid] ??
        {
          mat: m && m.custoMat > 0 ? String(m.custoMat) : "",
          mo: m && m.custoMO > 0 ? String(m.custoMO) : "",
        },
    }));
    setFillOpen((prev) => new Set(prev).add(rowKey));
  };
  const closeFill = (rowKey: string) =>
    setFillOpen((prev) => {
      const next = new Set(prev);
      next.delete(rowKey);
      return next;
    });
  const setDraftField = (uid: string, fld: "mat" | "mo", val: string) =>
    setFillDraft((p) => ({ ...p, [uid]: { ...(p[uid] ?? { mat: "", mo: "" }), [fld]: val } }));
  const commitFill = (rowKey: string, uid: string) => {
    const d = fillDraft[uid] ?? { mat: "", mo: "" };
    setBaseCosts((p) => ({ ...p, [uid]: { mat: d.mat, mo: d.mo } }));
    closeFill(rowKey);
  };

  const toggleKit = (key: string) =>
    setCollapsedKits((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // ── versões ──
  const handleSaveVersion = () => {
    const summary = saveSummary.trim();
    if (!summary) return;
    createVersion.mutate(
      {
        summary,
        createdBy: "Ana Carvalho",
        changes: { materiais: [], custos: [], taxas: [], tipologias: [] },
      },
      {
        onSuccess: (v) => {
          setShowSaveModal(false);
          setSaveSummary("");
          fireToast(`Versão ${v.label} salva`);
        },
      }
    );
  };
  const handleRestoreConfirm = () => {
    if (!restoreTarget) return;
    restoreVersion.mutate(restoreTarget.id, {
      onSuccess: (v) => {
        setRestoreTarget(null);
        setShowDrawer(false);
        fireToast(`${v.label} restaurada com sucesso`);
      },
    });
  };

  // ── contagem de pendentes da tipologia ativa (aviso do rodapé) ──
  let excludedCount = 0;
  for (const amb of tip.ambientes) {
    for (const comp of amb.componentes) {
      for (const uid of comp.upgrades) {
        const rowKey = upgradeKey(comp.id, uid);
        if (isKitId(uid)) {
          const r = calcAnyRow(deps, comp, uid, rowKey);
          if (r?.kind === "kit" && r.result.anyPending) excludedCount++;
        } else if (isBasePending(pendingSet, baseCosts, rowKey, uid)) {
          excludedCount++;
        }
      }
    }
  }

  // célula de coluna configurável (compartilhada entre linha de material e de kit)
  const renderConfigCell = (
    col: BudgetColumn,
    colIdx: number,
    r: ReturnType<typeof calcAnyRow>,
    rowKey: string,
    rowBgClass: string
  ) => {
    if (!r) {
      return (
        <Td key={col.id} right className={cn(rowBgClass, "text-neutral-gray-5")}>
          —
        </Td>
      );
    }
    const result = r.result;
    const cr = result.colResults[col.id];
    const special = col.kind === "rowTotal" || col.kind === "rowAvg";
    const isEditing = editingCell?.rowKey === rowKey && editingCell.colId === col.id;
    const ovr = cr?.overridden ?? false;

    if (isEditing) {
      const { scope, refs } = buildScopeRefs(cols, result, colIdx);
      const current = overrides[rowKey]?.[col.id] ?? col.expr;
      return (
        <Td key={col.id} right className="relative bg-primary-1 !px-[7px] !py-[5px]">
          <FormulaCellEditor
            initial={current}
            scope={scope}
            refs={refs}
            canReset={ovr}
            onSave={(v) => {
              setOverride(rowKey, col.id, v);
              setEditingCell(null);
            }}
            onReset={() => {
              clearOverride(rowKey, col.id);
              setEditingCell(null);
            }}
            onCancel={() => setEditingCell(null)}
          />
        </Td>
      );
    }

    return (
      <Td
        key={col.id}
        right
        className={ovr ? "bg-[#f0faf9]" : special ? "bg-[#f7fdfc]" : rowBgClass}
      >
        <div
          role={special ? undefined : "button"}
          tabIndex={special ? undefined : 0}
          onClick={() => {
            if (!special) setEditingCell({ rowKey, colId: col.id });
          }}
          onKeyDown={
            special
              ? undefined
              : (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setEditingCell({ rowKey, colId: col.id });
                  }
                }
          }
          title={
            special
              ? col.kind === "rowAvg"
                ? "Média das colunas livres (calculado)"
                : "Soma das colunas livres (calculado)"
              : "Clique para editar valor ou fórmula"
          }
          className={cn(
            "flex items-center justify-end gap-1 rounded px-1 py-0.5",
            special ? "cursor-default" : "cursor-pointer"
          )}
        >
          {cr?.error ? (
            <span title={cr.error} className="cursor-help font-bold text-functional-error">
              #ERR
            </span>
          ) : (
            <>
              <span
                className={cn(
                  ovr
                    ? "font-bold text-primary-7"
                    : special
                      ? "font-bold text-primary-8"
                      : "text-neutral-gray-8"
                )}
              >
                {cr ? fmtBRL(cr.value) : "—"}
              </span>
              {ovr && <span className="inline-block h-[5px] w-[5px] shrink-0 rounded-full bg-primary-7" />}
            </>
          )}
        </div>
      </Td>
    );
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        breadcrumb={[
          { label: "Empreendimentos", href: "/dashboard" },
          { label: project?.nome ?? "Projeto" },
          { label: "Construtor de Preço" },
        ]}
        title="Construtor de Preço"
        subtitle="Custos base e preço final no mesmo lugar · preencha custos pendentes na linha ou alterne para a visão de custos base · cálculo em tempo real"
        action={
          <>
            <Button variant="bordered" icon="share" onPress={() => setShowLinkModal(true)}>
              Gerar link de preenchimento
            </Button>
            <Button variant="bordered" onPress={() => setShowDrawer(true)}>
              <HistoryGlyph />
              Versões ({currentVersion?.label ?? "—"})
            </Button>
            <Button variant="bordered" onPress={() => setShowSaveModal(true)}>
              <SaveGlyph />
              Salvar versão
            </Button>
            <Button icon="upload" onPress={() => router.push("/publicacao")}>
              Publicar orçamento →
            </Button>
          </>
        }
      />

      {/* Toggle Preço final ⇄ Custos base */}
      <div className="mb-3.5 flex items-center gap-3.5">
        <div className="inline-flex gap-[3px] rounded-lg border border-neutral-gray-4 bg-neutral-gray-2 p-[3px]">
          {(
            [
              { id: "preco", label: "Preço final", icon: "calculator" },
              { id: "custos", label: "Custos base", icon: "clipboard" },
            ] as const
          ).map((v) => {
            const sel = view === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setView(v.id);
                  setEditingCell(null);
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3.5 py-[7px] text-[12.5px] transition-all",
                  sel
                    ? "bg-white font-bold text-primary-7 shadow-sm"
                    : "font-medium text-neutral-gray-7"
                )}
              >
                <Icon name={v.icon} size={14} />
                {v.label}
              </button>
            );
          })}
        </div>
        <span className="text-xs text-neutral-gray-6">
          {view === "preco"
            ? "Colunas e fórmulas sobre os custos base"
            : "Edite custo de material e mão de obra de cada item"}
        </span>
      </div>

      {/* Barra de ajuda de fórmula */}
      {view === "preco" && (
        <div className="mb-3.5 flex flex-wrap items-center gap-3 rounded-lg border border-neutral-gray-4 bg-neutral-gray-2 px-3.5 py-[9px]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-gray-7">
            Como preencher
          </span>
          <span className="text-xs text-neutral-gray-8">
            Digite um número (<code className="font-mono text-primary-8">150</code>) para valor
            fixo, ou comece com <code className="mx-1 font-mono text-primary-8">=</code> para
            fórmula — ex. <code className="mx-1 font-mono text-primary-8">=custo_troca * 10%</code>{" "}
            ou <code className="ml-1 font-mono text-primary-8">=valor_unitario * 0,25</code>.
          </span>
        </div>
      )}

      {/* Abas de tipologia */}
      <div className="flex border-b-2 border-neutral-gray-4">
        {tipologias.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setActiveTipId(t.id);
              setEditingCell(null);
            }}
            className={cn(
              "-mb-0.5 flex items-center gap-1.5 border-b-2 px-5 py-[9px] text-[13px]",
              t.id === tip.id
                ? "border-primary-7 font-bold text-primary-7"
                : "border-transparent text-neutral-gray-8"
            )}
          >
            {t.nome}
            {t.status === "incompleta" && (
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-functional-warning" />
            )}
          </button>
        ))}
      </div>

      {view === "custos" && (
        <CostBaseView
          tip={tip}
          materiais={materiais}
          baseCosts={baseCosts}
          setBaseCosts={setBaseCosts}
          pendingSet={pendingSet}
          comments={commentThreads}
          onOpenThread={setOpenThread}
        />
      )}

      {view === "preco" && (
        <div className="mb-6 overflow-x-auto rounded-b-lg border border-t-0 border-neutral-gray-4 bg-white">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <Th sticky minW={216}>Especificação</Th>
                <Th right>Qtd c/ RT</Th>
                <Th right>Valor un.</Th>
                <Th right>Déb./Créd.</Th>
                <Th right>Custo troca</Th>
                {cols.map((col) => (
                  <ColHeaderCell
                    key={col.id}
                    col={col}
                    onRename={renameColumn}
                    onDelete={deleteColumn}
                    onDragStart={setDragId}
                    onDragEnter={setDragTarget}
                    onDrop={(id) => {
                      reorder(dragId, id);
                      setDragId(null);
                      setDragTarget(null);
                    }}
                    isDragTarget={dragTarget === col.id && dragId !== null && dragId !== col.id}
                  />
                ))}
                <AddColumnTh showAdd={showAdd} setShowAdd={(fn) => setShowAdd(fn)} onAdd={addColumn} />
                <Th right teal>Total final</Th>
              </tr>
            </thead>
            <tbody>
              {tip.ambientes.map((amb) => {
                const total = ambTotal(deps, amb);
                return (
                  <React.Fragment key={amb.id}>
                    <tr>
                      <td
                        colSpan={colCount}
                        className="bg-neutral-gray-11 px-3.5 py-[7px] text-[11px] font-bold uppercase tracking-[0.08em] text-white"
                      >
                        {amb.nome}
                      </td>
                    </tr>

                    <tr>
                      <td
                        colSpan={colCount}
                        className="bg-functional-success-light px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-functional-success"
                      >
                        Acabamentos padrão — crédito incluído no preço
                      </td>
                    </tr>
                    {amb.componentes.map((comp) => {
                      const padMat =
                        comp.padrao !== null ? getMaterial(materiais, comp.padrao) : undefined;
                      if (!padMat) return null;
                      const qtdComRT = comp.qtd * (1 + comp.rt / 100);
                      const valUnit = padMat.custoMat + padMat.custoMO;
                      const bg = "bg-[#f4fffe]";
                      return (
                        <tr key={`pad-${comp.id}`}>
                          <Td sticky className={bg}>
                            <div className="text-xs font-semibold text-neutral-gray-9">
                              {padMat.nome}
                            </div>
                            <div className="mt-px text-[11px] text-neutral-gray-6">
                              {comp.nome} · {padMat.fabricante}
                            </div>
                          </Td>
                          <Td right className={cn(bg, "text-neutral-gray-7")}>
                            {fmtNum(qtdComRT, 2)} {padMat.unidade}
                          </Td>
                          <Td right className={cn(bg, "text-neutral-gray-7")}>
                            {fmtBRL(valUnit)}
                          </Td>
                          <Td right className={bg}>
                            <span className="font-semibold text-functional-success">
                              Créd. {fmtBRL(valUnit * qtdComRT)}
                            </span>
                          </Td>
                          <Td right className={cn(bg, "text-neutral-gray-5")}>—</Td>
                          {cols.map((col) => (
                            <Td key={col.id} right className={cn(bg, "text-neutral-gray-5")}>
                              —
                            </Td>
                          ))}
                          <Td className={bg} />
                          <Td right className={cn(bg, "text-neutral-gray-5")}>—</Td>
                          <Td right className={cn(bg, "text-neutral-gray-5")}>—</Td>
                        </tr>
                      );
                    })}

                    <tr>
                      <td
                        colSpan={colCount}
                        className="bg-[#fff7ed] px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[#c2410c]"
                      >
                        Acabamentos personalizados — débito cobrado do cliente
                      </td>
                    </tr>
                    {amb.componentes.map((comp) =>
                      comp.upgrades.map((uid) => {
                        const rowKey = upgradeKey(comp.id, uid);

                        // ── KIT: linha principal + sub-itens ──
                        if (isKitId(uid)) {
                          const kit = getKit(kits, uid);
                          if (!kit) return null;
                          const rr = calcAnyRow(deps, comp, uid, rowKey);
                          const r = rr?.kind === "kit" ? rr.result : null;
                          const pending = r ? r.anyPending : true;
                          const expanded = !collapsedKits.has(rowKey);
                          const kitBg = pending ? "bg-functional-warning-light" : "bg-[#fbf6ff]";
                          return (
                            <React.Fragment key={rowKey}>
                              <tr>
                                <Td sticky className={kitBg}>
                                  <div className="flex items-start gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => toggleKit(rowKey)}
                                      title={expanded ? "Recolher kit" : "Expandir kit"}
                                      className="flex pt-px text-neutral-gray-7"
                                    >
                                      <Icon name={expanded ? "chevD" : "chevR"} size={15} />
                                    </button>
                                    <div className="flex-1">
                                      <div className="flex flex-wrap items-center gap-[7px]">
                                        <span
                                          className={cn(
                                            "text-xs font-bold",
                                            pending ? "text-tint-amber-fg" : "text-neutral-gray-11"
                                          )}
                                        >
                                          {kit.nome}
                                        </span>
                                        <span className="inline-flex items-center gap-[3px] rounded-full bg-primary-8 px-[7px] py-px text-[10px] font-bold text-white">
                                          ⬡ Kit
                                        </span>
                                      </div>
                                      <div
                                        className={cn(
                                          "mt-px text-[11px]",
                                          pending ? "text-[#b45309]" : "text-neutral-gray-6"
                                        )}
                                      >
                                        {comp.nome} · {kit.itens.length} itens
                                        {pending && (
                                          <span className="ml-1.5 font-bold text-tint-orange-fg">
                                            · Sub-item aguardando custo
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {pending && (
                                      <Icon name="warning" size={13} className="text-tint-orange-fg" />
                                    )}
                                  </div>
                                </Td>
                                <Td right className={cn(kitBg, "text-neutral-gray-7")}>
                                  {kit.itens.length} itens
                                </Td>
                                <Td right className={cn(kitBg, "text-neutral-gray-7")}>
                                  {r && !pending ? fmtBRL(r.kitMaterialTotal) : "—"}
                                </Td>
                                <Td right className={kitBg}>
                                  {r && !pending ? (
                                    <span
                                      className={cn(
                                        "font-semibold",
                                        r.custoDeTroca >= 0
                                          ? "text-[#c2410c]"
                                          : "text-functional-success"
                                      )}
                                    >
                                      {r.custoDeTroca >= 0 ? "Déb. " : "Créd. "}
                                      {fmtBRL(Math.abs(r.custoDeTroca))}
                                    </span>
                                  ) : (
                                    "—"
                                  )}
                                </Td>
                                <Td right className={cn(kitBg, "text-neutral-gray-8")}>
                                  {r && !pending ? fmtBRL(r.custoDeTroca) : "—"}
                                </Td>
                                {cols.map((col, colIdx) =>
                                  renderConfigCell(col, colIdx, pending ? null : rr, rowKey, kitBg)
                                )}
                                <Td className={kitBg} />
                                <Td right className={r && !pending ? "bg-primary-1" : kitBg}>
                                  {r && !pending ? (
                                    <span className="text-[13px] font-extrabold text-primary-7">
                                      {fmtBRL(r.total)}
                                    </span>
                                  ) : (
                                    "—"
                                  )}
                                </Td>
                              </tr>
                              {expanded &&
                                r?.subItems.map((s, si) => (
                                  <tr key={`${rowKey}-${s.mat.id}`}>
                                    <Td sticky className="bg-white !pl-0">
                                      <div className="flex items-stretch">
                                        <span className="relative w-[26px] shrink-0">
                                          <span
                                            className="absolute left-[17px] w-px bg-neutral-gray-5"
                                            style={{
                                              top: -2,
                                              bottom: si === r.subItems.length - 1 ? "50%" : -2,
                                            }}
                                          />
                                          <span className="absolute left-[17px] top-1/2 h-px w-[7px] bg-neutral-gray-5" />
                                        </span>
                                        <div className="pt-px">
                                          <div
                                            className={cn(
                                              "text-xs",
                                              s.pending ? "text-tint-amber-fg" : "text-neutral-gray-9"
                                            )}
                                          >
                                            <span className="mr-1 text-neutral-gray-5">·</span>
                                            {s.mat.nome}
                                          </div>
                                          <code className="text-[10px] text-neutral-gray-6">
                                            {s.mat.codigo}
                                            {s.pending && (
                                              <span className="ml-1.5 font-bold text-tint-orange-fg">
                                                aguardando
                                              </span>
                                            )}
                                          </code>
                                        </div>
                                      </div>
                                    </Td>
                                    <Td right className="bg-white text-neutral-gray-7">
                                      {fmtNum(s.subQtd, 2)} {s.mat.unidade}
                                    </Td>
                                    <Td right className="bg-white text-neutral-gray-7">
                                      {fmtBRL(s.valUn)}
                                    </Td>
                                    <Td right className="bg-white">
                                      <span className="font-semibold text-[#c2410c]">
                                        Déb. {fmtBRL(s.line)}
                                      </span>
                                    </Td>
                                    <Td right className="bg-white text-neutral-gray-5">—</Td>
                                    {cols.map((col) => (
                                      <Td key={col.id} right className="bg-white text-neutral-gray-5">
                                        —
                                      </Td>
                                    ))}
                                    <Td className="bg-white" />
                                    <Td right className="bg-white text-neutral-gray-5">—</Td>
                                    <Td right className="bg-white text-neutral-gray-5">—</Td>
                                  </tr>
                                ))}
                            </React.Fragment>
                          );
                        }

                        // ── MATERIAL: linha + preenchimento de custo base ──
                        const upgMat = getMaterial(materiais, uid);
                        if (!upgMat) return null;
                        const pending = isBasePending(pendingSet, baseCosts, rowKey, uid);
                        const rr = pending ? null : calcAnyRow(deps, comp, uid, rowKey);
                        const r = rr?.kind === "material" ? rr.result : null;
                        const rowBg = pending ? "bg-functional-warning-light" : "bg-white";
                        const cmts = commentThreads[rowKey] ?? [];
                        const filling = fillOpen.has(rowKey);
                        const inlineFill = pending && filling && pendingFill === "inline";
                        const draft = fillDraft[uid] ?? { mat: "", mo: "" };
                        const fillCell = inlineFill ? "bg-primary-1" : rowBg;

                        return (
                          <React.Fragment key={rowKey}>
                            <tr>
                              <Td sticky className={rowBg}>
                                <div className="flex items-start gap-1.5">
                                  <div className="flex-1">
                                    <div
                                      className={cn(
                                        "text-xs font-semibold",
                                        pending ? "text-tint-amber-fg" : "text-neutral-gray-11"
                                      )}
                                    >
                                      {upgMat.nome}
                                    </div>
                                    <div
                                      className={cn(
                                        "mt-px text-[11px]",
                                        pending ? "text-[#b45309]" : "text-neutral-gray-6"
                                      )}
                                    >
                                      {comp.nome} · {upgMat.fabricante}
                                      {pending && (
                                        <span className="ml-1.5 font-bold text-tint-orange-fg">
                                          · Aguardando custo
                                        </span>
                                      )}
                                    </div>
                                    {pending && !inlineFill && !(filling && pendingFill === "expandRow") && (
                                      <button
                                        type="button"
                                        onClick={() => openFill(rowKey, uid)}
                                        className="mt-1.5 inline-flex items-center gap-[5px] rounded-full border border-primary-7 bg-white px-2.5 py-1 text-[11px] font-bold text-primary-7"
                                      >
                                        <Icon name="plus" size={12} /> Preencher custo base
                                      </button>
                                    )}
                                  </div>
                                  {pending && (
                                    <Icon name="warning" size={13} className="text-tint-orange-fg" />
                                  )}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOpenThread({
                                        key: rowKey,
                                        especificacao: upgMat.nome,
                                        ambiente: amb.nome,
                                        componente: comp.nome,
                                      })
                                    }
                                    title="Comentários"
                                    className={cn(
                                      "inline-flex shrink-0 items-center gap-[3px] rounded px-[5px] py-[3px]",
                                      cmts.length > 0 && "bg-functional-warning-light"
                                    )}
                                  >
                                    <Icon
                                      name="chat"
                                      size={14}
                                      className={
                                        cmts.length > 0
                                          ? "text-functional-warning"
                                          : "text-neutral-gray-5"
                                      }
                                    />
                                    {cmts.length > 0 && (
                                      <span className="text-[10px] font-bold text-functional-warning">
                                        {cmts.length}
                                      </span>
                                    )}
                                  </button>
                                </div>
                              </Td>
                              <Td right className={cn(fillCell, "text-neutral-gray-7")}>
                                {inlineFill ? (
                                  <span className="text-[9.5px] font-bold uppercase tracking-wide text-primary-7">
                                    Custo base →
                                  </span>
                                ) : r ? (
                                  `${fmtNum(r.qtdComRT, 2)} ${upgMat.unidade}`
                                ) : (
                                  "—"
                                )}
                              </Td>
                              <Td right className={cn(fillCell, "text-neutral-gray-7")}>
                                {inlineFill ? (
                                  <div className="flex flex-col items-end gap-0.5">
                                    <span className="text-[8.5px] font-bold tracking-wide text-primary-7">
                                      CUSTO MAT.
                                    </span>
                                    <FillInput
                                      autoFocus
                                      value={draft.mat}
                                      onChange={(v) => setDraftField(uid, "mat", v)}
                                      onEnter={() => commitFill(rowKey, uid)}
                                      onEscape={() => closeFill(rowKey)}
                                    />
                                  </div>
                                ) : r ? (
                                  fmtBRL(r.valUnUpg)
                                ) : (
                                  "—"
                                )}
                              </Td>
                              <Td right className={fillCell}>
                                {inlineFill ? (
                                  <div className="flex flex-col items-end gap-0.5">
                                    <span className="text-[8.5px] font-bold tracking-wide text-primary-7">
                                      CUSTO MO
                                    </span>
                                    <FillInput
                                      value={draft.mo}
                                      onChange={(v) => setDraftField(uid, "mo", v)}
                                      onEnter={() => commitFill(rowKey, uid)}
                                      onEscape={() => closeFill(rowKey)}
                                    />
                                  </div>
                                ) : r ? (
                                  <span
                                    className={cn(
                                      "font-semibold",
                                      r.custoDeTroca >= 0 ? "text-[#c2410c]" : "text-functional-success"
                                    )}
                                  >
                                    {r.custoDeTroca >= 0 ? "Déb. " : "Créd. "}
                                    {fmtBRL(Math.abs(r.custoDeTroca))}
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </Td>
                              <Td right className={cn(fillCell, "text-neutral-gray-8")}>
                                {inlineFill ? (
                                  <div className="flex justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => commitFill(rowKey, uid)}
                                      title="Salvar"
                                      className="rounded bg-primary-7 px-[9px] py-1 text-[11px] font-bold text-white"
                                    >
                                      ✓
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => closeFill(rowKey)}
                                      title="Cancelar"
                                      className="rounded border border-neutral-gray-5 px-[7px] py-1 text-[11px] text-neutral-gray-7"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : r ? (
                                  fmtBRL(r.custoDeTroca * r.qtdComRT)
                                ) : (
                                  "—"
                                )}
                              </Td>
                              {cols.map((col, colIdx) =>
                                renderConfigCell(col, colIdx, pending ? null : rr, rowKey, rowBg)
                              )}
                              <Td className={rowBg} />
                              <Td right className={r ? "bg-primary-1" : rowBg}>
                                {r ? (
                                  <span className="text-[13px] font-extrabold text-primary-7">
                                    {fmtBRL(r.total)}
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </Td>
                            </tr>
                            {pending && filling && pendingFill === "expandRow" && (
                              <tr>
                                <td
                                  colSpan={colCount}
                                  className="border-b border-neutral-gray-4 bg-[#fffdf5] p-0"
                                >
                                  <div className="flex items-end gap-[18px] border-l-[3px] border-functional-warning px-[18px] py-3.5">
                                    <div className="shrink-0">
                                      <div className="mb-[3px] text-[10.5px] font-bold uppercase tracking-wider text-tint-amber-fg">
                                        Preencher custo base
                                      </div>
                                      <div className="max-w-[220px] text-xs text-neutral-gray-7">
                                        {upgMat.nome} · {comp.nome}
                                      </div>
                                    </div>
                                    <label className="flex flex-col gap-1">
                                      <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-gray-7">
                                        Custo material (R$)
                                      </span>
                                      <FillInput
                                        autoFocus
                                        big
                                        value={draft.mat}
                                        onChange={(v) => setDraftField(uid, "mat", v)}
                                        onEnter={() => commitFill(rowKey, uid)}
                                        onEscape={() => closeFill(rowKey)}
                                      />
                                    </label>
                                    <label className="flex flex-col gap-1">
                                      <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-gray-7">
                                        Custo mão de obra (R$)
                                      </span>
                                      <FillInput
                                        big
                                        value={draft.mo}
                                        onChange={(v) => setDraftField(uid, "mo", v)}
                                        onEnter={() => commitFill(rowKey, uid)}
                                        onEscape={() => closeFill(rowKey)}
                                      />
                                    </label>
                                    <div className="flex-1" />
                                    <Button variant="bordered" size="sm" onPress={() => closeFill(rowKey)}>
                                      Cancelar
                                    </Button>
                                    <Button size="sm" icon="check" onPress={() => commitFill(rowKey, uid)}>
                                      Salvar custo base
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}

                    <tr>
                      <td
                        colSpan={6 + cols.length}
                        className="border-b border-neutral-gray-4 border-t-2 border-t-neutral-gray-5 bg-neutral-gray-2 px-3.5 py-[9px] text-right text-xs font-bold text-neutral-gray-8"
                      >
                        Total — {amb.nome}
                      </td>
                      <td className="border-b border-neutral-gray-4 border-t-2 border-t-neutral-gray-5 bg-primary-1 px-2.5 py-[9px] text-right">
                        <span className="text-sm font-extrabold text-primary-7">
                          {fmtBRL(total)}
                        </span>
                      </td>
                      <td className="border-b border-neutral-gray-4 border-t-2 border-t-neutral-gray-5 bg-neutral-gray-2" />
                    </tr>
                  </React.Fragment>
                );
              })}

              <tr>
                <td
                  colSpan={6 + cols.length}
                  className="px-3.5 py-3 text-right text-[13px] font-bold text-neutral-gray-11"
                >
                  Total geral — {tip.nome}
                </td>
                <td className="bg-primary-7 px-2.5 py-3 text-right">
                  <span className="text-[15px] font-extrabold text-white">
                    {fmtBRL(tip.ambientes.reduce((acc, a) => acc + ambTotal(deps, a), 0))}
                  </span>
                </td>
                <td className="bg-neutral-gray-3" />
              </tr>
            </tbody>
          </table>

          {excludedCount > 0 && (
            <div className="flex items-center gap-2 border-t border-[#fde68a] bg-functional-warning-light px-4 py-2.5">
              <Icon name="warning" size={14} className="text-tint-orange-fg" />
              <span className="text-xs text-tint-amber-fg">
                <strong>
                  {excludedCount} {excludedCount === 1 ? "item" : "itens"}
                </strong>{" "}
                da {tip.nome.split(" — ")[0]} aguardam preenchimento de custos pela construtora e
                foram excluídos do cálculo.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Drawer de versões */}
      <VersionDrawer
        open={showDrawer}
        versions={versions}
        projetoNome={project?.nome ?? "Projeto"}
        onClose={() => setShowDrawer(false)}
        onRestore={setRestoreTarget}
      />

      {/* Salvar versão */}
      <Modal
        open={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        title="Salvar versão"
        actions={
          <>
            <Button variant="bordered" onPress={() => setShowSaveModal(false)}>
              Cancelar
            </Button>
            <Button
              onPress={handleSaveVersion}
              isDisabled={saveSummary.trim() === ""}
              isLoading={createVersion.isPending}
            >
              Salvar versão
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3.5">
          <p className="text-[13px] text-neutral-gray-7">
            Salva o estado atual do orçamento como ponto de restauração.
          </p>
          <Textarea
            label="Resumo das alterações *"
            value={saveSummary}
            onValueChange={setSaveSummary}
            placeholder="Ex: revisão de custos após retorno da construtora, novas opções de piso adicionadas…"
          />
        </div>
      </Modal>

      {/* Confirmar restauração */}
      <Modal
        open={restoreTarget !== null}
        onClose={() => setRestoreTarget(null)}
        title={restoreTarget ? `Restaurar ${restoreTarget.label}?` : ""}
        actions={
          <>
            <Button variant="bordered" onPress={() => setRestoreTarget(null)}>
              Cancelar
            </Button>
            <Button onPress={handleRestoreConfirm} isLoading={restoreVersion.isPending}>
              Confirmar restauração
            </Button>
          </>
        }
      >
        {restoreTarget && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-neutral-gray-8">
              Você está prestes a restaurar o orçamento para o estado da{" "}
              <strong>{restoreTarget.label}</strong> (
              {restoreTarget.createdAt.split(" às ")[0]} · {restoreTarget.createdBy}).
            </p>
            <p className="text-[13px] text-neutral-gray-7">
              A versão atual (<strong>{currentVersion?.label}</strong>) será preservada no
              histórico.
            </p>
          </div>
        )}
      </Modal>

      {/* Thread de comentários */}
      {openThread && (
        <>
          <div onClick={() => setOpenThread(null)} className="fixed inset-0 z-[880]" />
          <div className="fixed right-0 top-16 z-[881] h-[calc(100vh-64px)] w-[380px] max-w-[90vw] overflow-y-auto border-l border-neutral-gray-4 bg-neutral-gray-2 p-4 shadow-[-8px_0_28px_rgba(0,0,0,0.12)]">
            <CommentThreadPanel row={openThread} onClose={() => setOpenThread(null)} />
          </div>
        </>
      )}

      <LinkFillModal open={showLinkModal} onClose={() => setShowLinkModal(false)} />

      <VersionToast msg={toastMsg} />
    </div>
  );
}
