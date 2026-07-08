"use client";

import React from "react";
import { useRouter } from "next/navigation";

import { Button, Icon, LoadingState, PageHeader, StatusBadge } from "@/components/ui";
import { upgradeKey } from "@/lib/budget";
import { getMaterial } from "@/lib/data/entities";
import { SEED_ACTIVE_PROJECT_ID } from "@/lib/data/seed";
import { useCommentThreads } from "@/lib/hooks/useComments";
import { useMateriais, useUpdateMaterial } from "@/lib/hooks/useMateriais";
import { useProject } from "@/lib/hooks/useProjects";
import { useTipologias } from "@/lib/hooks/useTipologias";
import { useSelection } from "@/lib/store/selection";
import { cn, fmtBRL, fmtNum } from "@/lib/utils";
import {
  EditableCell,
  type CostOverrides,
  type EditCellRef,
} from "@/features/construtor-shared/EditableCell";
import { CommentThreadPanel, type ThreadRow } from "@/features/construtor-shared/CommentThreadPanel";
import { LinkFillModal } from "@/features/construtor-shared/LinkFillModal";
import type { Comment, Tipologia } from "@/shared/types/domain";

interface ReviewRow {
  key: string;
  matId: string;
  ambiente: string;
  componente: string;
  especificacao: string;
  fabricante: string;
  custoMat: number;
  custoMO: number;
  custoTotal: number;
  /** Variação % do valor editado vs o original do catálogo. */
  varPct: number;
  isModified: boolean;
  pendente: boolean;
  comentarios: Comment[];
}

/** Linhas da tabela: um upgrade (material) por linha, agrupado por ambiente. */
function buildRows(
  tip: Tipologia,
  materiais: ReturnType<typeof useMateriais>["data"],
  overrides: CostOverrides,
  threads: Record<string, Comment[]>
): ReviewRow[] {
  const rows: ReviewRow[] = [];
  for (const amb of tip.ambientes) {
    for (const comp of amb.componentes) {
      for (const uid of comp.upgrades) {
        const mat = getMaterial(materiais ?? [], uid);
        if (!mat) continue; // kits ficam de fora da revisão (custos são dos sub-itens)
        const key = upgradeKey(comp.id, mat.id);
        const ov = overrides[key] ?? {};
        const custoMat = ov.mat != null ? parseFloat(ov.mat) || 0 : mat.custoMat;
        const custoMO = ov.mo != null ? parseFloat(ov.mo) || 0 : mat.custoMO;
        const custoTotal = custoMat + custoMO;
        const origTotal = mat.custoMat + mat.custoMO;
        const varPct = origTotal > 0 ? ((custoTotal - origTotal) / origTotal) * 100 : 0;
        const isModified = ov.mat != null || ov.mo != null;
        rows.push({
          key,
          matId: mat.id,
          ambiente: amb.nome,
          componente: comp.nome,
          especificacao: mat.nome,
          fabricante: mat.fabricante,
          custoMat,
          custoMO,
          custoTotal,
          varPct,
          isModified,
          pendente: custoMat <= 0,
          comentarios: threads[key] ?? [],
        });
      }
    }
  }
  return rows;
}

function Th({
  children,
  right = false,
  teal = false,
  minW,
}: {
  children?: React.ReactNode;
  right?: boolean;
  teal?: boolean;
  minW?: number;
}) {
  return (
    <th
      style={{ minWidth: minW }}
      className={cn(
        "whitespace-nowrap px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider",
        right ? "text-right" : "text-left",
        teal ? "bg-primary-1 text-primary-7" : "text-neutral-gray-7"
      )}
    >
      {children}
    </th>
  );
}

// Tela 8 — Revisão de custos (protótipo: CostReviewScreen). Edição inline
// persiste no catálogo ao salvar; variação compara com o valor original.
export function CostReviewScreen() {
  const router = useRouter();
  const activeProjectId = useSelection((s) => s.activeProjectId);
  const { data: project } = useProject(activeProjectId ?? SEED_ACTIVE_PROJECT_ID);
  const { data: tipologias = [], isLoading: tipsLoading } = useTipologias();
  const { data: materiais = [] } = useMateriais();
  const { data: threads = {} } = useCommentThreads();
  const updateMaterial = useUpdateMaterial();

  const [tipFilter, setTipFilter] = React.useState<string | null>(null);
  const [openThread, setOpenThread] = React.useState<string | null>(null);
  const [editCell, setEditCell] = React.useState<EditCellRef | null>(null);
  const [overrides, setOverrides] = React.useState<CostOverrides>({});
  const [saved, setSaved] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [showLink, setShowLink] = React.useState(false);
  const savedTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(
    () => () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    },
    []
  );

  const tip = tipologias.find((t) => t.id === tipFilter) ?? tipologias[0] ?? null;
  if (tipsLoading) return <LoadingState label="Carregando revisão de custos…" />;
  if (!tip) return null;

  const rows = buildRows(tip, materiais, overrides, threads);
  const modifiedCount = Object.keys(overrides).filter((k) => {
    const ov = overrides[k];
    return ov && (ov.mat != null || ov.mo != null);
  }).length;
  const pendingCount = rows.filter((r) => r.pendente).length;
  const threadRow = openThread ? rows.find((r) => r.key === openThread) : null;

  // Persiste os overrides no catálogo (updateMaterial) e limpa a edição.
  const handleSave = async () => {
    const patches = new Map<string, { custoMat?: number; custoMO?: number }>();
    for (const [rowKey, ov] of Object.entries(overrides)) {
      if (!ov || (ov.mat == null && ov.mo == null)) continue;
      const row = rows.find((r) => r.key === rowKey);
      // Override de outra tipologia: resolve o material pelo sufixo da chave.
      const matId = row?.matId ?? materiais.find((m) => rowKey.endsWith(`-${m.id}`))?.id;
      if (!matId) continue;
      const patch = patches.get(matId) ?? {};
      if (ov.mat != null) patch.custoMat = parseFloat(ov.mat) || 0;
      if (ov.mo != null) patch.custoMO = parseFloat(ov.mo) || 0;
      patches.set(matId, patch);
    }
    try {
      await Promise.all(
        Array.from(patches.entries()).map(([id, patch]) =>
          updateMaterial.mutateAsync({ id, patch })
        )
      );
    } catch (e: unknown) {
      // Ex.: empreendimento publicado — o store é somente leitura (Fase 9).
      setSaveError(e instanceof Error ? e.message : "Não foi possível salvar.");
      return;
    }
    setSaveError(null);
    setOverrides({});
    setEditCell(null);
    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader
        breadcrumb={[
          { label: "Empreendimentos", href: "/dashboard" },
          { label: project?.nome ?? "Projeto" },
          { label: "Revisão de custos" },
        ]}
        title="Revisão de custos"
        subtitle="Edite os valores diretamente na tabela ou gere um link para preenchimento por um terceiro"
        action={
          <>
            {saved && (
              <span className="flex items-center gap-1 text-xs text-functional-success">
                <Icon name="check" size={13} /> Salvo
              </span>
            )}
            {saveError && (
              <span className="flex items-center gap-1 text-xs text-functional-error">
                <Icon name="warning" size={13} /> {saveError}
              </span>
            )}
            {modifiedCount > 0 && !saved && (
              <Button
                variant="teal"
                icon="check"
                onPress={() => void handleSave()}
                isLoading={updateMaterial.isPending}
              >
                Salvar {modifiedCount} {modifiedCount === 1 ? "alteração" : "alterações"}
              </Button>
            )}
            <Button variant="bordered" icon="share" onPress={() => setShowLink(true)}>
              Gerar link de preenchimento
            </Button>
            <Button onPress={() => router.push("/orcamento")}>Ir para orçamento →</Button>
          </>
        }
      />

      {/* Abas de tipologia */}
      <div className="flex border-b-2 border-neutral-gray-4">
        {tipologias.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTipFilter(t.id);
              setEditCell(null);
              setOpenThread(null);
            }}
            className={cn(
              "-mb-0.5 border-b-2 px-5 py-2.5 text-[13px] transition-colors",
              t.id === tip.id
                ? "border-primary-7 font-bold text-primary-7"
                : "border-transparent text-neutral-gray-8"
            )}
          >
            {t.nome}
            <span
              className={cn(
                "ml-1.5 text-[11px]",
                t.id === tip.id ? "text-primary-7" : "text-neutral-gray-6"
              )}
            >
              {t.unidades} un.
            </span>
          </button>
        ))}
      </div>

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: openThread ? "1fr 360px" : "1fr" }}
      >
        <div className="rounded-b-lg border border-t-0 border-neutral-gray-4 bg-white">
          {/* Barra de dica */}
          <div className="flex items-center justify-between gap-4 border-b border-neutral-gray-4 bg-neutral-gray-1 px-4 py-2">
            <div className="flex items-center gap-1.5">
              <Icon name="edit" size={13} className="text-primary-7" />
              <span className="text-xs font-semibold text-primary-7">
                Clique em qualquer valor de custo para editar
              </span>
              {modifiedCount > 0 && (
                <span className="text-xs text-neutral-gray-7">
                  · {modifiedCount} campo{modifiedCount > 1 ? "s" : ""} modificado
                  {modifiedCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
            {pendingCount > 0 && (
              <div className="flex items-center gap-1.5">
                <Icon name="warning" size={13} className="text-functional-warning" />
                <span className="text-xs text-tint-orange-fg">
                  {pendingCount} {pendingCount > 1 ? "itens" : "item"} sem custo
                </span>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-neutral-gray-4 bg-neutral-gray-2">
                  <Th minW={160}>Componente</Th>
                  <Th minW={200}>Especificação</Th>
                  <Th right teal>Custo mat.</Th>
                  <Th right teal>Custo MO</Th>
                  <Th right>Total</Th>
                  <Th right>Variação</Th>
                  <Th>Status</Th>
                  <th className="w-10 px-2 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, ri) => {
                  const isOpen = openThread === r.key;
                  const highVar = r.isModified && Math.abs(r.varPct) >= 15;
                  return (
                    <React.Fragment key={r.key}>
                      {(ri === 0 || rows[ri - 1]?.ambiente !== r.ambiente) && (
                        <tr>
                          <td
                            colSpan={8}
                            className="border-b border-neutral-gray-4 bg-neutral-gray-2 px-3.5 pb-1 pt-[7px] text-[11px] font-bold uppercase tracking-wider text-neutral-gray-7"
                          >
                            {r.ambiente}
                          </td>
                        </tr>
                      )}
                      <tr
                        className={cn(
                          "border-b border-neutral-gray-4 transition-colors",
                          isOpen
                            ? "bg-primary-1"
                            : r.isModified
                              ? "bg-primary-1/70"
                              : highVar
                                ? "bg-[#fff7ed]"
                                : "bg-white"
                        )}
                      >
                        <td className="px-3.5 py-2.5">
                          <span className="text-xs font-semibold text-neutral-gray-11">
                            {r.componente}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-xs font-semibold text-neutral-gray-11">
                            {r.especificacao.length > 34
                              ? r.especificacao.substring(0, 34) + "…"
                              : r.especificacao}
                          </span>
                          <span className="block text-[11px] text-neutral-gray-6">
                            {r.fabricante}
                          </span>
                        </td>
                        <td className={cn("py-1 pl-0 pr-1", r.isModified && "bg-primary-1/40")}>
                          <EditableCell
                            rowKey={r.key}
                            field="mat"
                            value={getMaterial(materiais, r.matId)?.custoMat ?? 0}
                            editCell={editCell}
                            setEditCell={setEditCell}
                            overrides={overrides}
                            setOverrides={setOverrides}
                          />
                        </td>
                        <td className={cn("py-1 pl-0 pr-1", r.isModified && "bg-primary-1/40")}>
                          <EditableCell
                            rowKey={r.key}
                            field="mo"
                            value={getMaterial(materiais, r.matId)?.custoMO ?? 0}
                            editCell={editCell}
                            setEditCell={setEditCell}
                            overrides={overrides}
                            setOverrides={setOverrides}
                          />
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right text-xs font-bold text-neutral-gray-11">
                          {fmtBRL(r.custoTotal)}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {r.isModified && r.varPct !== 0 ? (
                            <span
                              className={cn(
                                "whitespace-nowrap text-xs font-bold",
                                r.varPct > 0 ? "text-functional-error" : "text-functional-success"
                              )}
                            >
                              {r.varPct > 0 ? "+" : ""}
                              {fmtNum(r.varPct, 1)}%
                            </span>
                          ) : (
                            <span className="text-[11px] text-neutral-gray-4">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusBadge
                            status={highVar ? "variacao_alta" : r.pendente ? "pendente" : "preenchido"}
                          />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            aria-label="Comentários"
                            onClick={() => setOpenThread(isOpen ? null : r.key)}
                            className={cn(
                              "inline-flex items-center gap-[3px] rounded px-1.5 py-1",
                              r.comentarios.length > 0 && "bg-functional-warning-light"
                            )}
                          >
                            <Icon
                              name="chat"
                              size={14}
                              className={
                                r.comentarios.length > 0
                                  ? "text-functional-warning"
                                  : "text-neutral-gray-5"
                              }
                            />
                            {r.comentarios.length > 0 && (
                              <span className="text-[10px] font-bold text-functional-warning">
                                {r.comentarios.length}
                              </span>
                            )}
                          </button>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {openThread && threadRow && (
          <div className="sticky top-[88px] self-start">
            <CommentThreadPanel
              row={
                {
                  key: threadRow.key,
                  especificacao: threadRow.especificacao,
                  ambiente: threadRow.ambiente,
                  componente: threadRow.componente,
                } satisfies ThreadRow
              }
              onClose={() => setOpenThread(null)}
            />
          </div>
        )}
      </div>

      <LinkFillModal open={showLink} onClose={() => setShowLink(false)} />
    </div>
  );
}
