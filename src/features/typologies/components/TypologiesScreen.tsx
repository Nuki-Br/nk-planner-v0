"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import {
  Button,
  Card,
  EmptyState,
  LoadingState,
  Modal,
  PageHeader,
  ProgressBar,
  StatusBadge,
} from "@/components/ui";
import { useKits } from "@/lib/hooks/useKits";
import { useMateriais } from "@/lib/hooks/useMateriais";
import { useProject } from "@/lib/hooks/useProjects";
import {
  useCloneAmbiente,
  useCreateAmbiente,
  useDeleteAmbiente,
  useDuplicateTipologia,
  useLinkAmbiente,
  useReorderAmbientes,
  useReorderComponentes,
  useSharedInfo,
  useUpdateAmbiente,
  useUpdateComponente,
} from "@/lib/hooks/useTipologiaMutations";
import { useTipologias } from "@/lib/hooks/useTipologias";
import { useUnitGroups } from "@/lib/hooks/useUnitGroups";
import { useSelection } from "@/lib/store/selection";
import { cn } from "@/lib/utils";
import { UnitGroupsDrawer } from "@/features/unit-groups/components/UnitGroupsDrawer";
import type { Ambiente, Componente, Tipologia } from "@/shared/types/domain";

import { guessAmbIcon } from "../ambIcons";
import { AmbienteAccordion, type SharedBadgeInfo } from "./AmbienteAccordion";
import { AddAmbienteChooser } from "./modals/AddAmbienteChooser";
import { AddComponenteModal } from "./modals/AddComponenteModal";
import { AmbienteModal, type AmbienteFormValue } from "./modals/AmbienteModal";
import { EditComponentModal, type ComponentEditValue } from "./modals/EditComponentModal";
import { EditTypologyModal } from "./modals/EditTypologyModal";
import { LinkAmbienteModal } from "./modals/LinkAmbienteModal";
import { NewTipologiaModal } from "./modals/NewTipologiaModal";

const totalComps = (tip: Tipologia) =>
  tip.ambientes.reduce((a, b) => a + b.componentes.length, 0);
const configuredComps = (tip: Tipologia) =>
  tip.ambientes.reduce(
    (a, b) => a + b.componentes.filter((c) => c.options.some((o) => !o.isDefault)).length,
    0
  );

// Tela 3 — Tipologias e componentes (protótipo: TypologiesScreen).
// Master-detail: lista de tipologias à esquerda, acordeão de ambientes →
// componentes à direita, com drag para reordenar (@dnd-kit) persistindo no
// store via reorderAmbientes/reorderComponentes.
export function TypologiesScreen() {
  const router = useRouter();
  const { data: tipologias = [], isLoading: tipsLoading } = useTipologias();
  const { data: materiais = [] } = useMateriais();
  const { data: kits = [] } = useKits();
  const { data: unitGroups = [] } = useUnitGroups();
  const { data: sharedInfo } = useSharedInfo();
  const activeProjectId = useSelection((s) => s.activeProjectId);
  const setSelectedTipologia = useSelection((s) => s.setSelectedTipologia);
  const { data: project } = useProject(activeProjectId);

  // Seleção: default = TIPOLOGIAS[1] como no protótipo (Planta B).
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const selectedTip =
    tipologias.find((t) => t.id === selectedId) ?? tipologias[1] ?? tipologias[0] ?? null;

  const [expandedRooms, setExpandedRooms] = React.useState<number[]>([]);
  const bootstrappedRef = React.useRef(false);
  React.useEffect(() => {
    if (bootstrappedRef.current || !selectedTip) return;
    bootstrappedRef.current = true;
    setExpandedRooms(selectedTip.ambientes.slice(0, 2).map((a) => a.id));
  }, [selectedTip]);

  React.useEffect(() => {
    if (selectedTip) setSelectedTipologia(selectedTip.id);
  }, [selectedTip, setSelectedTipologia]);

  // Modais
  const [showAddTip, setShowAddTip] = React.useState(false);
  const [showEditTip, setShowEditTip] = React.useState(false);
  const [showUnitGroups, setShowUnitGroups] = React.useState(false);
  const [ambModal, setAmbModal] = React.useState<{ mode: "add" | "edit"; amb: Ambiente | null } | null>(null);
  const [deleteAmb, setDeleteAmb] = React.useState<Ambiente | null>(null);
  const [addChooser, setAddChooser] = React.useState(false);
  const [linkModal, setLinkModal] = React.useState(false);
  const [addCompAmb, setAddCompAmb] = React.useState<Ambiente | null>(null);
  const [editComp, setEditComp] = React.useState<{ amb: Ambiente; comp: Componente; ordem: number } | null>(null);

  // Mutations
  const duplicateTip = useDuplicateTipologia();
  const createAmbiente = useCreateAmbiente();
  const updateAmbiente = useUpdateAmbiente();
  const deleteAmbiente = useDeleteAmbiente();
  const cloneAmbiente = useCloneAmbiente();
  const reorderAmbientes = useReorderAmbientes();
  const reorderComponentes = useReorderComponentes();
  const updateComponente = useUpdateComponente();
  const linkAmbiente = useLinkAmbiente();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  if (tipsLoading) return <LoadingState label="Carregando tipologias…" />;
  if (!selectedTip)
    return (
      <EmptyState
        icon="layers"
        title="Nenhuma tipologia ainda"
        subtitle="Crie um empreendimento para começar o planejamento das tipologias."
        action={
          <Button variant="teal" icon="plus" onPress={() => router.push("/config-base")}>
            Novo empreendimento
          </Button>
        }
      />
    );
  const tip = selectedTip;

  const toggleRoom = (id: number) =>
    setExpandedRooms((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // ── Compartilhamento ──
  const ambShared = sharedInfo?.ambShared ?? {};
  const sharedReg = sharedInfo?.sharedReg ?? {};
  const tipNameById = (id: string) => tipologias.find((t) => String(t.id) === id)?.nome ?? id;
  const getSourceSid = (roomId: number) => ambShared[String(roomId)] ?? String(roomId);
  const sharedInfoFor = (roomId: number): SharedBadgeInfo | null => {
    const sid = ambShared[String(roomId)];
    if (sid === undefined) return null;
    const reg = sharedReg[sid];
    if (!reg || reg.tips.length < 2) return null;
    return {
      allNames: reg.tips.map(tipNameById),
      otherNames: reg.tips.filter((id) => id !== String(tip.id)).map(tipNameById),
    };
  };
  const linkedShareIds = new Set(
    tip.ambientes
      .map((a) => ambShared[String(a.id)])
      .filter((sid): sid is string => sid !== undefined)
  );

  // ── Handlers ──
  const handleAmbDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = tip.ambientes.map((a) => a.blueprintRoomId);
    const from = ids.indexOf(Number(active.id));
    const to = ids.indexOf(Number(over.id));
    if (from < 0 || to < 0) return;
    reorderAmbientes.mutate({ tipologiaId: tip.id, orderedIds: arrayMove(ids, from, to) });
  };

  const saveAmbiente = (value: AmbienteFormValue) => {
    if (ambModal?.mode === "edit" && ambModal.amb) {
      updateAmbiente.mutate(
        {
          tipologiaId: tip.id,
          ambienteId: ambModal.amb.blueprintRoomId,
          patch: { nome: value.nome, icon: value.icon, imagem: value.imagem },
        },
        { onSuccess: () => setAmbModal(null) }
      );
    } else {
      createAmbiente.mutate(
        { tipologiaId: tip.id, input: { nome: value.nome, icon: value.icon, imagem: value.imagem } },
        {
          onSuccess: (a) => {
            setExpandedRooms((r) => [...r, a.id]);
            setAmbModal(null);
          },
        }
      );
    }
  };

  const saveComponentEdit = (value: ComponentEditValue) => {
    if (!editComp) return;
    updateComponente.mutate(
      {
        tipologiaId: tip.id,
        ambienteId: editComp.amb.blueprintRoomId,
        componenteId: editComp.comp.id,
        patch: value,
      },
      { onSuccess: () => setEditComp(null) }
    );
  };

  const handleLink = (_srcTip: Tipologia, srcAmb: Ambiente) => {
    linkAmbiente.mutate(
      { targetTipologiaId: tip.id, srcAmbienteId: srcAmb.blueprintRoomId },
      {
        onSuccess: (a) => {
          setExpandedRooms((r) => [...r, a.id]);
          setLinkModal(false);
        },
      }
    );
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        breadcrumb={[
          { label: "Empreendimentos", href: "/dashboard" },
          { label: project?.nome ?? "Projeto" },
          { label: "Tipologias" },
        ]}
        title="Tipologias e componentes"
        subtitle="Defina as plantas, ambientes e pontos de personalização"
        action={
          <>
            <Button variant="bordered" icon="building" onPress={() => setShowUnitGroups(true)}>
              Grupos de unidades
            </Button>
            <Button
              variant="bordered"
              icon="share"
              onPress={() => router.push(`/tipologias/${tip.id}/canvas`)}
            >
              Visualizador
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        {/* ── Lista de tipologias ── */}
        <div className="flex flex-col gap-2">
          {tipologias.map((t) => {
            const sel = t.id === tip.id;
            const cfg = configuredComps(t);
            const tot = totalComps(t);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedId(t.id)}
                className={cn(
                  "rounded-lg bg-white px-4 py-3.5 text-left transition-colors",
                  sel ? "border-2 border-primary-7" : "border border-neutral-gray-5"
                )}
              >
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      "text-[13px] font-bold",
                      sel ? "text-primary-7" : "text-neutral-gray-11"
                    )}
                  >
                    {t.nome}
                  </span>
                  <StatusBadge status={t.status} />
                </div>
                <p className="mb-2 text-[11px] leading-snug text-neutral-gray-7">{t.descricao}</p>
                <div className="mb-2 flex gap-3 text-[11px] text-neutral-gray-7">
                  <span>
                    <strong className="text-neutral-gray-11">{t.unidades}</strong> unidades
                  </span>
                  <span>
                    <strong className="text-neutral-gray-11">
                      {cfg}/{tot}
                    </strong>{" "}
                    comps.
                  </span>
                </div>
                <ProgressBar value={cfg} max={tot} />
              </button>
            );
          })}
          <Button variant="bordered" size="sm" icon="plus" fullWidth onPress={() => setShowAddTip(true)}>
            Nova tipologia
          </Button>
        </div>

        {/* ── Detalhe da tipologia ── */}
        <Card padding={0} className="min-h-[400px]">
          <div className="flex items-center justify-between border-b border-neutral-gray-3 px-5 py-4">
            <div>
              <h3 className="text-base font-bold text-neutral-gray-11">{tip.nome}</h3>
              <p className="mt-[3px] text-xs text-neutral-gray-7">{tip.descricao}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-gray-7">{tip.unidades} unidades</span>
              <Button
                variant="bordered"
                size="sm"
                icon="copy"
                isLoading={duplicateTip.isPending}
                onPress={() =>
                  duplicateTip.mutate(tip.id, { onSuccess: (t) => setSelectedId(t.id) })
                }
              >
                Duplicar
              </Button>
              <Button variant="ghost" size="sm" icon="edit" onPress={() => setShowEditTip(true)}>
                Editar
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-neutral-gray-3 px-5 py-2.5">
            <span className="text-[11px] font-semibold text-neutral-gray-7">
              Grupos de unidades:
            </span>
            {unitGroups.map((g) => (
              <span
                key={g.id}
                className="rounded-full border border-neutral-gray-5 bg-neutral-gray-2 px-2.5 py-[3px] text-[11px] text-neutral-gray-8"
              >
                {g.nome}
              </span>
            ))}
            <button
              type="button"
              onClick={() => setShowUnitGroups(true)}
              className="rounded-full border border-dashed border-neutral-gray-5 px-2.5 py-[3px] text-[11px] text-neutral-gray-7 transition-colors hover:border-primary-7 hover:text-primary-7"
            >
              + Novo grupo
            </button>
          </div>

          <div className="px-5 py-3">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleAmbDragEnd}
            >
              <SortableContext
                items={tip.ambientes.map((a) => a.blueprintRoomId)}
                strategy={verticalListSortingStrategy}
              >
                {tip.ambientes.map((amb) => (
                  <AmbienteAccordion
                    key={amb.id}
                    amb={amb}
                    open={expandedRooms.includes(amb.id)}
                    shared={sharedInfoFor(amb.id)}
                    materiais={materiais}
                    kits={kits}
                    onToggle={() => toggleRoom(amb.id)}
                    onEditAmb={(a) => setAmbModal({ mode: "edit", amb: a })}
                    onCloneAmb={(a) =>
                      cloneAmbiente.mutate({ tipologiaId: tip.id, ambienteId: a.blueprintRoomId })
                    }
                    onDeleteAmb={setDeleteAmb}
                    onAddComp={setAddCompAmb}
                    onEditComp={(a, c, ordem) => setEditComp({ amb: a, comp: c, ordem })}
                    onConfigComp={(c) =>
                      router.push(`/tipologias/${tip.id}/componente/${c.id}`)
                    }
                    onReorderComps={(a, orderedIds) =>
                      reorderComponentes.mutate({
                        tipologiaId: tip.id,
                        ambienteId: a.blueprintRoomId,
                        orderedIds,
                      })
                    }
                  />
                ))}
              </SortableContext>
            </DndContext>
            <div className="mt-2">
              <Button variant="ghost" size="sm" icon="plus" onPress={() => setAddChooser(true)}>
                Adicionar ambiente
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Modais ── */}
      <NewTipologiaModal
        open={showAddTip}
        onClose={() => setShowAddTip(false)}
        onCreated={(t) => setSelectedId(t.id)}
      />

      <EditTypologyModal
        key={tip.id}
        open={showEditTip}
        onClose={() => setShowEditTip(false)}
        tip={tip}
        unitGroups={unitGroups.map((g) => g.nome)}
      />

      <AddAmbienteChooser
        open={addChooser}
        onClose={() => setAddChooser(false)}
        onCreateNew={() => {
          setAddChooser(false);
          setAmbModal({ mode: "add", amb: null });
        }}
        onLink={() => {
          setAddChooser(false);
          setLinkModal(true);
        }}
      />

      <LinkAmbienteModal
        open={linkModal}
        onClose={() => setLinkModal(false)}
        currentTip={tip}
        tipologias={tipologias}
        linkedShareIds={linkedShareIds}
        getSourceSid={getSourceSid}
        onPick={handleLink}
      />

      <AmbienteModal
        open={ambModal !== null}
        mode={ambModal?.mode ?? "add"}
        initial={
          ambModal?.amb
            ? {
                nome: ambModal.amb.nome,
                icon: ambModal.amb.icon ?? guessAmbIcon(ambModal.amb.nome),
                imagem: ambModal.amb.imagem ?? null,
              }
            : null
        }
        onClose={() => setAmbModal(null)}
        onSave={saveAmbiente}
        saving={createAmbiente.isPending || updateAmbiente.isPending}
      />

      <Modal
        open={deleteAmb !== null}
        onClose={() => setDeleteAmb(null)}
        title="Excluir ambiente"
        width={420}
        actions={
          <>
            <Button variant="bordered" onPress={() => setDeleteAmb(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              isLoading={deleteAmbiente.isPending}
              onPress={() => {
                if (!deleteAmb) return;
                deleteAmbiente.mutate(
                  { tipologiaId: tip.id, ambienteId: deleteAmb.blueprintRoomId },
                  { onSuccess: () => setDeleteAmb(null) }
                );
              }}
            >
              Excluir
            </Button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-neutral-gray-9">
          Tem certeza que deseja excluir o ambiente <strong>{deleteAmb?.nome}</strong>? Os{" "}
          {deleteAmb?.componentes.length ?? 0} componente(s) deste ambiente também serão removidos.
          Esta ação não pode ser desfeita.
        </p>
      </Modal>

      <AddComponenteModal
        open={addCompAmb !== null}
        onClose={() => setAddCompAmb(null)}
        tipologiaId={tip.id}
        ambiente={addCompAmb}
        materiais={materiais}
        kits={kits}
      />

      <EditComponentModal
        key={editComp ? `${editComp.amb.id}-${editComp.comp.id}` : "none"}
        open={editComp !== null}
        comp={editComp?.comp ?? null}
        ambNome={editComp?.amb.nome ?? ""}
        defaultOrdem={editComp?.ordem ?? 1}
        onClose={() => setEditComp(null)}
        onSave={saveComponentEdit}
        saving={updateComponente.isPending}
      />

      <UnitGroupsDrawer
        open={showUnitGroups}
        onClose={() => setShowUnitGroups(false)}
        empreendimento={project?.nome ?? "Empreendimento"}
      />
    </div>
  );
}
