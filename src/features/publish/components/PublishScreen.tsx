"use client";

import React from "react";
import { useRouter } from "next/navigation";

import { Button, Card, Icon, LoadingState, Modal, PageHeader, StatusBadge } from "@/components/ui";
import { calcBudgetRow, upgradeKey } from "@/lib/budget";
import { getMaterial } from "@/lib/data/entities";
import { SEED_ACTIVE_PROJECT_ID } from "@/lib/data/seed";
import { useBudgetColumns } from "@/lib/hooks/useBudgetColumns";
import { useMateriais } from "@/lib/hooks/useMateriais";
import { usePendingItems } from "@/lib/hooks/usePendingItems";
import { useProject, usePublishProject } from "@/lib/hooks/useProjects";
import { useTipologias } from "@/lib/hooks/useTipologias";
import { useSelection } from "@/lib/store/selection";
import { cn, fmtBRL } from "@/lib/utils";
import { NUKI_EMAIL, nukiWhatsAppUrl } from "@/shared/constants/contact";
import type { Material, Tipologia } from "@/shared/types/domain";

/** Item do checklist: ok (verde) ou pendência (âmbar — não há estado de erro). */
interface ChecklistItem {
  label: string;
  ok: boolean;
}

function ChecklistRow({ item }: { item: ChecklistItem }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg border px-3 py-[9px]",
        item.ok
          ? "border-functional-success/30 bg-functional-success-light"
          : "border-functional-warning/40 bg-functional-warning-light"
      )}
    >
      <div
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
          item.ok ? "bg-functional-success" : "bg-functional-warning"
        )}
      >
        <Icon name={item.ok ? "check" : "warning"} size={11} className="text-white" />
      </div>
      <span
        className={cn(
          "text-[13px]",
          item.ok ? "text-functional-success" : "font-semibold text-tint-orange-fg"
        )}
      >
        {item.label}
      </span>
    </div>
  );
}

// Tela 11 — Publicação (protótipo: PublishScreen). Min/máx reais via
// calcBudgetRow (excluindo pendências); publicar trava o store (read-only).
export function PublishScreen() {
  const router = useRouter();
  const activeProjectId = useSelection((s) => s.activeProjectId);
  const projectId = activeProjectId ?? SEED_ACTIVE_PROJECT_ID;
  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: tipologias = [] } = useTipologias();
  const { data: materiais = [] } = useMateriais();
  const { data: pendingSet = new Set<string>() } = usePendingItems();
  const { data: cols = [] } = useBudgetColumns(projectId);
  const publish = usePublishProject();

  const [showConfirm, setShowConfirm] = React.useState(false);

  if (projectLoading) return <LoadingState label="Carregando publicação…" />;
  if (!project) return null;

  const resolve = (id: string): Material | undefined => getMaterial(materiais, id);

  // Preço mín./máx. por tipologia sobre os upgrades com custo (kits ficam de
  // fora, como no protótipo — o preço deles depende dos quantitativos).
  const tipSummary = tipologias.map((tip: Tipologia) => {
    const totals: number[] = [];
    for (const amb of tip.ambientes) {
      for (const comp of amb.componentes) {
        for (const uid of comp.upgrades) {
          const mat = getMaterial(materiais, uid);
          if (!mat) continue;
          if (pendingSet.has(upgradeKey(comp.id, uid))) continue;
          const r = calcBudgetRow(resolve, mat, comp.padrao, comp.qtd, comp.rt, cols, {});
          if (r) totals.push(r.total);
        }
      }
    }
    return {
      ...tip,
      minPreco: totals.length > 0 ? Math.min(...totals) : 0,
      maxPreco: totals.length > 0 ? Math.max(...totals) : 0,
      totalUpgrades: totals.length,
    };
  });

  // Pendências reais por tipologia (chaves de linha e de sub-item de kit).
  const pendingByTip = tipologias
    .map((tip) => {
      const compIds = new Set(
        tip.ambientes.flatMap((amb) => amb.componentes.map((c) => c.id))
      );
      const count = [...pendingSet].filter((key) =>
        [...compIds].some((cid) => key.startsWith(`${cid}-`))
      ).length;
      return { tip, count };
    })
    .filter((e) => e.count > 0);

  const revisaoOk = project.status === "em_revisao" || project.status === "publicado";
  const checklist: ChecklistItem[] = [
    { label: `${tipologias.length} tipologias configuradas`, ok: tipologias.length > 0 },
    { label: "Tabela de orçamento revisada", ok: true },
    { label: `${cols.length} colunas de cálculo ativas`, ok: cols.length > 0 },
    { label: "Revisão de custos concluída", ok: revisaoOk },
    ...(pendingByTip.length > 0
      ? pendingByTip.map(({ tip, count }) => ({
          label: `${tip.nome} — ${count} ${count === 1 ? "item" : "itens"} sem custo`,
          ok: false,
        }))
      : [{ label: "Nenhum item sem custo", ok: true }]),
  ];

  const taxLabel = cols.map((c) => c.nome).join(" · ");

  // ── Publicado: estado de sucesso (derivado do status do projeto) ──
  if (project.status === "publicado") {
    return (
      <div className="mx-auto max-w-[800px]">
        <div className="px-6 py-16 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-functional-success-light">
            <Icon name="check_circle" size={44} className="text-functional-success" />
          </div>
          <h2 className="mb-3 text-[26px] font-bold text-neutral-gray-11">
            Orçamento publicado!
          </h2>
          <p className="mb-2 text-sm text-neutral-gray-7">
            A configuração de <strong className="text-neutral-gray-11">{project.nome}</strong> foi
            finalizada. Entre em contato com a equipe Nuki para dar sequência à personalização das
            unidades.
          </p>
          {project.publicadoEm && (
            <p className="mb-9 text-[13px] text-neutral-gray-6">
              Publicado em {project.publicadoEm.replace(" ", " às ")} por {project.incorporadora}
            </p>
          )}
          <div className="flex justify-center gap-3">
            <Button variant="bordered" onPress={() => router.push("/dashboard")}>
              Ver empreendimentos
            </Button>
            <Button
              variant="teal"
              icon="chat"
              onPress={() =>
                window.open(
                  nukiWhatsAppUrl(
                    `Olá! Finalizei a configuração do empreendimento ${project.nome} no Nuki Planner.`
                  ),
                  "_blank",
                  "noopener"
                )
              }
            >
              Falar com a Nuki no WhatsApp
            </Button>
          </div>
          <p className="mt-4 text-xs text-neutral-gray-6">
            ou escreva para{" "}
            <a href={`mailto:${NUKI_EMAIL}`} className="text-primary-7 underline">
              {NUKI_EMAIL}
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[900px]">
      <PageHeader
        breadcrumb={[
          { label: "Empreendimentos", href: "/dashboard" },
          { label: project.nome },
          { label: "Publicação" },
        ]}
        title="Publicação do orçamento"
        subtitle="Revise e publique a configuração finalizada do empreendimento"
        action={
          <Button variant="bordered" onPress={() => router.push("/orcamento")}>
            ← Revisar orçamento
          </Button>
        }
      />

      <Card className="mb-5">
        <h3 className="mb-4 text-sm font-bold text-neutral-gray-11">Resumo por tipologia</h3>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-neutral-gray-4">
              {["Tipologia", "Unidades", "Upgrades", "Preço mín.", "Preço máx.", "Status"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-neutral-gray-7"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {tipSummary.map((t) => (
              <tr key={t.id} className="border-b border-neutral-gray-4">
                <td className="px-3 py-[11px] text-[13px] font-bold text-neutral-gray-11">
                  {t.nome}
                </td>
                <td className="px-3 py-[11px] text-[13px] text-neutral-gray-8">{t.unidades}</td>
                <td className="px-3 py-[11px] text-[13px] text-neutral-gray-8">
                  {t.totalUpgrades} itens
                </td>
                <td className="px-3 py-[11px] text-[13px] text-neutral-gray-11">
                  {fmtBRL(t.minPreco)}
                </td>
                <td className="px-3 py-[11px] text-sm font-bold text-primary-7">
                  {fmtBRL(t.maxPreco)}
                </td>
                <td className="px-3 py-[11px]">
                  <StatusBadge status={t.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="mb-5">
        <h3 className="mb-4 text-sm font-bold text-neutral-gray-11">
          Checklist de pré-publicação
        </h3>
        <div className="flex flex-col gap-2">
          {checklist.map((item, i) => (
            <ChecklistRow key={i} item={item} />
          ))}
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="bordered" size="lg" onPress={() => router.push("/orcamento")}>
          Revisar orçamento
        </Button>
        <Button size="lg" icon="upload" onPress={() => setShowConfirm(true)}>
          Publicar orçamento
        </Button>
      </div>

      <Modal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Confirmar publicação"
        actions={
          <>
            <Button variant="bordered" onPress={() => setShowConfirm(false)}>
              Cancelar
            </Button>
            <Button
              icon="upload"
              isLoading={publish.isPending}
              onPress={() =>
                publish.mutate(projectId, { onSuccess: () => setShowConfirm(false) })
              }
            >
              Confirmar e publicar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-neutral-gray-8">
            Você está prestes a publicar a configuração de{" "}
            <strong className="text-neutral-gray-11">{project.nome}</strong>.
          </p>
          <div className="flex items-start gap-2.5 rounded-lg bg-functional-warning-light px-4 py-3">
            <Icon name="warning" size={16} className="mt-0.5 shrink-0 text-functional-warning" />
            <p className="text-xs text-tint-orange-fg">
              Após a publicação, o empreendimento ficará em modo somente leitura. Para fazer
              alterações, será necessário criar uma nova revisão.
            </p>
          </div>
          <div className="rounded-lg bg-neutral-gray-2 px-4 py-3">
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-gray-7">
              Resumo
            </p>
            <p className="text-xs text-neutral-gray-8">
              {tipologias.length} tipologias · Colunas de cálculo: {taxLabel}
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
