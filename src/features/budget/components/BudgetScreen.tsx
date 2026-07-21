"use client";

import React from "react";
import { useRouter } from "next/navigation";

import { AlertModal, Button, EmptyState, Icon, Modal, PageHeader, Textarea } from "@/components/ui";
import { columnsAffectedByExtendedConvention, rowKey } from "@/lib/budget";
import { getKit, getMaterial } from "@/lib/data/entities";
import { useBudgetColumns, useUpdateBudgetColumns } from "@/lib/hooks/useBudgetColumns";
import { useCommentThreads } from "@/lib/hooks/useComments";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useKits } from "@/lib/hooks/useKits";
import { useMateriais, useUpdateMaterial } from "@/lib/hooks/useMateriais";
import { useProject } from "@/lib/hooks/useProjects";
import { useTipologias } from "@/lib/hooks/useTipologias";
import {
  useAddCostComponent,
  useRemoveCostComponent,
  useSetCostQtds,
  useUpdateCostComponent,
} from "@/lib/hooks/useTipologiaMutations";
import { useCreateVersion, useRestoreVersion, useVersions } from "@/lib/hooks/useVersions";
import { cn, fmtBRL, fmtNum } from "@/lib/utils";
import { useRequireActiveProject } from "@/lib/hooks/useRequireActiveProject";
import { CommentThreadPanel, type ThreadRow } from "@/features/construtor-shared/CommentThreadPanel";
import { LinkFillModal } from "@/features/construtor-shared/LinkFillModal";
import type {
  Ambiente,
  BudgetColumn,
  BudgetVersion,
  Componente,
  CostComponent,
  CostComponentSide,
} from "@/shared/types/domain";

import {
  ambTotal,
  buildScopeRefs,
  calcAnyRow,
  emptyScopeRefs,
  isOptionOwnPending,
  isOptionPending,
  padraoSatellites,
  pendingCostItems,
  type BaseCosts,
  type BudgetDeps,
  type CellOverrides,
} from "../calc";
import { kitSubRow, satelliteRowsFor, satelliteSubRow } from "../subRows";
import { AddColumnTh, ColHeaderCell } from "./ColHeaderCell";
import { BudgetScreenSkeleton } from "./BudgetScreenSkeleton";
import { ColumnModal, type ColumnDraft } from "./ColumnModal";
import { CostBaseView } from "./CostBaseView";
import { FormulaCellEditor } from "./FormulaCellEditor";
import { PublishSplitButton } from "./PublishSplitButton";
import { CostItemModal, type CostItemValue } from "./CostItemModal";
import { SubRow } from "./SubRow";
import { VersionDrawer, VersionToast } from "./Versioning";

type PendingFillMode = "inline" | "expandRow";

interface EditingCell {
  rowKey: string;
  colId: number;
}

/**
 * Alvo do modal de item de custo. O `lado` vem da SEÇÃO da linha clicada
 * (padrão → crédito, personalizado → débito), então o usuário não precisa
 * escolher — era um dos atritos de criar isso na config de tipologias.
 */
interface CostItemTarget {
  amb: Ambiente;
  comp: Componente;
  lado: CostComponentSide;
  /** null = criando. */
  editing: CostComponent | null;
}

interface CostRemoveTarget {
  amb: Ambiente;
  comp: Componente;
  item: CostComponent;
}

/** Estado do modal de coluna: criando, editando uma existente, ou fechado. */
type ColumnModalState = { mode: "create" } | { mode: "edit"; col: BudgetColumn } | null;

/** Botão "+ Item de custo" das linhas mestre da tabela. */
function AddCostItemBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Adicionar item de custo (soleira, rodapé, reserva técnica…)"
      className="shrink-0 rounded p-1 text-neutral-gray-5 opacity-0 transition-opacity hover:bg-neutral-gray-3 hover:text-primary-7 group-hover/row:opacity-100 focus:opacity-100"
    >
      <Icon name="plus" size={13} />
    </button>
  );
}

/**
 * Estado vazio de uma SEÇÃO da tabela (padrão/upgrade de um ambiente). O
 * EmptyState cheio tem padding de tela; aqui a densidade é de linha, então a
 * mensagem vai direto na célula que atravessa todas as colunas.
 */
function EmptySectionRow({
  colSpan,
  title,
  subtitle,
}: {
  colSpan: number;
  title: string;
  subtitle: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="bg-white px-3.5 py-5 text-center">
        <p className="text-[12.5px] font-semibold text-neutral-gray-9">{title}</p>
        <p className="mt-0.5 text-[11.5px] text-neutral-gray-6">{subtitle}</p>
      </td>
    </tr>
  );
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

// Célula da coluna "Comentários" (extremidade direita, espelha a Visão Custos base).
function CommentTd({
  count,
  onOpen,
  className,
}: {
  count?: number;
  onOpen?: () => void;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "w-11 border-b border-neutral-gray-4 px-2 py-[7px] text-center align-middle",
        className
      )}
    >
      {onOpen && (
        <button
          type="button"
          onClick={onOpen}
          title="Comentários"
          className={cn(
            "inline-flex items-center gap-[3px] rounded px-1.5 py-1",
            (count ?? 0) > 0 && "bg-functional-warning-light"
          )}
        >
          <Icon
            name="chat"
            size={14}
            className={(count ?? 0) > 0 ? "text-functional-warning" : "text-neutral-gray-5"}
          />
          {(count ?? 0) > 0 && (
            <span className="text-[10px] font-bold text-functional-warning">{count}</span>
          )}
        </button>
      )}
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
  const currentUser = useCurrentUser();
  const projectId = useRequireActiveProject();
  const { data: project } = useProject(projectId);
  const { data: tipologias = [], isLoading: tipsLoading } = useTipologias(projectId);
  const { data: materiais = [] } = useMateriais();
  const { data: kits = [] } = useKits();
  const { data: cols = [] } = useBudgetColumns(projectId);
  const { data: versions = [] } = useVersions(projectId);
  const { data: commentThreads = {} } = useCommentThreads(projectId);
  const updateCols = useUpdateBudgetColumns();
  const updateMaterial = useUpdateMaterial();
  const createVersion = useCreateVersion(projectId ?? 0);
  const restoreVersion = useRestoreVersion(projectId ?? 0);
  const addCostMut = useAddCostComponent();
  const updateCostMut = useUpdateCostComponent();
  const removeCostMut = useRemoveCostComponent();
  const setCostQtdsMut = useSetCostQtds();

  const [activeTipId, setActiveTipId] = React.useState<number | null>(null);
  const [view, setView] = React.useState<"preco" | "custos">("preco");
  const [baseCosts, setBaseCosts] = React.useState<BaseCosts>({});
  const [fillOpen, setFillOpen] = React.useState<Set<string>>(new Set());
  const [fillDraft, setFillDraft] = React.useState<BaseCosts>({});
  const [openThread, setOpenThread] = React.useState<ThreadRow | null>(null);
  const [overrides, setOverrides] = React.useState<CellOverrides>({});
  const [editingCell, setEditingCell] = React.useState<EditingCell | null>(null);
  const [columnModal, setColumnModal] = React.useState<ColumnModalState>(null);
  const [deleteCol, setDeleteCol] = React.useState<BudgetColumn | null>(null);
  const [dragId, setDragId] = React.useState<number | null>(null);
  const [dragTarget, setDragTarget] = React.useState<number | null>(null);
  const [collapsedRows, setCollapsedRows] = React.useState<Set<string>>(new Set());
  const [showDrawer, setShowDrawer] = React.useState(false);
  const [showLinkModal, setShowLinkModal] = React.useState(false);
  const [showPublishModal, setShowPublishModal] = React.useState(false);
  const [publishSummary, setPublishSummary] = React.useState("");
  const [restoreTarget, setRestoreTarget] = React.useState<BudgetVersion | null>(null);
  const [toastMsg, setToastMsg] = React.useState("");
  const [convWarnDismissed, setConvWarnDismissed] = React.useState(false);
  const [costTarget, setCostTarget] = React.useState<CostItemTarget | null>(null);
  const [costRemove, setCostRemove] = React.useState<CostRemoveTarget | null>(null);
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
    () => ({ materiais, kits, cols, overrides, baseCosts }),
    [materiais, kits, cols, overrides, baseCosts]
  );

  const affectedCols = React.useMemo(
    () => columnsAffectedByExtendedConvention(cols),
    [cols]
  );

  // Item de custo: a definição vai numa mutação, a quantidade em outra — só a
  // quantidade é local à tipologia.
  const saveCostItem = (v: CostItemValue) => {
    if (!costTarget || !tip) return;
    const path = {
      tipologiaId: tip.id,
      ambienteId: costTarget.amb.blueprintRoomId,
      componenteId: costTarget.comp.id,
    };
    const close = () => setCostTarget(null);
    const editing = costTarget.editing;
    if (editing) {
      updateCostMut.mutate(
        {
          ...path,
          costItemId: editing.id,
          patch: { nome: v.nome, tipo: v.tipo, baseId: v.baseId, unidade: v.unidade, lado: v.lado },
        },
        {
          onSuccess: () =>
            setCostQtdsMut.mutate({ ...path, qtds: { [editing.id]: v.qtd } }, { onSuccess: close }),
        }
      );
    } else {
      addCostMut.mutate({ ...path, input: v }, { onSuccess: close });
    }
  };

  const confirmRemoveCostItem = () => {
    if (!costRemove || !tip) return;
    removeCostMut.mutate(
      {
        tipologiaId: tip.id,
        ambienteId: costRemove.amb.blueprintRoomId,
        componenteId: costRemove.comp.id,
        costItemId: costRemove.item.id,
      },
      { onSuccess: () => setCostRemove(null) }
    );
  };

  /** Handlers de edição/remoção passados às sub-linhas de item de custo. */
  const costRowHandlers = (amb: Ambiente, comp: Componente, lado: CostComponentSide) => ({
    onEdit: (costItemId: number) => {
      const item = comp.custoComponentes.find((c) => c.id === costItemId);
      if (item) setCostTarget({ amb, comp, lado, editing: item });
    },
    onRemove: (costItemId: number) => {
      const item = comp.custoComponentes.find((c) => c.id === costItemId);
      if (item) setCostRemove({ amb, comp, item });
    },
  });

  if (!projectId || tipsLoading) return <BudgetScreenSkeleton />;
  if (!tip)
    return (
      <div className="mx-auto max-w-6xl">
        <EmptyState
          icon="layers"
          title="Nenhuma tipologia para orçar"
          subtitle="Cadastre as tipologias e seus componentes antes de montar o construtor de preço."
          action={
            <Button variant="teal" icon="layers" onPress={() => router.push("/tipologias")}>
              Ir para tipologias
            </Button>
          }
        />
      </div>
    );
  // Colunas: Especificação, Qtd, Valor un., Déb/Créd, Custo troca, N livres,
  // (+ coluna), Total final, Comentários (extremidade direita).
  const colCount = 8 + cols.length;
  // Total por ambiente calculado UMA vez e reusado no cabeçalho de cada ambiente
  // e no grand-total (antes o motor rodava 2× por ambiente a cada render).
  const ambTotals = tip.ambientes.map((amb) => ambTotal(deps, amb));

  // ── colunas (persistem no store) ──
  const persistCols = (next: BudgetColumn[]) => updateCols.mutate({ projectId, cols: next });
  // Id temporário: o servidor descarta e devolve o autoincrement real.
  const addColumn = ({ nome, expr }: ColumnDraft) =>
    persistCols([...cols, { id: Date.now(), nome, expr, visivel: true }]);
  const saveColumn = (id: number, draft: ColumnDraft) =>
    persistCols(cols.map((c) => (c.id === id ? { ...c, ...draft } : c)));
  const submitColumn = (draft: ColumnDraft) => {
    if (!columnModal) return;
    if (columnModal.mode === "edit") saveColumn(columnModal.col.id, draft);
    else addColumn(draft);
    setColumnModal(null);
  };
  const deleteColumn = (id: number) => {
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
  const reorder = (fromId: number | null, toId: number) => {
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

  // Prévia da expressão no modal de coluna: primeira linha calculável da
  // tipologia ativa. `colIdx` é a posição da coluna editada (ou o fim, ao
  // criar), o que já restringe as referências às colunas à esquerda — mesma
  // regra do motor.
  const columnScope = (() => {
    const colIdx =
      columnModal?.mode === "edit"
        ? cols.findIndex((c) => c.id === columnModal.col.id)
        : cols.length;
    for (const amb of tip.ambientes) {
      for (const comp of amb.componentes) {
        for (const opt of comp.options) {
          const r = calcAnyRow(deps, comp, opt);
          if (r) return buildScopeRefs(cols, r.result, colIdx);
        }
      }
    }
    return emptyScopeRefs(cols, colIdx);
  })();

  // ── overrides por célula ──
  const setOverride = (rowKey: string, colId: number, expr: string) =>
    setOverrides((prev) => ({ ...prev, [rowKey]: { ...prev[rowKey], [colId]: expr } }));
  const clearOverride = (rowKey: string, colId: number) =>
    setOverrides((prev) => {
      const next = { ...prev };
      const row = { ...next[rowKey] };
      delete row[colId];
      next[rowKey] = row;
      return next;
    });

  // ── preenchimento de custo pendente ──
  const openFill = (rowKey: string, baseId: number) => {
    const m = getMaterial(materiais, baseId);
    setFillDraft((p) => ({
      ...p,
      [baseId]:
        p[baseId] ??
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
  const setDraftField = (baseId: number, fld: "mat" | "mo", val: string) =>
    setFillDraft((p) => ({ ...p, [baseId]: { ...(p[baseId] ?? { mat: "", mo: "" }), [fld]: val } }));
  // Persiste o custo base digitado no material (custoMat/custoMO) — o servidor
  // remove a pendência quando custoMat > 0, então o item deixa de aparecer como
  // "sem custo" no catálogo, na revisão de custos e nas tipologias.
  const persistBaseCost = (baseId: number, matStr: string, moStr: string) => {
    const custoMat = parseFloat(String(matStr).replace(",", ".")) || 0;
    const custoMO = parseFloat(String(moStr).replace(",", ".")) || 0;
    if (custoMat <= 0) return;
    const m = materiais.find((x) => x.id === baseId);
    if (m && m.custoMat === custoMat && m.custoMO === custoMO) return;
    updateMaterial.mutate({ id: baseId, patch: { custoMat, custoMO } });
  };
  const commitFill = (rowKey: string, baseId: number) => {
    const d = fillDraft[baseId] ?? { mat: "", mo: "" };
    setBaseCosts((p) => ({ ...p, [baseId]: { mat: d.mat, mo: d.mo } }));
    closeFill(rowKey);
    persistBaseCost(baseId, d.mat, d.mo);
  };

  // Guarda os COLAPSADOS (não os expandidos) para que o default seja expandido.
  // Três namespaces de chave: rowKey(opção) para kit e material, `pad-<compId>`
  // para a linha de padrão.
  const toggleRow = (key: string) =>
    setCollapsedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // ── versões ──
  // Publicar salva uma versão do estado atual e segue para a publicação — os
  // dois passos foram unificados (não há mais "Salvar versão" separado).
  const handlePublish = () => {
    const summary = publishSummary.trim();
    if (!summary) return;
    createVersion.mutate(
      {
        summary,
        createdBy: currentUser.name,
        changes: { materiais: [], custos: [], taxas: [], tipologias: [] },
      },
      {
        onSuccess: () => {
          setShowPublishModal(false);
          setPublishSummary("");
          router.push("/publicacao");
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
      for (const opt of comp.options) {
        if (opt.isDefault) continue;
        if (opt.isKit) {
          const r = calcAnyRow(deps, comp, opt);
          if (r?.kind === "kit" && (r.result.subItemPending || r.result.satellitePending))
            excludedCount++;
        } else if (isOptionPending(deps, comp, opt)) {
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
      <Td key={col.id} right className={ovr ? "bg-[#f0faf9]" : rowBgClass}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => setEditingCell({ rowKey, colId: col.id })}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setEditingCell({ rowKey, colId: col.id });
            }
          }}
          title="Clique para editar valor ou fórmula"
          className="flex cursor-pointer items-center justify-end gap-1 rounded px-1 py-0.5"
        >
          {cr?.error ? (
            <span title={cr.error} className="cursor-help font-bold text-functional-error">
              #ERR
            </span>
          ) : (
            <>
              <span className={ovr ? "font-bold text-primary-7" : "text-neutral-gray-8"}>
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
            <PublishSplitButton
              onPublish={() => setShowPublishModal(true)}
              onOpenVersions={() => setShowDrawer(true)}
              versionLabel={currentVersion?.label ?? "—"}
            />
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
            Digite um número (<code className="font-mono text-primary-8">150</code>) para valor fixo
            da linha inteira, ou comece com{" "}
            <code className="mx-1 font-mono text-primary-8">=</code> para fórmula — ex.{" "}
            <code className="mx-1 font-mono text-primary-8">=custo_troca * 10%</code> ou{" "}
            <code className="ml-1 font-mono text-primary-8">=valor_unitario * 0,25</code>.
          </span>
        </div>
      )}

      {/* Aviso único da mudança de convenção: valores fixos deixaram de ser por
          unidade e passaram a valer pela linha. Só colunas com literal aditivo
          mudam de resultado — as percentuais são invariantes. */}
      {view === "preco" && !convWarnDismissed && affectedCols.length > 0 && (
        <div className="mb-3.5 flex items-start gap-2.5 rounded-lg border border-[#fde68a] bg-functional-warning-light px-3.5 py-2.5">
          <Icon name="warning" size={14} className="mt-0.5 shrink-0 text-tint-orange-fg" />
          <div className="flex-1 text-xs text-neutral-gray-9">
            <strong className="font-bold">
              {affectedCols.length}{" "}
              {affectedCols.length === 1 ? "coluna usa valor fixo" : "colunas usam valores fixos"}
            </strong>{" "}
            — o valor digitado agora vale para a linha inteira, não por unidade. Confira:{" "}
            {affectedCols.map((c) => c.nome).join(", ")}.
          </div>
          <button
            type="button"
            onClick={() => setConvWarnDismissed(true)}
            title="Dispensar aviso"
            className="shrink-0 text-[11px] font-semibold text-neutral-gray-7"
          >
            Dispensar
          </button>
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
          comments={commentThreads}
          onOpenThread={setOpenThread}
          onPersist={persistBaseCost}
        />
      )}

      {view === "preco" && tip.ambientes.length === 0 && (
        <div className="mb-6 rounded-b-lg border border-t-0 border-neutral-gray-4 bg-white">
          <EmptyState
            icon="layers"
            title="Nenhum ambiente nesta tipologia"
            subtitle="Cadastre os ambientes e seus componentes para montar o preço."
            action={
              <Button variant="teal" icon="plus" onPress={() => router.push("/tipologias")}>
                Adicionar ambiente
              </Button>
            }
          />
        </div>
      )}

      {view === "preco" && tip.ambientes.length > 0 && (
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
                    onRequestEdit={(c) => setColumnModal({ mode: "edit", col: c })}
                    onRequestDelete={setDeleteCol}
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
                <AddColumnTh onRequestCreate={() => setColumnModal({ mode: "create" })} />
                <Th right teal>Total final</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {tip.ambientes.map((amb, ambIdx) => {
                const total = ambTotals[ambIdx];
                // Mesmas condições dos dois maps abaixo: um componente só
                // aparece na seção padrão se tiver material padrão resolvido, e
                // na de upgrade se tiver ao menos uma opção não-padrão.
                const hasPadrao = amb.componentes.some((c) => {
                  const d = c.options.find((o) => o.id === c.padrao);
                  return Boolean(d && !d.isKit && getMaterial(materiais, d.baseId));
                });
                const hasUpgrade = amb.componentes.some((c) =>
                  c.options.some((o) => !o.isDefault)
                );
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
                    {!hasPadrao && (
                      <EmptySectionRow
                        colSpan={colCount}
                        title="Nenhum material padrão definido"
                        subtitle="Defina o material padrão dos componentes deste ambiente para gerar o crédito."
                      />
                    )}
                    {amb.componentes.map((comp) => {
                      const def = comp.options.find((o) => o.id === comp.padrao);
                      const padMat =
                        def && !def.isKit ? getMaterial(materiais, def.baseId) : undefined;
                      if (!padMat) return null;
                      // O crédito é o material que a construtora deixaria de
                      // instalar, na quantidade LÍQUIDA: a reserva técnica é
                      // perda extra do upgrade, não do padrão.
                      const valUnit = padMat.custoMat + padMat.custoMO;
                      const bg = "bg-[#f4fffe]";
                      // A coluna mostra o crédito DESTE item; cada satélite tem
                      // sua própria sub-linha. A soma (H41 da planilha) entra no
                      // custo de troca das opções, não aqui.
                      const padSats = padraoSatellites(deps, comp, valUnit);
                      const padChildren = padSats.map(satelliteSubRow);
                      const padKey = `pad-${comp.id}`;
                      const padExpanded = !collapsedRows.has(padKey);
                      return (
                        <React.Fragment key={padKey}>
                          <tr className="group/row">
                            <Td sticky className={bg}>
                              <div className="flex items-start gap-1.5">
                                {padChildren.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => toggleRow(padKey)}
                                    title={padExpanded ? "Recolher itens de custo" : "Expandir itens de custo"}
                                    className="mt-px text-neutral-gray-7"
                                  >
                                    <Icon name={padExpanded ? "chevD" : "chevR"} size={15} />
                                  </button>
                                )}
                                <div className="flex-1">
                                  <div className="text-xs font-semibold text-neutral-gray-9">
                                    {padMat.nome}
                                  </div>
                                  <div className="mt-px text-[11px] text-neutral-gray-6">
                                    {comp.nome} · {padMat.fabricante}
                                  </div>
                                </div>
                                <AddCostItemBtn
                                  onClick={() =>
                                    setCostTarget({ amb, comp, lado: "padrao", editing: null })
                                  }
                                />
                              </div>
                            </Td>
                            <Td right className={cn(bg, "text-neutral-gray-7")}>
                              {fmtNum(comp.qtd, 2)} {comp.unidade}
                            </Td>
                            <Td right className={cn(bg, "text-neutral-gray-7")}>
                              {fmtBRL(valUnit)}
                            </Td>
                            <Td right className={bg}>
                              <span className="font-semibold text-functional-success">
                                Créd. {fmtBRL(valUnit * comp.qtd)}
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
                          {padExpanded &&
                            padChildren.map((c, ci) => (
                              <SubRow
                                key={`${padKey}-${c.key}`}
                                cells={c}
                                isLast={ci === padChildren.length - 1}
                                cols={cols}
                                {...costRowHandlers(amb, comp, "padrao")}
                              />
                            ))}
                        </React.Fragment>
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
                    {!hasUpgrade && (
                      <EmptySectionRow
                        colSpan={colCount}
                        title="Nenhum upgrade cadastrado"
                        subtitle="Adicione opções de upgrade aos componentes deste ambiente para cobrar do cliente."
                      />
                    )}
                    {amb.componentes.map((comp) =>
                      comp.options.map((opt) => {
                        if (opt.isDefault) return null;
                        const rk = rowKey(opt.id);

                        // ── KIT: linha principal + sub-itens ──
                        if (opt.isKit) {
                          const kit = getKit(kits, opt.baseId);
                          if (!kit) return null;
                          const rr = calcAnyRow(deps, comp, opt);
                          const r = rr?.kind === "kit" ? rr.result : null;
                          // Pendência do kit vem de duas fontes distintas: um
                          // sub-item sem custo (o kit em si) ou um item de custo
                          // sem preço (que não é culpa do kit).
                          const subPending = r ? r.subItemPending : true;
                          const satPending = r?.satellitePending ?? false;
                          const pending = subPending || satPending;
                          const expanded = !collapsedRows.has(rk);
                          const kitBg = pending ? "bg-functional-warning-light" : "bg-[#fbf6ff]";
                          // Sub-itens do kit e componentes de custo são irmãos:
                          // o isLast do conector corre sobre a concatenação.
                          const kitChildren = [
                            ...(r?.subItems ?? []).map(kitSubRow),
                            ...satelliteRowsFor(r?.satellites ?? [], "upgrade"),
                          ];
                          return (
                            <React.Fragment key={rk}>
                              <tr className="group/row">
                                <Td sticky className={kitBg}>
                                  <div className="flex items-start gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => toggleRow(rk)}
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
                                        {subPending && (
                                          <span className="ml-1.5 font-bold text-tint-orange-fg">
                                            · Sub-item aguardando custo
                                          </span>
                                        )}
                                        {!subPending && satPending && (
                                          <span className="ml-1.5 font-bold text-tint-orange-fg">
                                            · Item de custo sem preço
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {pending && (
                                      <Icon name="warning" size={13} className="text-tint-orange-fg" />
                                    )}
                                    <AddCostItemBtn
                                      onClick={() =>
                                        setCostTarget({ amb, comp, lado: "upgrade", editing: null })
                                      }
                                    />
                                  </div>
                                </Td>
                                <Td right className={cn(kitBg, "text-neutral-gray-7")}>
                                  {kit.itens.length} itens
                                </Td>
                                {/* Kit não tem valor unitário: é um conjunto. O
                                    total do kit é o próprio débito, na coluna ao lado. */}
                                <Td right className={cn(kitBg, "text-neutral-gray-7")}>
                                  —
                                </Td>
                                <Td right className={kitBg}>
                                  {r && !pending ? (
                                    <span className="font-semibold text-[#c2410c]">
                                      Déb. {fmtBRL(r.debitoItem)}
                                    </span>
                                  ) : (
                                    "—"
                                  )}
                                </Td>
                                <Td right className={cn(kitBg, "text-neutral-gray-8")}>
                                  {r && !pending ? (
                                    <span
                                      className={cn(
                                        "font-semibold",
                                        r.custoDeTroca >= 0
                                          ? "text-neutral-gray-8"
                                          : "text-functional-success"
                                      )}
                                    >
                                      {fmtBRL(r.custoDeTroca)}
                                    </span>
                                  ) : (
                                    "—"
                                  )}
                                </Td>
                                {cols.map((col, colIdx) =>
                                  renderConfigCell(col, colIdx, pending ? null : rr, rk, kitBg)
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
                                <CommentTd className={kitBg} />
                              </tr>
                              {expanded &&
                                kitChildren.map((c, ci) => (
                                  <SubRow
                                    key={`${rk}-${c.key}`}
                                    cells={c}
                                    isLast={ci === kitChildren.length - 1}
                                    cols={cols}
                                    {...costRowHandlers(amb, comp, "upgrade")}
                                  />
                                ))}
                            </React.Fragment>
                          );
                        }

                        // ── MATERIAL: linha + preenchimento de custo base ──
                        const upgMat = getMaterial(materiais, opt.baseId);
                        if (!upgMat) return null;
                        // "own" = o material desta opção está sem custo.
                        // "cost" = um item de custo do componente está — a linha
                        // sai do total, mas ESTE material pode estar preenchido:
                        // acusar "aguardando custo" aqui seria mentira.
                        const ownPending = isOptionOwnPending(deps, opt);
                        const faltandoCusto = pendingCostItems(deps, comp);
                        const pending = ownPending || faltandoCusto.length > 0;
                        // Calcula mesmo com item de custo pendente: qtd, valor
                        // unitário e débito DESTA opção são conhecidos e ajudam.
                        // Só o que depende do custo de troca (taxas e total) é
                        // que fica em branco — esse sim está incompleto.
                        const rr = ownPending ? null : calcAnyRow(deps, comp, opt);
                        const r = rr?.kind === "material" ? rr.result : null;
                        const rowBg = pending ? "bg-functional-warning-light" : "bg-white";
                        const cmts = commentThreads[rk] ?? [];
                        const filling = fillOpen.has(rk);
                        const inlineFill = pending && filling && pendingFill === "inline";
                        const draft = fillDraft[opt.baseId] ?? { mat: "", mo: "" };
                        const fillCell = inlineFill ? "bg-primary-1" : rowBg;
                        // Componentes de custo do lado upgrade: entram no débito
                        // desta opção e aparecem indentados abaixo dela.
                        const matChildren = satelliteRowsFor(r?.satellites ?? [], "upgrade");
                        const matExpanded = !collapsedRows.has(rk);

                        return (
                          <React.Fragment key={rk}>
                            <tr className="group/row">
                              <Td sticky className={rowBg}>
                                <div className="flex items-start gap-1.5">
                                  {matChildren.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => toggleRow(rk)}
                                      title={matExpanded ? "Recolher itens de custo" : "Expandir itens de custo"}
                                      className="mt-px text-neutral-gray-7"
                                    >
                                      <Icon name={matExpanded ? "chevD" : "chevR"} size={15} />
                                    </button>
                                  )}
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
                                      {ownPending && (
                                        <span className="ml-1.5 font-bold text-tint-orange-fg">
                                          · Aguardando custo
                                        </span>
                                      )}
                                      {!ownPending && faltandoCusto.length > 0 && (
                                        <span className="ml-1.5 font-bold text-tint-orange-fg">
                                          · Item de custo sem preço:{" "}
                                          {faltandoCusto.map((c) => c.nome).join(", ")}
                                        </span>
                                      )}
                                    </div>
                                    {ownPending && !inlineFill && !(filling && pendingFill === "expandRow") && (
                                      <button
                                        type="button"
                                        onClick={() => openFill(rk, opt.baseId)}
                                        className="mt-1.5 inline-flex items-center gap-[5px] rounded-full border border-primary-7 bg-white px-2.5 py-1 text-[11px] font-bold text-primary-7"
                                      >
                                        <Icon name="plus" size={12} /> Preencher custo base
                                      </button>
                                    )}
                                  </div>
                                  {pending && (
                                    <Icon name="warning" size={13} className="text-tint-orange-fg" />
                                  )}
                                  <AddCostItemBtn
                                    onClick={() =>
                                      setCostTarget({ amb, comp, lado: "upgrade", editing: null })
                                    }
                                  />
                                </div>
                              </Td>
                              <Td right className={cn(fillCell, "text-neutral-gray-7")}>
                                {inlineFill ? (
                                  <span className="text-[9.5px] font-bold uppercase tracking-wide text-primary-7">
                                    Custo base →
                                  </span>
                                ) : r ? (
                                  `${fmtNum(r.qtdComRT, 2)} ${comp.unidade}`
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
                                      onChange={(v) => setDraftField(opt.baseId, "mat", v)}
                                      onEnter={() => commitFill(rk, opt.baseId)}
                                      onEscape={() => closeFill(rk)}
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
                                      onChange={(v) => setDraftField(opt.baseId, "mo", v)}
                                      onEnter={() => commitFill(rk, opt.baseId)}
                                      onEscape={() => closeFill(rk)}
                                    />
                                  </div>
                                ) : r ? (
                                  <span className="font-semibold text-[#c2410c]">
                                    Déb. {fmtBRL(r.debitoItem)}
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
                                      onClick={() => commitFill(rk, opt.baseId)}
                                      title="Salvar"
                                      className="rounded bg-primary-7 px-[9px] py-1 text-[11px] font-bold text-white"
                                    >
                                      ✓
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => closeFill(rk)}
                                      title="Cancelar"
                                      className="rounded border border-neutral-gray-5 px-[7px] py-1 text-[11px] text-neutral-gray-7"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : r && !pending ? (
                                  // custoDeTroca já é estendido — multiplicar de
                                  // novo por qtdComRT duplicaria a extensão.
                                  <span
                                    className={cn(
                                      "font-semibold",
                                      r.custoDeTroca >= 0
                                        ? "text-neutral-gray-8"
                                        : "text-functional-success"
                                    )}
                                  >
                                    {fmtBRL(r.custoDeTroca)}
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </Td>
                              {cols.map((col, colIdx) =>
                                renderConfigCell(col, colIdx, pending ? null : rr, rk, rowBg)
                              )}
                              <Td className={rowBg} />
                              {/* O total depende do custo de troca; com item de
                                  custo pendente ele estaria subestimado. */}
                              <Td right className={r && !pending ? "bg-primary-1" : rowBg}>
                                {r && !pending ? (
                                  <span className="text-[13px] font-extrabold text-primary-7">
                                    {fmtBRL(r.total)}
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </Td>
                              <CommentTd
                                count={cmts.length}
                                onOpen={() =>
                                  setOpenThread({
                                    key: rk,
                                    especificacao: upgMat.nome,
                                    ambiente: amb.nome,
                                    componente: comp.nome,
                                  })
                                }
                                className={rowBg}
                              />
                            </tr>
                            {matExpanded &&
                              matChildren.map((c, ci) => (
                                <SubRow
                                  key={`${rk}-${c.key}`}
                                  cells={c}
                                  isLast={ci === matChildren.length - 1}
                                  cols={cols}
                                  {...costRowHandlers(amb, comp, "upgrade")}
                                />
                              ))}
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
                                        onChange={(v) => setDraftField(opt.baseId, "mat", v)}
                                        onEnter={() => commitFill(rk, opt.baseId)}
                                        onEscape={() => closeFill(rk)}
                                      />
                                    </label>
                                    <label className="flex flex-col gap-1">
                                      <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-gray-7">
                                        Custo mão de obra (R$)
                                      </span>
                                      <FillInput
                                        big
                                        value={draft.mo}
                                        onChange={(v) => setDraftField(opt.baseId, "mo", v)}
                                        onEnter={() => commitFill(rk, opt.baseId)}
                                        onEscape={() => closeFill(rk)}
                                      />
                                    </label>
                                    <div className="flex-1" />
                                    <Button variant="bordered" size="sm" onPress={() => closeFill(rk)}>
                                      Cancelar
                                    </Button>
                                    <Button size="sm" icon="check" onPress={() => commitFill(rk, opt.baseId)}>
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
                    {fmtBRL(ambTotals.reduce((acc, v) => acc + v, 0))}
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

      {/* Publicar orçamento (salva versão + publica) */}
      <Modal
        open={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        title="Publicar orçamento"
        actions={
          <>
            <Button variant="bordered" onPress={() => setShowPublishModal(false)}>
              Cancelar
            </Button>
            <Button
              icon="upload"
              onPress={handlePublish}
              isDisabled={publishSummary.trim() === ""}
              isLoading={createVersion.isPending}
            >
              Publicar orçamento
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3.5">
          <p className="text-[13px] text-neutral-gray-7">
            Publicar salva uma nova versão do estado atual (ponto de restauração) e segue para a
            publicação.
          </p>
          <Textarea
            label="Resumo das alterações *"
            value={publishSummary}
            onValueChange={setPublishSummary}
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
        <Modal
          open
          onClose={() => setOpenThread(null)}
          width={560}
          title={
            <div className="min-w-0 pr-6">
              <p className="truncate text-medium font-bold text-neutral-gray-11">
                {openThread.especificacao}
              </p>
              <p className="mt-0.5 text-[11px] font-normal text-neutral-gray-6">
                {openThread.ambiente} · {openThread.componente}
              </p>
            </div>
          }
        >
          <CommentThreadPanel embedded row={openThread} onClose={() => setOpenThread(null)} />
        </Modal>
      )}

      <LinkFillModal open={showLinkModal} onClose={() => setShowLinkModal(false)} />

      <CostItemModal
        open={costTarget !== null}
        editing={costTarget?.editing ?? null}
        lado={costTarget?.lado ?? "upgrade"}
        compNome={costTarget?.comp.nome ?? ""}
        ambNome={costTarget?.amb.nome ?? ""}
        nOpcoes={costTarget?.comp.options.filter((o) => !o.isDefault).length ?? 0}
        qtdInicial={
          costTarget?.editing
            ? costTarget.comp.custoQtds[costTarget.editing.id] ?? 0
            : 1
        }
        baseInicial={getMaterial(materiais, costTarget?.editing?.baseId) ?? null}
        saving={addCostMut.isPending || updateCostMut.isPending || setCostQtdsMut.isPending}
        onClose={() => setCostTarget(null)}
        onSave={saveCostItem}
      />

      <Modal
        open={costRemove !== null}
        onClose={() => setCostRemove(null)}
        title="Remover item de custo"
        actions={
          <>
            <Button variant="bordered" onPress={() => setCostRemove(null)}>
              Cancelar
            </Button>
            <Button variant="danger" isLoading={removeCostMut.isPending} onPress={confirmRemoveCostItem}>
              Remover
            </Button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-neutral-gray-9">
          Remover <strong>{costRemove?.item.nome}</strong> do custo de{" "}
          <strong>{costRemove?.comp.nome}</strong>? Vale para todas as tipologias que usam &ldquo;
          {costRemove?.amb.nome}&rdquo;.
        </p>
      </Modal>

      <ColumnModal
        open={columnModal !== null}
        onClose={() => setColumnModal(null)}
        col={columnModal?.mode === "edit" ? columnModal.col : null}
        scope={columnScope.scope}
        refs={columnScope.refs}
        isLoading={updateCols.isPending}
        onSubmit={submitColumn}
      />

      <AlertModal
        open={deleteCol !== null}
        title="Remover coluna"
        variant="error"
        confirmLabel="Remover"
        body={
          <>
            Remover a coluna <strong>{deleteCol?.nome}</strong>? As fórmulas definidas nas
            células dessa coluna serão perdidas.
          </>
        }
        isLoading={updateCols.isPending}
        onCancel={() => setDeleteCol(null)}
        onConfirm={() => {
          if (deleteCol) deleteColumn(deleteCol.id);
          setDeleteCol(null);
        }}
      />

      <VersionToast msg={toastMsg} />
    </div>
  );
}
