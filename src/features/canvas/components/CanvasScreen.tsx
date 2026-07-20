"use client";

import React from "react";
import { useRouter } from "next/navigation";

import { Button, LoadingState, Modal, StatusBadge } from "@/components/ui";
import { buildLayout, CV } from "@/lib/canvas/buildLayout";
import { useKits } from "@/lib/hooks/useKits";
import { useMateriais } from "@/lib/hooks/useMateriais";
import {
  useAddUpgrade,
  useCloneAmbiente,
  useCreateAmbiente,
  useCreateComponente,
  useCreateTipologia,
  useDeleteAmbiente,
  useDeleteComponente,
  useDeleteTipologia,
  useDuplicateTipologia,
  useRemoveUpgrade,
  useReplaceUpgrade,
  useSetPadrao,
  useUpdateAmbiente,
  useUpdateComponente,
  useUpdateTipologia,
} from "@/lib/hooks/useTipologiaMutations";
import { useTipologias } from "@/lib/hooks/useTipologias";
import { cn } from "@/lib/utils";
import { MaterialImageModal } from "@/features/catalog";
import { guessAmbIcon } from "@/features/typologies/ambIcons";
import { AmbienteModal, type AmbienteFormValue } from "@/features/typologies/components/modals/AmbienteModal";
import {
  EditComponentModal,
  type ComponentEditValue,
} from "@/features/typologies/components/modals/EditComponentModal";
import type { Ambiente, Componente, Material, Tipologia, Unidade } from "@/shared/types/domain";

import { useCanvasView } from "../useCanvasView";
import { BlueprintRail } from "./BlueprintRail";
import { EdgesSvg } from "./EdgesSvg";
import { MaterialPicker } from "./MaterialPicker";
import { AddNode, AmbienteNode, ComponenteNode, OptionNode, SubItemNode, type CanvasActions } from "./nodes";
import { PostIt, PresenceStack, usePostIts } from "./PostIts";
import { TipFormModal, type TipFormValue } from "./TipFormModal";
import { Viewport } from "./Viewport";

interface MatPickerState {
  /** blueprintRoomId do ambiente. */
  ambId: number;
  compId: number;
  /** optId (linha de opção) sendo trocado; null = adicionando/padrão. */
  which: number | null;
  isPadrao: boolean;
  title: string;
  subtitle: string;
  /** id de catálogo (baseId) atual, para pré-seleção no picker. */
  currentId: number | null;
}

interface ConfirmState {
  title: string;
  body: React.ReactNode;
  onYes: () => void;
}

const EMPTY_COMP: Componente = {
  id: 0,
  nome: "",
  unidade: "m²",
  instanceId: 0,
  qtd: 0,
  rt: 15,
  padrao: null,
  options: [],
  ghost: false,
  ordem: 1,
  kitQtds: {},
  custoComponentes: [],
  custoQtds: {},
};

// Tela 4 — Visualizador editável (protótipo: TypologyCanvasScreen).
// Diferencial: as edições usam as mutations reais da Fase 5 (persistem no
// store e refletem nas outras telas), não uma cópia local.
export function CanvasScreen({ tipologiaId }: { tipologiaId: string }) {
  const router = useRouter();
  const { data: tipologias = [], isLoading: tipsLoading } = useTipologias();
  const { data: materiais = [] } = useMateriais();
  const { data: kits = [] } = useKits();

  const tipParam = Number(tipologiaId);
  const tip = tipologias.find((t) => t.id === tipParam) ?? tipologias[0] ?? null;

  const [expanded, setExpanded] = React.useState<ReadonlySet<string>>(new Set());
  const [detailed, setDetailed] = React.useState(false);

  // Modais
  const [matPicker, setMatPicker] = React.useState<MatPickerState | null>(null);
  const [ambModal, setAmbModal] = React.useState<{ mode: "add" | "edit"; amb: Ambiente | null } | null>(null);
  const [compModal, setCompModal] = React.useState<{ mode: "add" | "edit"; ambId: number; comp: Componente | null } | null>(null);
  const [tipModal, setTipModal] = React.useState<{ mode: "add" | "edit"; tip: Tipologia | null } | null>(null);
  const [confirm, setConfirm] = React.useState<ConfirmState | null>(null);
  const [imageTarget, setImageTarget] = React.useState<Material | null>(null);

  // Mutations (Fase 5 + replaceUpgrade)
  const createTip = useCreateTipologia();
  const updateTip = useUpdateTipologia();
  const deleteTip = useDeleteTipologia();
  const duplicateTip = useDuplicateTipologia();
  const createAmb = useCreateAmbiente();
  const updateAmb = useUpdateAmbiente();
  const deleteAmb = useDeleteAmbiente();
  const cloneAmb = useCloneAmbiente();
  const createComp = useCreateComponente();
  const updateComp = useUpdateComponente();
  const deleteComp = useDeleteComponente();
  const setPadrao = useSetPadrao();
  const addUpgrade = useAddUpgrade();
  const removeUpgrade = useRemoveUpgrade();
  const replaceUpgrade = useReplaceUpgrade();

  // Post-its (localStorage, single-user)
  const { notes, addNote, changeNote, deleteNote } = usePostIts(tip ? String(tip.id) : "");
  const view = useCanvasView((id, nx, ny) => changeNote(id, { x: nx, y: ny }));

  const layout = React.useMemo(
    () => (tip ? buildLayout(tip, expanded, kits) : null),
    [tip, expanded, kits]
  );

  // fitView na montagem e na troca de tipologia (comportamento do protótipo).
  const layoutHeightRef = React.useRef(600);
  if (layout) layoutHeightRef.current = layout.height;
  const fitRef = React.useRef(view.fitView);
  fitRef.current = view.fitView;
  React.useEffect(() => {
    if (!tip) return;
    fitRef.current(layoutHeightRef.current);
  }, [tip?.id, tip]);

  if (tipsLoading) return <LoadingState label="Carregando canvas…" />;
  if (!tip || !layout) return null;
  const tipId = tip.id;

  const iconFor = (amb: Ambiente) => amb.icon ?? guessAmbIcon(amb.nome);
  const toggleKit = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // ── Ações dos nós ──
  const act: CanvasActions = {
    editImage: (mat) => setImageTarget(mat),
    editAmb: (amb) => setAmbModal({ mode: "edit", amb }),
    addAmb: () => setAmbModal({ mode: "add", amb: null }),
    cloneAmb: (amb) => cloneAmb.mutate({ tipologiaId: tipId, ambienteId: amb.blueprintRoomId }),
    deleteAmb: (amb) =>
      setConfirm({
        title: "Excluir ambiente",
        body: (
          <>
            Excluir o ambiente <strong>{amb.nome}</strong> e seus {amb.componentes.length}{" "}
            componente(s)? Esta ação não pode ser desfeita.
          </>
        ),
        onYes: () => deleteAmb.mutate({ tipologiaId: tipId, ambienteId: amb.blueprintRoomId }),
      }),

    editComp: (ambId, comp) => setCompModal({ mode: "edit", ambId, comp }),
    addComp: (ambId) => setCompModal({ mode: "add", ambId, comp: null }),
    deleteComp: (ambId, comp) =>
      setConfirm({
        title: "Excluir componente",
        body: (
          <>
            Excluir o componente <strong>{comp.nome}</strong> e todas as suas opções de material?
          </>
        ),
        onYes: () =>
          deleteComp.mutate({ tipologiaId: tipId, ambienteId: ambId, componenteId: comp.id }),
      }),

    changeOption: (ambId, comp, optId, isPadrao) => {
      const opt = optId !== null ? comp.options.find((o) => o.id === optId) : undefined;
      setMatPicker({
        ambId,
        compId: comp.id,
        which: optId,
        isPadrao,
        title: isPadrao ? "Material padrão" : "Trocar opção de material",
        subtitle: `${comp.nome} — ${isPadrao ? "material entregue sem custo adicional" : "opção de upgrade"}`,
        currentId: opt?.baseId ?? null,
      });
    },
    addOption: (ambId, comp) =>
      setMatPicker({
        ambId,
        compId: comp.id,
        which: null,
        isPadrao: false,
        title: "Adicionar opção de material",
        subtitle: `${comp.nome} — nova opção de upgrade`,
        currentId: null,
      }),
    deleteOption: (ambId, comp, optId, isPadrao) => {
      const path = { tipologiaId: tipId, ambienteId: ambId, componenteId: comp.id };
      if (isPadrao) setPadrao.mutate({ ...path, padraoBaseId: null });
      else removeUpgrade.mutate({ ...path, optionId: optId });
    },
  };

  const confirmMatPicker = (matId: number) => {
    if (!matPicker) return;
    const path = {
      tipologiaId: tipId,
      ambienteId: matPicker.ambId,
      componenteId: matPicker.compId,
    };
    const close = { onSuccess: () => setMatPicker(null) };
    if (matPicker.isPadrao) setPadrao.mutate({ ...path, padraoBaseId: matId }, close);
    else if (matPicker.which === null) addUpgrade.mutate({ ...path, baseId: matId }, close);
    else replaceUpgrade.mutate({ ...path, optionId: matPicker.which, newBaseId: matId }, close);
  };

  const saveAmbiente = (value: AmbienteFormValue) => {
    if (ambModal?.mode === "edit" && ambModal.amb) {
      updateAmb.mutate(
        {
          tipologiaId: tipId,
          ambienteId: ambModal.amb.blueprintRoomId,
          patch: { nome: value.nome, icon: value.icon },
        },
        { onSuccess: () => setAmbModal(null) }
      );
    } else {
      createAmb.mutate(
        { tipologiaId: tipId, input: { nome: value.nome, icon: value.icon } },
        { onSuccess: () => setAmbModal(null) }
      );
    }
  };

  const saveComp = (value: ComponentEditValue) => {
    if (!compModal) return;
    if (compModal.mode === "edit" && compModal.comp) {
      updateComp.mutate(
        {
          tipologiaId: tipId,
          ambienteId: compModal.ambId,
          componenteId: compModal.comp.id,
          patch: value,
        },
        { onSuccess: () => setCompModal(null) }
      );
    } else {
      createComp.mutate(
        {
          tipologiaId: tipId,
          ambienteId: compModal.ambId,
          input: {
            nome: value.nome || "Novo componente",
            unidade: value.unidade as Unidade,
            qtd: value.qtd,
            rt: value.rt,
          },
        },
        { onSuccess: () => setCompModal(null) }
      );
    }
  };

  // ── Ações do rail ──
  const onTipSave = (value: TipFormValue) => {
    if (tipModal?.mode === "edit" && tipModal.tip) {
      updateTip.mutate({ id: tipModal.tip.id, patch: value }, { onSuccess: () => setTipModal(null) });
    } else {
      createTip.mutate(value, {
        onSuccess: (t) => {
          setTipModal(null);
          router.replace(`/tipologias/${t.id}/canvas`);
        },
      });
    }
  };
  const onTipDuplicate = (t: Tipologia) =>
    duplicateTip.mutate(t.id, {
      onSuccess: (copy) => router.replace(`/tipologias/${copy.id}/canvas`),
    });
  const onTipDelete = (t: Tipologia) =>
    setConfirm({
      title: "Excluir tipologia",
      body: (
        <>
          Excluir a tipologia <strong>{t.nome}</strong> com seus {t.ambientes.length} ambiente(s)?
          Esta ação não pode ser desfeita.
        </>
      ),
      onYes: () =>
        deleteTip.mutate(t.id, {
          onSuccess: () => {
            if (t.id === tipId) {
              const next = tipologias.find((x) => x.id !== t.id);
              if (next) router.replace(`/tipologias/${next.id}/canvas`);
              else router.replace("/tipologias");
            }
          },
        }),
    });

  const handleAddNote = () => {
    const el = view.viewportRef.current;
    if (!el) return;
    const px = (el.clientWidth / 2 - view.x.get()) / view.scale.get() - 92;
    const py = (el.clientHeight / 2 - view.y.get()) / view.scale.get() - 70;
    addNote(px, py);
  };

  return (
    <div className="-m-6 flex h-[calc(100vh-64px)] flex-col bg-neutral-gray-3">
      {/* ── Toolbar ── */}
      <div className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-neutral-gray-3 bg-white px-5">
        <div className="flex min-w-0 items-center gap-3.5">
          <Button variant="ghost" size="sm" icon="back" onPress={() => router.push("/tipologias")}>
            Tipologias
          </Button>
          <div className="h-7 w-px bg-neutral-gray-4" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-[15px] font-bold text-neutral-gray-11">{tip.nome}</span>
              <StatusBadge status={tip.status} />
            </div>
            <span className="text-[11.5px] text-neutral-gray-7">
              Visualizador editável · {tip.ambientes.length} ambientes
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <PresenceStack />
          <div className="h-7 w-px bg-neutral-gray-4" />
          <div className="flex gap-0.5 rounded-lg bg-neutral-gray-3 p-[3px]">
            {([["Compacto", false], ["Detalhado", true]] as const).map(([lbl, val]) => {
              const on = detailed === val;
              return (
                <button
                  key={lbl}
                  type="button"
                  onClick={() => setDetailed(val)}
                  className={cn(
                    "rounded-md px-3 py-[5px] text-xs font-semibold transition-all",
                    on ? "bg-white text-neutral-gray-11 shadow-sm" : "text-neutral-gray-7"
                  )}
                >
                  {lbl}
                </button>
              );
            })}
          </div>
          <div className="h-7 w-px bg-neutral-gray-4" />
          <Button variant="bordered" size="sm" icon="edit" onPress={() => setTipModal({ mode: "edit", tip })}>
            Editar tipologia
          </Button>
          <Button size="sm" icon="plus" onPress={handleAddNote}>
            Post-it
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <BlueprintRail
          blueprints={tipologias}
          selId={tipId}
          onSelect={(id) => {
            setExpanded(new Set());
            router.replace(`/tipologias/${id}/canvas`);
          }}
          onNew={() => setTipModal({ mode: "add", tip: null })}
          onEdit={(t) => setTipModal({ mode: "edit", tip: t })}
          onDuplicate={onTipDuplicate}
          onDelete={onTipDelete}
        />

        <Viewport view={view} planeHeight={layout.height} materiais={materiais}>
          <EdgesSvg edges={layout.edges} height={layout.height} />

          {layout.ambNodes.map((n) => (
            <AmbienteNode key={n.amb.id} node={n} icon={iconFor(n.amb)} act={act} detailed={detailed} />
          ))}
          {layout.compNodes.map((n) => (
            <ComponenteNode key={n.comp.id} node={n} materiais={materiais} kits={kits} act={act} detailed={detailed} />
          ))}
          {layout.optNodes.map((n) => (
            <OptionNode
              key={n.key}
              node={n}
              materiais={materiais}
              kits={kits}
              onToggleKit={toggleKit}
              act={act}
              detailed={detailed}
            />
          ))}
          {layout.subNodes.map((n) => (
            <SubItemNode key={n.key} node={n} materiais={materiais} />
          ))}

          {layout.placeholders.map((p) => (
            <AddNode
              key={"ph-" + p.ambId}
              x={CV.x2}
              w={CV.w2}
              cy={p.cy}
              label="Adicionar componente"
              onClick={() => act.addComp(p.ambId)}
            />
          ))}

          {tip.ambientes.length === 0 && (
            <AddNode
              x={CV.x1}
              w={CV.w1 + 40}
              cy={layout.addAmbY}
              label="Adicionar ambiente"
              onClick={act.addAmb}
            />
          )}

          {notes.map((n) => (
            <PostIt key={n.id} note={n} onChange={changeNote} onDelete={deleteNote} onStartDrag={view.startNoteDrag} />
          ))}
        </Viewport>
      </div>

      {/* ── Modais ── */}
      <MaterialPicker
        open={matPicker !== null}
        title={matPicker?.title}
        subtitle={matPicker?.subtitle}
        currentId={matPicker?.currentId ?? null}
        materiais={materiais}
        kits={kits}
        onClose={() => setMatPicker(null)}
        onConfirm={confirmMatPicker}
        confirming={setPadrao.isPending || addUpgrade.isPending || replaceUpgrade.isPending}
      />

      <AmbienteModal
        open={ambModal !== null}
        mode={ambModal?.mode ?? "add"}
        initial={
          ambModal?.amb
            ? {
                nome: ambModal.amb.nome,
                icon: iconFor(ambModal.amb),
              }
            : null
        }
        onClose={() => setAmbModal(null)}
        onSave={saveAmbiente}
        saving={createAmb.isPending || updateAmb.isPending}
      />

      <EditComponentModal
        key={compModal ? `${compModal.mode}-${compModal.ambId}-${compModal.comp?.id ?? "new"}` : "none"}
        open={compModal !== null}
        comp={compModal?.comp ?? EMPTY_COMP}
        ambNome={compModal ? (tip.ambientes.find((a) => a.blueprintRoomId === compModal.ambId)?.nome ?? "") : ""}
        onClose={() => setCompModal(null)}
        onSave={saveComp}
        saving={createComp.isPending || updateComp.isPending}
      />

      <TipFormModal
        open={tipModal !== null}
        mode={tipModal?.mode ?? "add"}
        initial={tipModal?.tip ?? null}
        onClose={() => setTipModal(null)}
        onSave={onTipSave}
        saving={createTip.isPending || updateTip.isPending}
      />

      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm?.title ?? ""}
        width={420}
        actions={
          <>
            <Button variant="bordered" onPress={() => setConfirm(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onPress={() => {
                confirm?.onYes();
                setConfirm(null);
              }}
            >
              Excluir
            </Button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-neutral-gray-9">{confirm?.body}</p>
      </Modal>

      <MaterialImageModal material={imageTarget} onClose={() => setImageTarget(null)} />
    </div>
  );
}
