"use client";

import React from "react";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button, EmptyState, Icon, MaterialThumb } from "@/components/ui";
import { getOptionEntity } from "@/lib/data/entities";
import { cn, fmtNum } from "@/lib/utils";
import type { Ambiente, Componente, Kit, Material } from "@/shared/types/domain";

import { guessAmbIcon } from "../ambIcons";
import { SHARED } from "../shared";
import { AmbIcon } from "./AmbIcon";
import { RowIconBtn } from "./RowIconBtn";

export interface SharedBadgeInfo {
  allNames: string[];
  otherNames: string[];
}

function TipKitBadge() {
  return (
    <span className="inline-flex items-center gap-[3px] whitespace-nowrap rounded-full bg-primary-8 px-[7px] py-px text-[10px] font-bold text-white">
      ⬡ Kit
    </span>
  );
}

interface ComponenteRowProps {
  comp: Componente;
  materiais: Material[];
  kits: Kit[];
  onEdit: (comp: Componente) => void;
  onConfig: (comp: Componente) => void;
  onEditImage: (mat: Material) => void;
}

function ComponenteRow({
  comp,
  materiais,
  kits,
  onEdit,
  onConfig,
  onEditImage,
}: ComponenteRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: comp.id,
  });
  const def = comp.options.find((o) => o.isDefault);
  const padraoEnt = def ? getOptionEntity(materiais, kits, def) : null;
  const upgradeCount = comp.options.filter((o) => !o.isDefault).length;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-3 border-t border-neutral-gray-4 bg-white px-3.5 py-[9px]",
        isDragging && "relative z-10 opacity-60 shadow-md"
      )}
    >
      <span
        {...attributes}
        {...listeners}
        title="Arraste para reordenar o componente"
        className="flex cursor-grab touch-none text-neutral-gray-6"
      >
        <Icon name="menu" size={14} />
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-medium text-neutral-gray-11">{comp.nome}</span>
        {comp.ghost && (
          <span
            title="Componente fantasma"
            className="inline-flex items-center gap-1 rounded-full bg-primary-1 px-[7px] py-px text-[10px] font-bold text-primary-7"
          >
            <Icon name="ghost" size={11} /> Fantasma
          </span>
        )}
        {padraoEnt &&
          (padraoEnt.isKit ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="text-[11px] text-neutral-gray-6">Padrão: {padraoEnt.nome}</span>
              <TipKitBadge />
            </span>
          ) : (
            // Miniatura só do material padrão: esta tela não lista upgrades (só
            // os conta), então a cobertura aqui é parcial por natureza — o resto
            // fica na config. do componente.
            <span className="inline-flex items-center gap-1.5">
              <button
                type="button"
                title="Editar imagem"
                onClick={() => onEditImage(padraoEnt)}
                className="rounded-md transition-opacity hover:opacity-80"
              >
                <MaterialThumb url={padraoEnt.imagem?.url} alt={padraoEnt.nome} size={22} />
              </button>
              <span className="text-[11px] text-neutral-gray-6">
                Padrão: {padraoEnt.nome.substring(0, 30)}
                {padraoEnt.nome.length > 30 ? "…" : ""}
              </span>
            </span>
          ))}
      </div>
      <span className="text-xs text-neutral-gray-7">{comp.unidade}</span>
      <span className="text-xs font-semibold text-neutral-gray-9">
        {fmtNum(comp.qtd)} {comp.unidade}
      </span>
      {comp.rt > 0 ? (
        <span className="whitespace-nowrap rounded-full bg-functional-warning-light px-2 py-px text-[11px] text-tint-orange-fg">
          RT {comp.rt}%
        </span>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-0.5 justify-self-end">
        <RowIconBtn
          icon="edit"
          title="Editar componente"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(comp);
          }}
        />
        <Button variant="ghost" size="sm" onPress={() => onConfig(comp)}>
          {upgradeCount > 0 ? `${upgradeCount + 1} mat.` : "Configurar"} →
        </Button>
      </div>
    </div>
  );
}

interface AmbienteAccordionProps {
  amb: Ambiente;
  open: boolean;
  shared: SharedBadgeInfo | null;
  materiais: Material[];
  kits: Kit[];
  onToggle: () => void;
  onEditAmb: (amb: Ambiente) => void;
  onCloneAmb: (amb: Ambiente) => void;
  onDeleteAmb: (amb: Ambiente) => void;
  onAddComp: (amb: Ambiente) => void;
  onEditComp: (amb: Ambiente, comp: Componente) => void;
  onConfigComp: (comp: Componente) => void;
  onReorderComps: (amb: Ambiente, orderedIds: number[]) => void;
  onEditImage: (mat: Material) => void;
}

/** Um ambiente do acordeão: header arrastável + componentes reordenáveis. */
export function AmbienteAccordion({
  amb,
  open,
  shared,
  materiais,
  kits,
  onToggle,
  onEditAmb,
  onCloneAmb,
  onDeleteAmb,
  onAddComp,
  onEditComp,
  onConfigComp,
  onReorderComps,
  onEditImage,
}: AmbienteAccordionProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: amb.blueprintRoomId,
  });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleCompDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = amb.componentes.map((c) => c.id);
    const from = ids.indexOf(Number(active.id));
    const to = ids.indexOf(Number(over.id));
    if (from < 0 || to < 0) return;
    onReorderComps(amb, arrayMove(ids, from, to));
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        borderColor: shared ? SHARED.border : undefined,
      }}
      className={cn(
        "mb-2 overflow-hidden rounded-lg border border-neutral-gray-4",
        isDragging && "relative z-10 opacity-60 shadow-lg"
      )}
    >
      <div
        onClick={onToggle}
        style={{ background: open ? (shared ? SHARED.bg : undefined) : shared ? SHARED.soft : undefined }}
        className={cn(
          "flex cursor-pointer items-center justify-between px-3.5 py-2.5 transition-colors",
          open && !shared && "bg-neutral-gray-2",
          !open && !shared && "bg-white"
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            title="Arraste para reordenar o ambiente"
            className="flex cursor-grab touch-none text-neutral-gray-6"
          >
            <Icon name="menu" size={14} />
          </span>
          <span
            style={{ background: shared ? SHARED.bg : undefined, color: shared ? SHARED.icon : undefined }}
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
              !shared && "bg-primary-1 text-primary-7"
            )}
          >
            <AmbIcon name={amb.icon ?? guessAmbIcon(amb.nome)} size={16} />
          </span>
          <span
            style={{ color: shared ? SHARED.text : undefined }}
            className="shrink-0 text-[13px] font-bold text-neutral-gray-11"
          >
            {amb.nome}
          </span>
          {shared && (
            <span
              title={`Ambiente compartilhado entre ${shared.allNames.length} tipologias: ${shared.allNames.join(", ")}`}
              style={{ borderColor: SHARED.border, color: SHARED.text }}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border bg-white px-[7px] py-px text-[10px] font-bold"
            >
              <Icon name="share" size={10} /> Compartilhado
            </span>
          )}
          {shared && shared.otherNames.length > 0 && (
            <span
              title={`Também usado em: ${shared.otherNames.join(", ")}`}
              className="inline-flex min-w-0 items-center gap-1 text-[11px] text-neutral-gray-7 opacity-70"
            >
              <span className="text-neutral-gray-6">·</span>
              <span className="truncate">{shared.otherNames.join(", ")}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="mr-1 text-[11px] text-neutral-gray-7">
            {amb.componentes.length} componentes
          </span>
          <RowIconBtn
            icon="edit"
            title="Editar ambiente"
            onClick={(e) => {
              e.stopPropagation();
              onEditAmb(amb);
            }}
          />
          <RowIconBtn
            icon="copy"
            title="Clonar ambiente"
            onClick={(e) => {
              e.stopPropagation();
              onCloneAmb(amb);
            }}
          />
          <RowIconBtn
            icon="trash"
            title="Excluir ambiente"
            danger
            onClick={(e) => {
              e.stopPropagation();
              onDeleteAmb(amb);
            }}
          />
          <Icon name={open ? "chevD" : "chevR"} size={14} className="text-neutral-gray-7" />
        </div>
      </div>

      {open && (
        <div>
          {amb.componentes.length === 0 ? (
            <div className="border-t border-neutral-gray-4">
              <EmptyState
                icon="box"
                title="Nenhum componente ainda"
                subtitle="Adicione componentes para configurar as opções de personalização deste ambiente."
                action={
                  <Button variant="teal" size="sm" icon="plus" onPress={() => onAddComp(amb)}>
                    Adicionar componente
                  </Button>
                }
              />
            </div>
          ) : (
            <>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleCompDragEnd}
              >
                <SortableContext
                  items={amb.componentes.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {amb.componentes.map((comp) => (
                    <ComponenteRow
                      key={comp.id}
                      comp={comp}
                      materiais={materiais}
                      kits={kits}
                      onEdit={(c) => onEditComp(amb, c)}
                      onConfig={onConfigComp}
                      onEditImage={onEditImage}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              <div className="border-t border-neutral-gray-4 bg-neutral-gray-2 px-3.5 py-2">
                <Button variant="ghost" size="sm" icon="plus" onPress={() => onAddComp(amb)}>
                  Adicionar componente
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
