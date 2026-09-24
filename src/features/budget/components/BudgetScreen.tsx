"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { AlertModal, Button, EmptyState, Icon, Modal, PageHeader, Textarea } from "@/components/ui";
import { columnsAffectedByExtendedConvention, rowKey } from "@/lib/budget";
import { getKit, getMaterial } from "@/lib/data/entities";
import { useBudgetColumns, useUpdateBudgetColumns } from "@/lib/hooks/useBudgetColumns";
import { useCommentThreads } from "@/lib/hooks/useComments";
import { flushDiff } from "@/lib/hooks/diffRefresh";
import { waitForSaves, type SaveGateResult } from "@/lib/hooks/writeQueue";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useCustosBase, useSaveCustoBase, toCustosBaseMap } from "@/lib/hooks/useCustosBase";
import { useKits } from "@/lib/hooks/useKits";
import { useSaveKitQtd } from "@/lib/hooks/useKitQtds";
import { useMateriais } from "@/lib/hooks/useMateriais";
import {
  usePricing,
  usePricingDiff,
  usePublishBudget,
  useSavePricing,
} from "@/lib/hooks/useMaterialPricing";
import { useProject } from "@/lib/hooks/useProjects";
import { useTipologias } from "@/lib/hooks/useTipologias";
import { useRestoreVersion, useVersions } from "@/lib/hooks/useVersions";
import { cn, fmtBRL } from "@/lib/utils";
import { useRequireActiveProject } from "@/lib/hooks/useRequireActiveProject";
import { CommentThreadPanel, type ThreadRow } from "@/features/construtor-shared/CommentThreadPanel";
import { LinkFillModal } from "@/features/construtor-shared/LinkFillModal";
import type { BudgetColumn, BudgetVersion, CompositionLine } from "@/shared/types/domain";

import {
  ambTotal,
  buildScopeRefs,
  calcAnyRow,
  custoBaseOf,
  emptyScopeRefs,
  isOptionOwnPending,
  isRowPending,
  padroesPendentes,
  pricingOf,
  qtdOf,
  rtOf,
  unidadeOf,
  valUnOf,
  type BudgetDeps,
} from "../calc";
import { linhasPendentesOf } from "../resolve";
import { PricingStatusBadge } from "./PricingStatusBadge";
import { PublishDiffList } from "./PublishDiffList";
import { QtyPopover, type QtyValue } from "./QtyPopover";
import { UnitCostCell } from "./UnitCostCell";
import { composicaoSubRows } from "../subRows";
import { AddColumnTh, ColHeaderCell } from "./ColHeaderCell";
import { BudgetScreenSkeleton } from "./BudgetScreenSkeleton";
import { ColumnModal, type ColumnDraft } from "./ColumnModal";
import { CostBaseView } from "./CostBaseView";
import { CostItemsView } from "./CostItemsView";
import { FormulaCellEditor } from "./FormulaCellEditor";
import { PublishSplitButton } from "./PublishSplitButton";
import { KitOptionRows } from "./KitOptionRows";
import { SubRow, Td, type SubRowCells } from "./SubRow";
import { VersionDrawer, VersionToast } from "./Versioning";

type PendingFillMode = "inline" | "expandRow";

/** baseId → custo digitado no preenchimento inline (strings de input). */
type FillDraft = Record<number, { mat: string; mo: string }>;

interface EditingCell {
  rowKey: string;
  colId: number;
}

/** Estado do modal de coluna: criando, editando uma existente, ou fechado. */
type ColumnModalState = { mode: "create" } | { mode: "edit"; col: BudgetColumn } | null;
/** Etapas do publicar — ver handlePublish. */
type PublishPhase = "idle" | "waiting" | "sending";

/**
 * Dica "insumo sem preço": o material da linha pode estar cotado, mas um insumo
 * da composição dele não tem preço neste empreendimento — a correção é na aba
 * "Itens de custo", não no custo base da linha.
 */
function InsumoPendenteHint({
  linhas,
  onVer,
}: {
  linhas: CompositionLine[];
  onVer: () => void;
}) {
  const primeiro = linhas[0];
  if (!primeiro) return null;
  return (
    <span className="ml-1.5 font-bold text-tint-orange-fg">
      · Insumo sem preço: {primeiro.nome}
      {linhas.length > 1 && ` e mais ${linhas.length - 1}`}{" "}
      <button type="button" onClick={onVer} className="font-semibold text-primary-7 underline">
        ver Itens de custo
      </button>
    </span>
  );
}

/**
 * Composição sob uma linha cujo valor unitário foi SOBREPOSTO: o valor digitado
 * vence, então as sub-linhas são só informativas — a nota vai na primeira.
 */
function noteOverride(rows: SubRowCells[]): SubRowCells[] {
  return rows.map((c, i) =>
    i === 0 ? { ...c, sub: c.sub ? `${c.sub} · valor un. sobreposto` : "valor un. sobreposto" } : c
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
  center = false,
  right = false,
  teal = false,
  sticky = false,
  minW,
}: {
  children?: React.ReactNode;
  right?: boolean;
  center?: boolean;
  teal?: boolean;
  sticky?: boolean;
  minW?: number;
}) {
  return (
    <th
      style={{ minWidth: minW }}
      className={cn(
        "whitespace-nowrap border-b-2 border-neutral-gray-4 px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider",
        right ? "text-right" : center ? "text-center" : "text-left",
        teal ? "bg-primary-1 text-primary-7" : "bg-neutral-gray-2 text-neutral-gray-7",
        sticky && "sticky left-0 z-[2]"
      )}
    >
      {children}
    </th>
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
  const { data: custoRows = [] } = useCustosBase(projectId);
  const { data: pricings = {} } = usePricing(projectId);
  const { data: diff } = usePricingDiff(projectId);
  const updateCols = useUpdateBudgetColumns();
  const saveCustoBase = useSaveCustoBase(projectId);
  const savePricing = useSavePricing(projectId);
  const saveKitQtd = useSaveKitQtd(projectId);
  const publishBudget = usePublishBudget(projectId);
  const restoreVersion = useRestoreVersion(projectId ?? 0);
  const queryClient = useQueryClient();

  const [activeTipId, setActiveTipId] = React.useState<number | null>(null);
  const [view, setView] = React.useState<"preco" | "custos" | "itens">("preco");
  const [fillOpen, setFillOpen] = React.useState<Set<string>>(new Set());
  // Rascunho do preenchimento inline de custo pendente (baseId → strings do
  // input). Vive entre abrir o campo e o Enter/✓; o valor real está no servidor.
  const [fillDraft, setFillDraft] = React.useState<FillDraft>({});
  const [openThread, setOpenThread] = React.useState<ThreadRow | null>(null);
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
  // "waiting" = esperando as gravações em voo (Cancelar ainda aborta);
  // "sending" = publish já foi ao servidor (o modal trava até a resposta).
  const [publishPhase, setPublishPhaseState] = React.useState<PublishPhase>("idle");
  // Espelho em ref: os guards precisam do valor no mesmo tick (duplo clique,
  // Cancelar logo após o envio), antes de o state re-renderizar.
  const publishPhaseRef = React.useRef<PublishPhase>("idle");
  // Id da execução corrente — o Cancelar durante a espera o invalida, e a
  // execução abandonada não chega a publicar.
  const publishRunRef = React.useRef(0);
  const [publishGateError, setPublishGateError] = React.useState<SaveGateResult | null>(null);
  const [restoreTarget, setRestoreTarget] = React.useState<BudgetVersion | null>(null);
  const [toastMsg, setToastMsg] = React.useState("");
  const [convWarnDismissed, setConvWarnDismissed] = React.useState(false);
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

  const custosBase = React.useMemo(() => toCustosBaseMap(custoRows), [custoRows]);
  const usaDC = project?.usaDebitoCredito !== false;
  // Sem débito/crédito a coluna Déb./Créd. some, e é ela que hospeda o input de
  // "Custo MO" no preenchimento inline — então caímos no painel expandRow (full
  // width, independente das colunas) para não perder o campo.
  const fillMode = usaDC ? pendingFill : "expandRow";

  const deps = React.useMemo<BudgetDeps>(
    () => ({ materiais, kits, cols, custosBase, pricings, usaDebitoCredito: usaDC }),
    [materiais, kits, cols, custosBase, pricings, usaDC]
  );

  const affectedCols = React.useMemo(
    () => columnsAffectedByExtendedConvention(cols),
    [cols]
  );

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
  // (+ coluna), Total final, Comentários (extremidade direita). Sem débito/crédito
  // a coluna Déb/Créd some, então são 7 fixas em vez de 8.
  const colCount = (usaDC ? 8 : 7) + cols.length;
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
  // Os overrides de célula da coluna são limpos no SERVIDOR, dentro do mesmo
  // update (updateBudgetColumns faz `ColumnOverrides - id`): limpar só no
  // cliente deixaria a chave órfã no Json de todo Material do empreendimento.
  const deleteColumn = (id: number) => {
    persistCols(cols.filter((c) => c.id !== id));
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

  // ── overrides por célula (persistidos em MaterialPricing.colunas) ──
  const saveColunas = (optionId: number, colunas: Record<string, string>) =>
    savePricing.mutate({ optionId, colunas });
  const setOverride = (optionId: number, colId: number, expr: string) =>
    saveColunas(optionId, { ...pricingOf(deps, optionId).colunas, [colId]: expr });
  const clearOverride = (optionId: number, colId: number) => {
    const next = { ...pricingOf(deps, optionId).colunas };
    delete next[colId];
    saveColunas(optionId, next);
  };

  // ── overrides de valor unitário e quantidade (MaterialPricing) ──
  const saveValorUnitario = (optionId: number, valorUnitario: number | null) =>
    savePricing.mutate({ optionId, valorUnitario });
  const saveQtd = (optionId: number, v: QtyValue) =>
    savePricing.mutate({ optionId, qtd: v.qtd, rt: v.rt, unidade: v.unidade });
  /** Qtd de um sub-item de kit NESTA tipologia (null = volta a herdar/pendente). */
  const saveKitItemQtd = (
    ambienteId: number,
    componenteId: number,
    kitItemId: number,
    qtd: number | null
  ) =>
    saveKitQtd.mutate({ tipologiaId: tip.id, ambienteId, componenteId, kitItemId, qtd });

  // ── preenchimento de custo pendente (grava no custo base do empreendimento) ──
  const openFill = (rowKey: string, baseId: number) => {
    const c = custosBase[baseId];
    setFillDraft((p) => ({
      ...p,
      [baseId]:
        p[baseId] ??
        {
          mat: c && (c.custoMat ?? 0) > 0 ? String(c.custoMat) : "",
          mo: c && c.custoMO > 0 ? String(c.custoMO) : "",
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
  /**
   * Grava o custo base DO EMPREENDIMENTO — vale para todas as aplicações deste
   * material aqui, e some da lista de pendências da aba "Custos base".
   */
  const persistBaseCost = (baseId: number, matStr: string, moStr: string) => {
    const custoMat = parseFloat(String(matStr).replace(",", ".")) || 0;
    const custoMO = parseFloat(String(moStr).replace(",", ".")) || 0;
    if (custoMat <= 0) return;
    const c = custosBase[baseId];
    if (c && c.custoMat === custoMat && c.custoMO === custoMO) return;
    saveCustoBase.mutate({ baseId, custoMat, custoMO });
  };
  const commitFill = (rowKey: string, baseId: number) => {
    const d = fillDraft[baseId] ?? { mat: "", mo: "" };
    closeFill(rowKey);
    persistBaseCost(baseId, d.mat, d.mo);
  };
  /**
   * "Sem custo" — ex.: padrão "Não entregue". Zero DECIDIDO (não pendente): o
   * crédito do padrão fica 0 e o material some do portal do terceiro. Desfaz
   * na aba "Custos base".
   */
  const markSemCusto = (baseId: number) =>
    saveCustoBase.mutate({ baseId, custoMat: 0, custoMO: 0 });

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

  // ── publicar ──
  const setPublishPhase = (p: PublishPhase) => {
    publishPhaseRef.current = p;
    setPublishPhaseState(p);
  };
  // O diff/badge é reconciliado com debounce (~700ms após a última edição). Ao
  // abrir o modal, forçar o refetch AGORA para o preview não ficar atrás do que
  // será publicado — se ainda houver gravação em voo, o onSettled dela agenda a
  // reconciliação, que recarrega o diff de novo.
  const openPublishModal = () => {
    if (!projectId) return;
    publishBudget.reset(); // limpa erro de uma tentativa anterior (R4)
    setPublishGateError(null);
    setShowPublishModal(true);
    flushDiff(queryClient, projectId);
  };
  // CONGELA o rascunho no Material (preço + snapshot) e cria a versão. Até aqui
  // nada do que o usuário editou na tabela afetava o preço que está valendo.
  //
  // O publish lê o rascunho DO BANCO (resolveEnterprise), então antes de gravar
  // espera as edições em voo assentarem — uma ainda em trânsito congelaria o
  // valor velho (R1). Se alguma falhou (ou travou), NÃO publica: o banco não
  // tem o que a tela mostrava.
  const handlePublish = async () => {
    const summary = publishSummary.trim();
    if (!summary || !projectId || publishPhaseRef.current !== "idle") return;
    const run = ++publishRunRef.current;
    setPublishGateError(null);
    publishBudget.reset();
    setPublishPhase("waiting");
    try {
      const gate = await waitForSaves(queryClient, projectId);
      if (run !== publishRunRef.current) return; // cancelado durante a espera
      if (gate !== "ok") {
        setPublishGateError(gate);
        return;
      }
      setPublishPhase("sending");
      const v = await publishBudget.mutateAsync({ summary, createdBy: currentUser.name });
      setShowPublishModal(false);
      setPublishSummary("");
      // Fica no Construtor de Preço; o badge vira verde ao reconciliar o diff.
      fireToast(`Orçamento publicado · ${v.label}`);
    } catch {
      // Falha do publish: o banner do modal mostra publishBudget.error.
    } finally {
      if (run === publishRunRef.current) setPublishPhase("idle");
    }
  };
  // Durante a espera o Cancelar aborta (a execução vê o id trocado e para antes
  // de gravar). Depois que o publish foi ao servidor não há como desfazer, então
  // o modal não fecha até a resposta. Fechar limpa o erro da tentativa anterior,
  // senão o banner reapareceria na próxima abertura (R4).
  const closePublishModal = () => {
    if (publishPhaseRef.current === "sending") return;
    publishRunRef.current++;
    setPublishPhase("idle");
    setPublishGateError(null);
    setShowPublishModal(false);
    publishBudget.reset();
  };
  // Padrões pendentes creditam zero — os upgrades sairiam sem o desconto do
  // padrão. Só calcula com o modal aberto (varre todas as tipologias).
  const padroesSemCusto = showPublishModal ? padroesPendentes(deps, tipologias) : [];
  const publishError =
    publishGateError === "failed"
      ? "uma alteração da tabela não foi salva — confira os valores e tente de novo"
      : publishGateError === "timeout"
        ? "as últimas alterações ainda não terminaram de salvar — verifique a conexão e tente de novo"
        : publishBudget.isError
          ? publishBudget.error instanceof Error
            ? publishBudget.error.message
            : "erro inesperado"
          : null;
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
        if (!opt.isDefault && isRowPending(deps, comp, opt)) excludedCount++;
      }
    }
  }

  // Célula de coluna configurável (compartilhada entre linha de material e de
  // kit). O override é gravado em MaterialPricing.colunas — daí a célula ser
  // endereçada pelo optionId, não por uma rowKey de string.
  const renderConfigCell = (
    col: BudgetColumn,
    colIdx: number,
    r: ReturnType<typeof calcAnyRow>,
    optionId: number,
    rowBgClass: string
  ) => {
    const rk = rowKey(optionId);
    if (!r) {
      return (
        <Td key={col.id} right className={cn(rowBgClass, "text-neutral-gray-5")}>
          —
        </Td>
      );
    }
    const result = r.result;
    const cr = result.colResults[col.id];
    const isEditing = editingCell?.rowKey === rk && editingCell.colId === col.id;
    const ovr = cr?.overridden ?? false;

    if (isEditing) {
      const { scope, refs } = buildScopeRefs(cols, result, colIdx);
      const current = pricingOf(deps, optionId).colunas[String(col.id)] ?? col.expr;
      return (
        <Td key={col.id} right className="relative bg-primary-1 !px-[7px] !py-[5px]">
          <FormulaCellEditor
            initial={current}
            scope={scope}
            refs={refs}
            canReset={ovr}
            onSave={(v) => {
              setOverride(optionId, col.id, v);
              setEditingCell(null);
            }}
            onReset={() => {
              clearOverride(optionId, col.id);
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
          onClick={() => setEditingCell({ rowKey: rk, colId: col.id })}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setEditingCell({ rowKey: rk, colId: col.id });
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
              onPublish={openPublishModal}
              onOpenVersions={() => setShowDrawer(true)}
              versionLabel={currentVersion?.label ?? "—"}
            />
          </>
        }
      />

      {/* Toggle Preço final ⇄ Custos base ⇄ Itens de custo */}
      <div className="mb-3.5 flex items-center gap-3.5">
        <div className="inline-flex gap-[3px] rounded-lg border border-neutral-gray-4 bg-neutral-gray-2 p-[3px]">
          {(
            [
              { id: "preco", label: "Preço final", icon: "calculator" },
              { id: "custos", label: "Custos base", icon: "clipboard" },
              { id: "itens", label: "Itens de custo", icon: "box" },
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
            : view === "custos"
              ? "Edite custo de material e mão de obra de cada item"
              : "Insumos da composição e o preço de cada um neste empreendimento"}
        </span>
        <div className="ml-auto">
          <PricingStatusBadge
            diff={diff}
            versionLabel={currentVersion?.label ?? ""}
            onClick={openPublishModal}
          />
        </div>
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

      {/* Abas de tipologia — só na aba "Preço final": o custo base é do
          EMPREENDIMENTO, e uma aba de tipologia ali sugeriria o contrário. */}
      {view === "preco" && (
      <div className="flex border-b-2 border-neutral-gray-4 mb-2">
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
      )}

      {view === "custos" && (
        <CostBaseView
          projectId={projectId}
          rows={custoRows}
          onPersist={(baseId, patch) => saveCustoBase.mutate({ baseId, ...patch })}
        />
      )}

      {view === "itens" && <CostItemsView projectId={projectId} />}

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
                {usaDC && <Th right>Déb./Créd.</Th>}
                <Th right>{usaDC ? "Custo troca" : "Custo total"}</Th>
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
                <Th center teal minW={120}>Total final</Th>
                <Th />
              </tr>
            </thead>
            {tip.ambientes.map((amb, ambIdx) => {
                const total = ambTotals[ambIdx];
                // Mesmas condições dos dois maps abaixo: um componente só
                // aparece na seção padrão se tiver material padrão resolvido, e
                // na de upgrade se tiver ao menos uma opção não-padrão.
                const hasPadrao = amb.componentes.some((c) => {
                  const d = c.options.find((o) => o.id === c.padrao);
                  if (!d) return false;
                  return Boolean(d.isKit ? getKit(kits, d.baseId) : getMaterial(materiais, d.baseId));
                });
                const hasUpgrade = amb.componentes.some((c) =>
                  c.options.some((o) => !o.isDefault)
                );
                return (
                  <tbody key={amb.id}>
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
                        {usaDC
                          ? "Acabamentos padrão — crédito incluído no preço"
                          : "Acabamentos padrão — inclusos no preço base"}
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
                      if (!def) return null;
                      // Kit padrão: o crédito é a soma dos sub-itens na qtd
                      // líquida, e cada sub-item se edita na própria sub-linha.
                      if (def.isKit) {
                        const padKit = getKit(kits, def.baseId);
                        if (!padKit) return null;
                        const key = `pad-${comp.id}`;
                        return (
                          <KitOptionRows
                            key={key}
                            modo="padrao"
                            kit={padKit}
                            comp={comp}
                            opt={def}
                            deps={deps}
                            cols={cols}
                            usaDC={usaDC}
                            tipologia={tip.nome}
                            expanded={!collapsedRows.has(key)}
                            onToggle={() => toggleRow(key)}
                            onSaveQtd={(v) => saveQtd(def.id, v)}
                            onSaveItemQtd={(itemId, q) =>
                              saveKitItemQtd(amb.blueprintRoomId, comp.id, itemId, q)
                            }
                            onFillCost={persistBaseCost}
                            onSemCusto={markSemCusto}
                            onVerItens={() => setView("itens")}
                          />
                        );
                      }
                      const padMat = getMaterial(materiais, def.baseId);
                      if (!padMat) return null;
                      // Valor unitário EFETIVO do padrão: o override da aplicação
                      // vence o custo base do empreendimento. O crédito é o
                      // material que a construtora deixaria de instalar, na
                      // quantidade LÍQUIDA — a RT é perda extra do upgrade.
                      const valUnit = valUnOf(deps, def);
                      const padQtd = qtdOf(deps, comp, def.id);
                      const padPricing = pricingOf(deps, def.id);
                      const bg = "bg-[#f4fffe]";
                      // O material padrão também precisa de custo — igual ao
                      // upgrade, quando pendente a linha destaca e oferece o
                      // preenchimento (inline/expandRow), reutilizando o mesmo
                      // estado de fill. Chave por rowKey(def.id): não colide com
                      // o padKey (colapso) nem com a seção de upgrade.
                      const ownPending = isOptionOwnPending(deps, def);
                      const rk = rowKey(def.id);
                      const filling = fillOpen.has(rk);
                      const inlineFill = ownPending && filling && fillMode === "inline";
                      const draft = fillDraft[def.baseId] ?? { mat: "", mo: "" };
                      const rowBg = ownPending ? "bg-functional-warning-light" : bg;
                      const fillCell = inlineFill ? "bg-primary-1" : rowBg;
                      // Crédito do padrão: valor unitário × qtd líquida (sem RT).
                      const credito = valUnit * padQtd;
                      const padCusto = custosBase[def.baseId];
                      // Pendente por material sem cotação ≠ por insumo da
                      // composição sem preço: a dica muda, e "Sem custo" só faz
                      // sentido no primeiro caso.
                      const padSemCusto = ownPending && (padCusto?.custoMat ?? null) === null;
                      const padInsumos = ownPending ? linhasPendentesOf(custosBase, def.baseId) : [];
                      // Composição do custo base aberta sob a linha (só leitura),
                      // estendida pela qtd do crédito; com valor unitário
                      // sobreposto ela é só informativa.
                      const padOverridden = padPricing.valorUnitario != null;
                      const padComposicao = composicaoSubRows(
                        padCusto,
                        padQtd,
                        unidadeOf(deps, comp, def.id)
                      ).map((c) => ({ ...c, credito: true }));
                      const padChildren = padOverridden ? noteOverride(padComposicao) : padComposicao;
                      const padKey = `pad-${comp.id}`;
                      const padExpanded = !collapsedRows.has(padKey);
                      return (
                        <React.Fragment key={padKey}>
                          <tr className="group/row">
                            <Td sticky className={rowBg}>
                              <div className="flex items-start gap-1.5">
                                {padChildren.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => toggleRow(padKey)}
                                    title={padExpanded ? "Recolher composição" : "Expandir composição"}
                                    className="mt-px text-neutral-gray-7"
                                  >
                                    <Icon name={padExpanded ? "chevD" : "chevR"} size={15} />
                                  </button>
                                )}
                                <div className="flex-1">
                                  <div
                                    className={cn(
                                      "text-xs font-semibold",
                                      ownPending ? "text-tint-amber-fg" : "text-neutral-gray-9"
                                    )}
                                  >
                                    {padMat.nome}
                                  </div>
                                  <div
                                    className={cn(
                                      "mt-px text-[11px]",
                                      ownPending ? "text-[#b45309]" : "text-neutral-gray-6"
                                    )}
                                  >
                                    {comp.nome} · {padMat.fabricante}
                                    {padSemCusto && (
                                      <span className="ml-1.5 font-bold text-tint-orange-fg">
                                        · Aguardando custo
                                      </span>
                                    )}
                                    <InsumoPendenteHint linhas={padInsumos} onVer={() => setView("itens")} />
                                  </div>
                                  {padSemCusto && !inlineFill && !(filling && fillMode === "expandRow") && (
                                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => openFill(rk, def.baseId)}
                                        className="inline-flex items-center gap-[5px] rounded-full border border-primary-7 bg-white px-2.5 py-1 text-[11px] font-bold text-primary-7"
                                      >
                                        <Icon name="plus" size={12} /> Preencher custo base
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => markSemCusto(def.baseId)}
                                        title="Nada é entregue no padrão (ex.: “Não entregue”): o crédito fica zero e o upgrade sai pelo valor cheio."
                                        className="inline-flex items-center rounded-full border border-neutral-gray-5 bg-white px-2.5 py-1 text-[11px] font-bold text-neutral-gray-8 hover:border-neutral-gray-6"
                                      >
                                        Sem custo
                                      </button>
                                    </div>
                                  )}
                                </div>
                                {ownPending && (
                                  <Icon name="warning" size={13} className="text-tint-orange-fg" />
                                )}
                              </div>
                            </Td>
                            <Td right className={cn(fillCell, "text-neutral-gray-7")}>
                              {inlineFill ? (
                                <span className="text-[9.5px] font-bold uppercase tracking-wide text-primary-7">
                                  Custo base →
                                </span>
                              ) : (
                                <QtyPopover
                                  qtd={padQtd}
                                  rt={rtOf(deps, comp, def.id)}
                                  unidade={unidadeOf(deps, comp, def.id)}
                                  herdado={{ qtd: comp.qtd, rt: comp.rt, unidade: comp.unidade }}
                                  overridden={
                                    padPricing.qtd != null ||
                                    padPricing.rt != null ||
                                    padPricing.unidade != null
                                  }
                                  // O crédito é calculado sem RT, então mostrar a
                                  // qtd com RT aqui não bateria com a coluna ao lado.
                                  comRT={false}
                                  onSave={(v) => saveQtd(def.id, v)}
                                />
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
                                    onChange={(v) => setDraftField(def.baseId, "mat", v)}
                                    onEnter={() => commitFill(rk, def.baseId)}
                                    onEscape={() => closeFill(rk)}
                                  />
                                </div>
                              ) : (
                                <UnitCostCell
                                  value={valUnit}
                                  base={custoBaseOf(custosBase, def.baseId)}
                                  overridden={padPricing.valorUnitario != null}
                                  pending={ownPending}
                                  onSave={(v) => saveValorUnitario(def.id, v)}
                                />
                              )}
                            </Td>
                            {usaDC && (
                              <Td right className={fillCell}>
                                {inlineFill ? (
                                  <div className="flex flex-col items-end gap-0.5">
                                    <span className="text-[8.5px] font-bold tracking-wide text-primary-7">
                                      CUSTO MO
                                    </span>
                                    <FillInput
                                      value={draft.mo}
                                      onChange={(v) => setDraftField(def.baseId, "mo", v)}
                                      onEnter={() => commitFill(rk, def.baseId)}
                                      onEscape={() => closeFill(rk)}
                                    />
                                  </div>
                                ) : ownPending ? (
                                  <span className="text-neutral-gray-5">—</span>
                                ) : (
                                  <span className="font-semibold text-functional-success">
                                    Créd. {fmtBRL(credito)}
                                  </span>
                                )}
                              </Td>
                            )}
                            <Td right className={cn(fillCell, "text-neutral-gray-5")}>
                              {inlineFill ? (
                                <div className="flex justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => commitFill(rk, def.baseId)}
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
                              ) : (
                                "—"
                              )}
                            </Td>
                            {cols.map((col) => (
                              <Td key={col.id} right className={cn(rowBg, "text-neutral-gray-5")}>
                                —
                              </Td>
                            ))}
                            <Td className={rowBg} />
                            <Td right className={cn(rowBg, "text-neutral-gray-5")}>—</Td>
                            <Td right className={cn(rowBg, "text-neutral-gray-5")}>—</Td>
                          </tr>
                          {padExpanded &&
                            padChildren.map((c, ci) => (
                              <SubRow
                                key={`${padKey}-${c.key}`}
                                cells={c}
                                isLast={ci === padChildren.length - 1}
                                cols={cols}
                                usaDebitoCredito={usaDC}
                                dimmed={padOverridden}
                              />
                            ))}
                          {ownPending && filling && fillMode === "expandRow" && (
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
                                      {padMat.nome} · {comp.nome}
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
                                      onChange={(v) => setDraftField(def.baseId, "mat", v)}
                                      onEnter={() => commitFill(rk, def.baseId)}
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
                                      onChange={(v) => setDraftField(def.baseId, "mo", v)}
                                      onEnter={() => commitFill(rk, def.baseId)}
                                      onEscape={() => closeFill(rk)}
                                    />
                                  </label>
                                  <div className="flex-1" />
                                  <Button variant="bordered" size="sm" onPress={() => closeFill(rk)}>
                                    Cancelar
                                  </Button>
                                  <Button size="sm" icon="check" onPress={() => commitFill(rk, def.baseId)}>
                                    Salvar custo base
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}

                    <tr>
                      <td
                        colSpan={colCount}
                        className="bg-[#fff7ed] px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[#c2410c]"
                      >
                        {usaDC
                          ? "Acabamentos personalizados — débito cobrado do cliente"
                          : "Acabamentos personalizados — custo cobrado do cliente"}
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

                        // ── KIT: linha principal + sub-itens editáveis ──
                        if (opt.isKit) {
                          const kit = getKit(kits, opt.baseId);
                          if (!kit) return null;
                          const rr = calcAnyRow(deps, comp, opt);
                          const r = rr?.kind === "kit" ? rr.result : null;
                          const kitBg = r && !r.pending ? "bg-[#fbf6ff]" : "bg-functional-warning-light";
                          const kitCmts = commentThreads[rk] ?? [];
                          return (
                            <KitOptionRows
                              key={rk}
                              modo="upgrade"
                              kit={kit}
                              comp={comp}
                              opt={opt}
                              deps={deps}
                              cols={cols}
                              usaDC={usaDC}
                              tipologia={tip.nome}
                              expanded={!collapsedRows.has(rk)}
                              onToggle={() => toggleRow(rk)}
                              result={r}
                              configCells={cols.map((col, colIdx) =>
                                renderConfigCell(col, colIdx, r && !r.pending ? rr : null, opt.id, kitBg)
                              )}
                              commentCell={
                                <CommentTd
                                  count={kitCmts.length}
                                  onOpen={() =>
                                    setOpenThread({
                                      key: rk,
                                      especificacao: kit.nome,
                                      ambiente: amb.nome,
                                      componente: comp.nome,
                                    })
                                  }
                                  className={kitBg}
                                />
                              }
                              onSaveQtd={(v) => saveQtd(opt.id, v)}
                              onSaveItemQtd={(itemId, q) =>
                                saveKitItemQtd(amb.blueprintRoomId, comp.id, itemId, q)
                              }
                              onFillCost={persistBaseCost}
                              onSemCusto={markSemCusto}
                              onVerItens={() => setView("itens")}
                            />
                          );
                        }

                        // ── MATERIAL: linha + preenchimento de custo base ──
                        const upgMat = getMaterial(materiais, opt.baseId);
                        if (!upgMat) return null;
                        // Pendente = o custo base desta opção está incompleto:
                        // material sem cotação OU insumo da composição sem
                        // preço. A dica distingue os dois — no segundo caso o
                        // material está preenchido e a correção é na aba
                        // "Itens de custo", não aqui.
                        const pending = isOptionOwnPending(deps, opt);
                        const optPricing = pricingOf(deps, opt.id);
                        const custo = custosBase[opt.baseId];
                        const matSemCusto = pending && (custo?.custoMat ?? null) === null;
                        const insumosPendentes = pending ? linhasPendentesOf(custosBase, opt.baseId) : [];
                        const rr = pending ? null : calcAnyRow(deps, comp, opt);
                        const r = rr?.kind === "material" ? rr.result : null;
                        const rowBg = pending ? "bg-functional-warning-light" : "bg-white";
                        const cmts = commentThreads[rk] ?? [];
                        const filling = fillOpen.has(rk);
                        const inlineFill = pending && filling && fillMode === "inline";
                        const draft = fillDraft[opt.baseId] ?? { mat: "", mo: "" };
                        const fillCell = inlineFill ? "bg-primary-1" : rowBg;
                        // Composição do custo base aberta sob a linha (só
                        // leitura), estendida pela qtd com RT — de onde saiu o
                        // valor unitário. Com valor sobreposto é só informativa.
                        const qtdComRT =
                          qtdOf(deps, comp, opt.id) * (1 + rtOf(deps, comp, opt.id) / 100);
                        const overridden = optPricing.valorUnitario != null;
                        const composicao = composicaoSubRows(
                          custo,
                          qtdComRT,
                          unidadeOf(deps, comp, opt.id)
                        );
                        const matChildren = overridden ? noteOverride(composicao) : composicao;
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
                                      title={matExpanded ? "Recolher composição" : "Expandir composição"}
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
                                      {matSemCusto && (
                                        <span className="ml-1.5 font-bold text-tint-orange-fg">
                                          · Aguardando custo
                                        </span>
                                      )}
                                      <InsumoPendenteHint linhas={insumosPendentes} onVer={() => setView("itens")} />
                                    </div>
                                    {matSemCusto && !inlineFill && !(filling && fillMode === "expandRow") && (
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
                                </div>
                              </Td>
                              <Td right className={cn(fillCell, "text-neutral-gray-7")}>
                                {inlineFill ? (
                                  <span className="text-[9.5px] font-bold uppercase tracking-wide text-primary-7">
                                    Custo base →
                                  </span>
                                ) : (
                                  <QtyPopover
                                    qtd={qtdOf(deps, comp, opt.id)}
                                    rt={rtOf(deps, comp, opt.id)}
                                    unidade={unidadeOf(deps, comp, opt.id)}
                                    herdado={{ qtd: comp.qtd, rt: comp.rt, unidade: comp.unidade }}
                                    overridden={
                                      optPricing.qtd != null ||
                                      optPricing.rt != null ||
                                      optPricing.unidade != null
                                    }
                                    comRT
                                    onSave={(v) => saveQtd(opt.id, v)}
                                  />
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
                                ) : (
                                  <UnitCostCell
                                    value={valUnOf(deps, opt)}
                                    base={custoBaseOf(custosBase, opt.baseId)}
                                    overridden={overridden}
                                    pending={pending}
                                    onSave={(v) => saveValorUnitario(opt.id, v)}
                                  />
                                )}
                              </Td>
                              {usaDC && (
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
                                      Déb. {fmtBRL(r.debitoTotal)}
                                    </span>
                                  ) : (
                                    "—"
                                  )}
                                </Td>
                              )}
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
                                renderConfigCell(col, colIdx, pending ? null : rr, opt.id, rowBg)
                              )}
                              <Td className={rowBg} />
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
                                  usaDebitoCredito={usaDC}
                                  dimmed={overridden}
                                />
                              ))}
                            {pending && filling && fillMode === "expandRow" && (
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
                        colSpan={(usaDC ? 6 : 5) + cols.length}
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
                  </tbody>
                );
              })}

            <tbody>
              <tr>
                <td
                  colSpan={(usaDC ? 6 : 5) + cols.length}
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
        onClose={closePublishModal}
        title="Publicar orçamento"
        actions={
          <>
            <Button
              variant="bordered"
              onPress={closePublishModal}
              isDisabled={publishPhase === "sending"}
            >
              Cancelar
            </Button>
            <Button
              icon="upload"
              onPress={() => void handlePublish()}
              isDisabled={publishSummary.trim() === "" || publishPhase !== "idle"}
              isLoading={publishPhase !== "idle"}
            >
              Publicar orçamento
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3.5">
          <p className="text-[13px] text-neutral-gray-7">
            Os preços abaixo passam a valer e ficam congelados: editar custo ou fórmula depois
            disso não muda mais o que foi publicado, até a próxima publicação.
          </p>
          <PublishDiffList diff={diff} />
          {padroesSemCusto.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-functional-warning/40 bg-functional-warning-light px-3 py-2.5">
              <Icon name="warning" size={13} className="mt-0.5 shrink-0 text-tint-orange-fg" />
              <div className="text-[12px] text-neutral-gray-9">
                <p>
                  <strong>
                    {padroesSemCusto.length}{" "}
                    {padroesSemCusto.length === 1
                      ? "componente com material padrão pendente"
                      : "componentes com material padrão pendente"}
                  </strong>{" "}
                  — os upgrades serão publicados sem o crédito do padrão.
                </p>
                <p className="mt-1 text-neutral-gray-7">
                  {padroesSemCusto
                    .slice(0, 4)
                    .map((p) => `${p.ambiente} · ${p.componente}`)
                    .join(", ")}
                  {padroesSemCusto.length > 4 && ` +${padroesSemCusto.length - 4}`}
                </p>
                <p className="mt-1 text-neutral-gray-7">
                  Se nada é entregue no padrão, marque-o como “Sem custo” na aba Custos base.
                </p>
              </div>
            </div>
          )}
          <Textarea
            label="Resumo das alterações *"
            value={publishSummary}
            onValueChange={setPublishSummary}
            placeholder="Ex: revisão de custos após retorno da construtora, novas opções de piso adicionadas…"
          />
          {publishError && (
            <div className="flex items-start gap-2 rounded-lg border border-functional-error/30 bg-functional-error-light px-3 py-2">
              <Icon name="warning" size={13} className="mt-0.5 shrink-0 text-functional-error" />
              <p className="text-[12px] text-functional-error">
                Não foi possível publicar: {publishError}. Nenhuma alteração foi aplicada.
              </p>
            </div>
          )}
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
