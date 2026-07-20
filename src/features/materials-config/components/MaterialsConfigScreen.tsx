"use client";

import React from "react";
import { useRouter } from "next/navigation";

import {
  Button,
  Card,
  EmptyState,
  Icon,
  LoadingState,
  MaterialThumb,
  Modal,
  PageHeader,
  StatusBadge,
} from "@/components/ui";
import { MaterialImageModal } from "@/features/catalog";
import { getMaterial, getOptionEntity } from "@/lib/data/entities";
import { useKits } from "@/lib/hooks/useKits";
import { useMateriais } from "@/lib/hooks/useMateriais";
import { useProject } from "@/lib/hooks/useProjects";
import {
  useAddUpgrade,
  useRemoveUpgrade,
  useSetKitQtds,
  useSetPadrao,
} from "@/lib/hooks/useTipologiaMutations";
import { useTipologia } from "@/lib/hooks/useTipologias";
import { useSelection } from "@/lib/store/selection";
import { fmtBRL, fmtNum } from "@/lib/utils";
import { KitBadge } from "@/features/catalog/components/KitBadge";
import type { Material, Unidade } from "@/shared/types/domain";

import { SelectEntityModal, type SelectionResult } from "./SelectEntityModal";

function SubItemRow({
  mat,
  qty,
  unidade,
}: {
  mat: Material;
  qty: number | undefined;
  /** Unidade do sub-item do kit (KitItem.unidade — o material não tem unidade). */
  unidade: Unidade;
}) {
  return (
    <div className="relative flex items-center gap-2.5 py-1.5 pl-3.5">
      <span className="absolute bottom-0 left-[3px] top-0 w-px bg-neutral-gray-5" />
      <span className="text-xs text-neutral-gray-6">·</span>
      <div className="flex-1">
        <span className="text-xs font-semibold text-neutral-gray-9">{mat.nome}</span>
        <code className="ml-2 text-[10px] text-neutral-gray-6">{mat.codigo}</code>
        {qty !== undefined && (
          <span className="mt-px block text-[11px] text-primary-7">
            {fmtNum(qty, 2)} {unidade}
          </span>
        )}
      </div>
    </div>
  );
}

// Tela 7 — Configuração de materiais por componente (protótipo:
// MaterialsConfigScreen). Grava padrão/upgrades/kitQtds no store.
export function MaterialsConfigScreen({
  tipologiaId,
  componenteId,
}: {
  tipologiaId: string;
  componenteId: string;
}) {
  const router = useRouter();
  const compId = Number(componenteId);
  const { data: tipologia, isLoading } = useTipologia(Number(tipologiaId));
  const { data: materiais = [] } = useMateriais();
  const { data: kits = [] } = useKits();
  const activeProjectId = useSelection((s) => s.activeProjectId);
  const { data: project } = useProject(activeProjectId);

  const setPadraoMut = useSetPadrao();
  const addUpgradeMut = useAddUpgrade();
  const removeUpgradeMut = useRemoveUpgrade();
  const setKitQtdsMut = useSetKitQtds();

  const [modal, setModal] = React.useState<"padrao" | "upgrade" | null>(null);
  const [expandedUpg, setExpandedUpg] = React.useState<Set<number>>(new Set());
  const [removeTarget, setRemoveTarget] = React.useState<number | null>(null);
  const [clearPadrao, setClearPadrao] = React.useState(false);
  const [imageTarget, setImageTarget] = React.useState<Material | null>(null);
  const seededExpandRef = React.useRef(false);

  const found = React.useMemo(() => {
    if (!tipologia) return null;
    for (const amb of tipologia.ambientes) {
      const comp = amb.componentes.find((c) => c.id === compId);
      if (comp) return { amb, comp };
    }
    return null;
  }, [tipologia, compId]);

  React.useEffect(() => {
    if (seededExpandRef.current || !found) return;
    seededExpandRef.current = true;
    setExpandedUpg(
      new Set(
        found.comp.options.filter((o) => !o.isDefault && o.isKit).map((o) => o.id)
      )
    );
  }, [found]);

  if (isLoading) return <LoadingState label="Carregando componente…" />;
  if (!tipologia || !found) {
    return (
      <div className="mx-auto max-w-4xl">
        <EmptyState
          icon="box"
          title="Componente não encontrado"
          subtitle="O componente pode ter sido removido."
          action={
            <Button variant="bordered" onPress={() => router.push("/tipologias")}>
              ← Voltar às tipologias
            </Button>
          }
        />
      </div>
    );
  }

  const { amb, comp } = found;
  const qtdComRT = comp.qtd * (1 + comp.rt / 100);
  const def = comp.options.find((o) => o.isDefault) ?? null;
  const padrao = def ? getOptionEntity(materiais, kits, def) : null;
  // "" = sem padrão definido → o modal de seleção mostra todas as categorias.
  const compCat = padrao?.categoria ?? "";
  const kitQtds = comp.kitQtds ?? {};
  const upgrades = comp.options.filter((o) => !o.isDefault);
  const path = {
    tipologiaId: tipologia.id,
    ambienteId: amb.blueprintRoomId,
    componenteId: comp.id,
  };
  const removeOpt =
    removeTarget !== null ? comp.options.find((o) => o.id === removeTarget) ?? null : null;
  const removeEnt = removeOpt ? getOptionEntity(materiais, kits, removeOpt) : null;

  const toggleUpg = (id: number) =>
    setExpandedUpg((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const applySelection = (result: SelectionResult) => {
    const finish = () => setModal(null);
    const after = () => {
      if (modal === "padrao") {
        setPadraoMut.mutate({ ...path, padraoBaseId: result.id }, { onSuccess: finish });
      } else {
        addUpgradeMut.mutate(
          { ...path, baseId: result.id },
          {
            onSuccess: (updated) => {
              if (result.kitQtds) {
                const added = updated.options.find(
                  (o) => !o.isDefault && o.baseId === result.id
                );
                if (added) setExpandedUpg((prev) => new Set(prev).add(added.id));
              }
              finish();
            },
          }
        );
      }
    };
    if (result.kitQtds) {
      setKitQtdsMut.mutate({ ...path, qtds: result.kitQtds }, { onSuccess: after });
    } else {
      after();
    }
  };

  const usedIds = new Set(comp.options.map((o) => o.baseId));
  const excludeIds =
    modal === "upgrade" ? usedIds : new Set(def ? [def.baseId] : []);

  const mutating =
    setPadraoMut.isPending ||
    addUpgradeMut.isPending ||
    setKitQtdsMut.isPending;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        breadcrumb={[
          { label: "Empreendimentos", href: "/dashboard" },
          { label: project?.nome ?? "Projeto" },
          { label: "Tipologias", href: "/tipologias" },
          { label: tipologia.nome },
          { label: comp.nome },
        ]}
        title={`${comp.nome} — configuração de materiais`}
        subtitle={`${tipologia.nome} · Quantidade: ${fmtNum(comp.qtd)} ${comp.unidade}${
          comp.rt > 0 ? ` (${fmtNum(qtdComRT)} ${comp.unidade} com RT ${comp.rt}%)` : ""
        }`}
        action={
          <Button variant="bordered" onPress={() => router.push("/tipologias")}>
            ← Voltar às tipologias
          </Button>
        }
      />

      {/* ── Material padrão ── */}
      <Card className="mb-4">
        <div className="mb-3.5 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-gray-11">Material padrão</h3>
            <p className="mt-0.5 text-xs text-neutral-gray-7">
              Entregue sem custo adicional. Gera crédito se o cliente optar por upgrade.
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" icon="edit" onPress={() => setModal("padrao")}>
              {padrao ? "Trocar padrão" : "Definir padrão"}
            </Button>
            {padrao && (
              <Button
                variant="ghost"
                size="sm"
                icon="trash"
                aria-label="Remover material padrão"
                onPress={() => setClearPadrao(true)}
              />
            )}
          </div>
        </div>
        {padrao && !padrao.isKit && (
          <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 rounded-lg border border-primary-7 bg-primary-1 px-4 py-3">
            <button
              type="button"
              title="Editar imagem"
              onClick={() => setImageTarget(padrao)}
              className="rounded-lg transition-opacity hover:opacity-80"
            >
              <MaterialThumb url={padrao.imagem?.url} alt={padrao.nome} size={40} />
            </button>
            <div>
              <p className="text-[13px] font-bold text-primary-8">{padrao.nome}</p>
              <p className="mt-0.5 text-[11px] text-primary-7">
                {padrao.codigo} · {padrao.fabricante}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-primary-8">
                {fmtBRL(padrao.custoMat)}/{comp.unidade}
              </p>
              {padrao.custoMO > 0 && (
                <p className="mt-0.5 text-[11px] text-primary-7">
                  MO: {fmtBRL(padrao.custoMO)}/{comp.unidade}
                </p>
              )}
            </div>
            <StatusBadge status="preenchido" />
          </div>
        )}
        {padrao && padrao.isKit && (
          <div className="rounded-lg border border-primary-7 bg-primary-1 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="h-2.5 w-2.5 rounded-full bg-primary-7" />
              <p className="flex-1 text-[13px] font-bold text-primary-8">{padrao.nome}</p>
              <KitBadge />
              <span className="text-[11px] text-primary-7">{padrao.itens.length} itens</span>
            </div>
            <div className="mt-2 border-t border-primary-7/20 pt-2">
              {padrao.itens.map((it) => {
                const m = getMaterial(materiais, it.materialId);
                if (!m) return null;
                return <SubItemRow key={it.id} mat={m} qty={kitQtds[it.id]} unidade={it.unidade} />;
              })}
            </div>
          </div>
        )}
        {!padrao && (
          <EmptyState
            icon="box"
            title="Sem material padrão"
            subtitle="Defina o material entregue sem custo adicional"
          />
        )}
      </Card>

      {/* ── Opções de upgrade ── */}
      <Card>
        <div className="mb-3.5 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-gray-11">Opções de upgrade</h3>
            <p className="mt-0.5 text-xs text-neutral-gray-7">
              Materiais ou kits disponíveis para personalização paga
            </p>
          </div>
          <Button variant="bordered" size="sm" icon="plus" onPress={() => setModal("upgrade")}>
            Adicionar opção
          </Button>
        </div>
        {upgrades.length === 0 ? (
          <EmptyState
            icon="box"
            title="Nenhuma opção de upgrade configurada"
            subtitle="Adicione materiais ou kits do catálogo para oferecer como upgrade"
          />
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-neutral-gray-4">
                {["Especificação", "Fabricante", "Custo material", "Custo MO", "Status", ""].map(
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
              {upgrades.map((opt) => {
                const ent = getOptionEntity(materiais, kits, opt);
                if (!ent) return null;
                if (ent.isKit) {
                  const open = expandedUpg.has(opt.id);
                  return (
                    <React.Fragment key={opt.id}>
                      <tr className="border-b border-neutral-gray-4 last:border-b-0">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => toggleUpg(opt.id)} className="flex">
                              <Icon
                                name={open ? "chevD" : "chevR"}
                                size={15}
                                className="text-neutral-gray-7"
                              />
                            </button>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-[13px] font-bold text-neutral-gray-11">
                                  {ent.nome}
                                </p>
                                <KitBadge />
                              </div>
                              <code className="text-[10px] text-neutral-gray-6">
                                {ent.codigo} · {ent.itens.length} itens
                              </code>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-[13px] text-neutral-gray-8">
                          {ent.itens.length} sub-itens
                        </td>
                        <td
                          className="px-3 py-2.5 text-[13px] text-neutral-gray-5"
                          title="Custo calculado pela soma dos sub-itens na revisão de custos"
                        >
                          —
                        </td>
                        <td className="px-3 py-2.5 text-[13px] text-neutral-gray-5">—</td>
                        <td className="px-3 py-2.5">
                          <StatusBadge status="preenchido" label="Kit" />
                        </td>
                        <td className="px-3 py-2.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon="trash"
                            aria-label="Excluir kit"
                            onPress={() => setRemoveTarget(opt.id)}
                          />
                        </td>
                      </tr>
                      {open && (
                        <tr className="border-b border-neutral-gray-4 last:border-b-0">
                          <td colSpan={6} className="bg-neutral-gray-2 px-6 pb-2.5 pt-0.5">
                            {ent.itens.map((it) => {
                              const m = getMaterial(materiais, it.materialId);
                              if (!m) return null;
                              return (
                                <SubItemRow
                                  key={it.id}
                                  mat={m}
                                  qty={kitQtds[it.id]}
                                  unidade={it.unidade}
                                />
                              );
                            })}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                }
                return (
                  <tr key={opt.id} className="border-b border-neutral-gray-4 last:border-b-0">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          title="Editar imagem"
                          onClick={() => setImageTarget(ent)}
                          className="rounded-lg transition-opacity hover:opacity-80"
                        >
                          <MaterialThumb url={ent.imagem?.url} alt={ent.nome} size={36} />
                        </button>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-neutral-gray-11">
                            {ent.nome}
                          </p>
                          <code className="text-[10px] text-neutral-gray-6">{ent.codigo}</code>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[13px] text-neutral-gray-8">
                      {ent.fabricante}
                    </td>
                    <td className="px-3 py-2.5 text-[13px] font-semibold text-neutral-gray-11">
                      {ent.custoMat > 0 ? (
                        fmtBRL(ent.custoMat)
                      ) : (
                        <span className="font-normal text-neutral-gray-5">Aguardando</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-[13px] text-neutral-gray-11">
                      {ent.custoMO > 0 ? (
                        fmtBRL(ent.custoMO)
                      ) : (
                        <span className="text-neutral-gray-5">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={ent.custoMat > 0 ? "preenchido" : "pendente"} />
                    </td>
                    <td className="px-3 py-2.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon="trash"
                        aria-label="Excluir material"
                        onPress={() => setRemoveTarget(opt.id)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <SelectEntityModal
        open={modal !== null}
        mode={modal ?? "upgrade"}
        onClose={() => setModal(null)}
        onConfirm={applySelection}
        categoria={compCat}
        unidade={comp.unidade}
        materiais={materiais}
        kits={kits}
        excludeIds={excludeIds}
        existingKitQtds={kitQtds}
        compNome={comp.nome}
        tipNome={tipologia.nome}
        confirming={mutating}
      />

      <Modal
        open={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        title="Remover opção de upgrade"
        width={420}
        actions={
          <>
            <Button variant="bordered" onPress={() => setRemoveTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              isLoading={removeUpgradeMut.isPending}
              onPress={() => {
                if (removeTarget === null) return;
                removeUpgradeMut.mutate(
                  { ...path, optionId: removeTarget },
                  { onSuccess: () => setRemoveTarget(null) }
                );
              }}
            >
              Remover
            </Button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-neutral-gray-9">
          Remover{" "}
          <strong>
            {removeEnt?.nome ?? (removeTarget !== null ? String(removeTarget) : "")}
          </strong>{" "}
          das opções de upgrade deste componente?
        </p>
      </Modal>

      <Modal
        open={clearPadrao}
        onClose={() => setClearPadrao(false)}
        title="Remover material padrão"
        width={420}
        actions={
          <>
            <Button variant="bordered" onPress={() => setClearPadrao(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              isLoading={setPadraoMut.isPending}
              onPress={() =>
                setPadraoMut.mutate(
                  { ...path, padraoBaseId: null },
                  { onSuccess: () => setClearPadrao(false) }
                )
              }
            >
              Remover
            </Button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-neutral-gray-9">
          Remover <strong>{padrao?.nome}</strong> como material padrão de{" "}
          <strong>{comp.nome}</strong>? O componente ficará sem padrão e as opções de upgrade
          deixarão de gerar crédito até que um novo padrão seja definido.
        </p>
      </Modal>

      <MaterialImageModal material={imageTarget} onClose={() => setImageTarget(null)} />
    </div>
  );
}
