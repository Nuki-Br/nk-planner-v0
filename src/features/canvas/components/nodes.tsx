"use client";

import React from "react";

import { Icon } from "@/components/ui";
import { getMaterial, getOptionEntity } from "@/lib/data/entities";
import { CV, NODE_TRANSITION, type AmbNode as AmbNodeT, type CompNode as CompNodeT, type OptNode as OptNodeT, type SubNode as SubNodeT } from "@/lib/canvas/buildLayout";
import { cn, fmtBRL, fmtNum } from "@/lib/utils";
import { AmbIcon } from "@/features/typologies/components/AmbIcon";
import type { Ambiente, Componente, Kit, Material } from "@/shared/types/domain";

import { optionPending, subitemPending } from "../pending";
import { MaterialSwatch } from "./MaterialSwatch";
import { AddPill, CvIcon, Flyout, MenuRow, VMenu } from "./primitives";

// Uma única mutação de nó roda por vez, então o CanvasScreen publica só a
// chave da ação em andamento e cada nó compara com a sua para se desabilitar.
export const cloneAmbBusyKey = (ambId: number) => `clone-amb:${ambId}`;
export const optionBusyKey = (compId: number, optId: number | null) =>
  `del-opt:${compId}:${optId ?? "padrao"}`;

/** Ações disparadas pelos nós (implementadas no CanvasScreen com as mutations da Fase 5). */
export interface CanvasActions {
  /** Chave da mutação de nó em andamento (ver *BusyKey acima); null = nenhuma. */
  busyKey: string | null;
  editAmb: (amb: Ambiente) => void;
  cloneAmb: (amb: Ambiente) => void;
  deleteAmb: (amb: Ambiente) => void;
  addAmb: () => void;
  editComp: (ambId: number, comp: Componente) => void;
  addComp: (ambId: number) => void;
  deleteComp: (ambId: number, comp: Componente) => void;
  /** optId = id da linha de opção (null ao definir/adicionar). */
  changeOption: (ambId: number, comp: Componente, optId: number | null, isPadrao: boolean) => void;
  addOption: (ambId: number, comp: Componente) => void;
  deleteOption: (ambId: number, comp: Componente, optId: number, isPadrao: boolean) => void;
  /** Edita só a imagem do material (kits não têm imagem própria). */
  editImage: (mat: Material) => void;
}

// ── Ambiente (coluna 1) ───────────────────────────────────────────────
export function AmbienteNode({
  node,
  icon,
  act,
  detailed,
}: {
  node: AmbNodeT;
  icon: string;
  act: CanvasActions;
  detailed: boolean;
}) {
  const { amb, cy } = node;
  const [hov, setHov] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onMouseDown={(e) => e.stopPropagation()}
      style={{ left: CV.x1, top: cy - 27, width: CV.w1, height: 54, transition: NODE_TRANSITION, zIndex: hov ? 50 : 5 }}
      className="absolute"
    >
      <div
        className={cn(
          "flex h-full w-full items-center gap-2 rounded-lg bg-neutral-gray-11 px-3 transition-shadow",
          hov ? "shadow-[0_6px_18px_rgba(0,0,0,0.22)]" : "shadow-[0_2px_6px_rgba(0,0,0,0.12)]"
        )}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-white/15 text-white">
          <AmbIcon name={icon} size={15} />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[12.5px] font-bold leading-tight text-white">
            {amb.nome}
          </span>
          {detailed && (
            <span className="text-[9.5px] text-white/60">{amb.componentes.length} componentes</span>
          )}
        </span>
      </div>
      <Flyout side="top" show={hov}>
        <VMenu
          items={[
            { icon: "edit", label: "Editar ambiente", onClick: () => act.editAmb(amb) },
            {
              icon: "copy",
              label: "Clonar ambiente",
              onClick: () => act.cloneAmb(amb),
              loading: act.busyKey === cloneAmbBusyKey(amb.blueprintRoomId),
            },
            { divider: true },
            { icon: "trash", label: "Excluir ambiente", danger: true, onClick: () => act.deleteAmb(amb) },
          ]}
        />
      </Flyout>
      <Flyout side="bottom" show={hov}>
        <AddPill label="ambiente" onClick={() => act.addAmb()} />
      </Flyout>
    </div>
  );
}

// ── Componente (coluna 2) ─────────────────────────────────────────────
export function ComponenteNode({
  node,
  materiais,
  kits,
  act,
  detailed,
}: {
  node: CompNodeT;
  materiais: Material[];
  kits: Kit[];
  act: CanvasActions;
  detailed: boolean;
}) {
  const { comp, cy, empty } = node;
  const [hov, setHov] = React.useState(false);
  const def = comp.options.find((o) => o.isDefault);
  const padEnt = def ? getOptionEntity(materiais, kits, def) : null;
  const upgrades = comp.options.filter((o) => !o.isDefault);
  const showDetail = detailed && !empty;
  const optCount = comp.options.length;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onMouseDown={(e) => e.stopPropagation()}
      style={{ left: CV.x2, top: cy - 24, width: CV.w2, minHeight: 48, transition: NODE_TRANSITION, zIndex: hov ? 600 : 6 }}
      className="absolute"
    >
      <div
        className={cn(
          "flex w-full flex-col justify-center rounded-lg transition-shadow",
          empty ? "border-[1.5px] border-dashed border-neutral-gray-5 bg-transparent" : "border border-neutral-gray-5 bg-white",
          showDetail ? "items-stretch gap-1.5 px-3 py-2.5" : "items-center gap-0.5 px-3 py-2",
          hov && !empty && "shadow-[0_6px_18px_rgba(0,0,0,0.12)]"
        )}
        style={{ minHeight: 48 }}
      >
        <span
          className={cn(
            "text-[13px] font-bold",
            showDetail ? "text-left" : "text-center",
            empty ? "text-neutral-gray-6" : "text-neutral-gray-11"
          )}
        >
          {comp.nome}
        </span>
        {!showDetail && (
          <span className={cn("text-[10.5px]", empty ? "text-neutral-gray-6" : "text-neutral-gray-7")}>
            {empty ? "sem material associado" : `${optCount} opções`}
          </span>
        )}
        {showDetail && (
          <>
            <div className="flex items-center gap-1.5 text-[10.5px] text-neutral-gray-7">
              {padEnt && !padEnt.isKit ? (
                // padEnt JÁ é o material aqui (getOptionEntity acima o resolveu
                // e o TS estreitou) — refazer o getMaterial seria um Array.find
                // sobre o catálogo inteiro por nó, por render.
                <MaterialSwatch mat={padEnt} size={14} className="h-3.5 w-3.5 rounded" />
              ) : (
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded"
                  style={{ background: padEnt ? "#025259" : "#f5f5f5" }}
                />
              )}
              <span className="truncate">{padEnt ? padEnt.nome : "sem material padrão"}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-neutral-gray-2 px-[7px] py-px text-[10px] font-semibold text-neutral-gray-9">
                {fmtNum(comp.qtd)} {comp.unidade}
              </span>
              {comp.rt > 0 && (
                <span className="rounded-full bg-functional-warning-light px-[7px] py-px text-[10px] font-semibold text-tint-orange-fg">
                  RT {comp.rt}%
                </span>
              )}
              <span className="rounded-full bg-primary-1 px-[7px] py-px text-[10px] font-semibold text-primary-7">
                {optCount} opções
              </span>
            </div>
          </>
        )}
      </div>

      <Flyout side="top" show={hov}>
        <VMenu
          items={[
            { icon: "edit", label: "Editar componente", onClick: () => act.editComp(node.ambId, comp) },
            { divider: true },
            { icon: "trash", label: "Excluir componente", danger: true, onClick: () => act.deleteComp(node.ambId, comp) },
          ]}
        />
      </Flyout>

      <Flyout side="bottom" show={hov}>
        <AddPill label="componente" onClick={() => act.addComp(node.ambId)} />
      </Flyout>

      <Flyout side="right" show={hov} gap={14}>
        <div className="w-[210px] rounded-xl border border-neutral-gray-4 bg-white p-1.5 shadow-[0_14px_38px_rgba(0,0,0,0.18)]">
          <div className="px-[9px] pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-gray-6">
            Associar material
          </div>
          {def ? (
            <MenuRow
              materiais={materiais}
              swatchId={def.baseId}
              isKit={def.isKit}
              label="Material padrão"
              name={padEnt?.nome ?? "—"}
              onClick={() => act.changeOption(node.ambId, comp, def.id, true)}
            />
          ) : (
            <MenuRow
              materiais={materiais}
              add
              label="Material padrão"
              onClick={() => act.changeOption(node.ambId, comp, null, true)}
            />
          )}
          <div className="mx-2 my-[5px] h-px bg-neutral-gray-4" />
          {upgrades.map((opt, i) => {
            const ent = getOptionEntity(materiais, kits, opt);
            return (
              <MenuRow
                key={opt.id}
                materiais={materiais}
                swatchId={opt.baseId}
                isKit={opt.isKit}
                label={"Opção " + String(i + 1).padStart(2, "0")}
                name={ent?.nome ?? "—"}
                onClick={() => act.changeOption(node.ambId, comp, opt.id, false)}
                onDel={() => act.deleteOption(node.ambId, comp, opt.id, false)}
                deleting={act.busyKey === optionBusyKey(comp.id, opt.id)}
              />
            );
          })}
          <MenuRow
            materiais={materiais}
            add
            label={"Opção " + String(upgrades.length + 1).padStart(2, "0")}
            onClick={() => act.addOption(node.ambId, comp)}
          />
        </div>
      </Flyout>
    </div>
  );
}

// ── Opção de material (coluna 3) ──────────────────────────────────────
export function OptionNode({
  node,
  materiais,
  kits,
  onToggleKit,
  act,
  detailed,
}: {
  node: OptNodeT;
  materiais: Material[];
  kits: Kit[];
  onToggleKit: (key: string) => void;
  act: CanvasActions;
  detailed: boolean;
}) {
  const { comp, optId, baseId, isPadrao, label, key, isKit, kit, isOpen } = node;
  const [hov, setHov] = React.useState(false);
  const pending = optionPending(materiais, kits, node, comp);
  const mat = isKit ? null : getMaterial(materiais, baseId);
  const kitCount = isKit && kit ? kit.itens.length : 0;
  const price = mat ? mat.custoMat + mat.custoMO : 0;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ left: CV.x3, top: node.cy - 31, width: CV.w3, transition: NODE_TRANSITION, zIndex: hov ? 45 : 7 }}
      className="absolute"
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          if (isKit) onToggleKit(key);
        }}
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-shadow",
          isPadrao ? "bg-functional-success-light" : "bg-white",
          pending ? "border-[1.5px] border-functional-error" : "border border-neutral-gray-5",
          isKit ? "cursor-pointer" : "cursor-default",
          hov ? "shadow-[0_6px_18px_rgba(0,0,0,0.12)]" : "shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
        )}
        style={{ minHeight: 60 }}
      >
        {isKit ? (
          <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-lg bg-primary-8 text-white">
            <CvIcon name="hex" size={24} />
          </div>
        ) : (
          <MaterialSwatch
            mat={mat}
            size={46}
            className="h-[46px] w-[46px] rounded-lg border border-neutral-gray-5"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex flex-wrap items-center gap-[5px]">
            <span
              className={cn(
                "text-[9.5px] font-bold uppercase tracking-wide",
                isPadrao ? "text-primary-7" : "text-neutral-gray-7"
              )}
            >
              {label}
            </span>
            {isKit && (
              <span className="inline-flex h-[15px] items-center gap-[3px] rounded-full bg-primary-8 px-1.5 text-[9px] font-bold text-white">
                kit · {kitCount} itens
              </span>
            )}
            {pending && (
              <span className="inline-flex h-[15px] items-center rounded-full bg-functional-error-light px-1.5 text-[9px] font-bold text-functional-error">
                sem custo
              </span>
            )}
          </div>
          <span className="block truncate text-xs font-semibold leading-tight text-neutral-gray-11">
            {isKit ? (kit?.nome ?? "—") : (mat?.nome ?? "—")}
          </span>
          {detailed && (
            <div className="mt-[3px] flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-neutral-gray-6">
                {isKit ? `${kitCount} itens` : `${mat?.fabricante ?? "—"}${mat ? " · " + mat.categoria : ""}`}
              </span>
              {!isKit && mat && price > 0 && (
                <span className="rounded-full bg-neutral-gray-2 px-[7px] py-px text-[10px] font-bold text-neutral-gray-9">
                  {fmtBRL(price)}
                </span>
              )}
            </div>
          )}
        </div>
        {isKit && (
          <span className="flex shrink-0 items-center">
            <Icon name={isOpen ? "chevD" : "chevR"} size={16} className="text-neutral-gray-7" />
          </span>
        )}
      </div>
      <Flyout side="top" show={hov}>
        <VMenu
          items={[
            { icon: "edit", label: "Trocar material", onClick: () => act.changeOption(node.ambId, comp, optId, isPadrao) },
            // Kit não tem imagem própria (o domínio Kit não tem o campo).
            ...(mat
              ? [{ icon: "library" as const, label: "Editar imagem", onClick: () => act.editImage(mat) }]
              : []),
            { divider: true },
            {
              icon: "trash",
              label: "Excluir opção",
              danger: true,
              onClick: () => act.deleteOption(node.ambId, comp, optId, isPadrao),
              loading: act.busyKey === optionBusyKey(comp.id, isPadrao ? null : optId),
            },
          ]}
        />
      </Flyout>
    </div>
  );
}

// ── Sub-item de kit (coluna 4) ────────────────────────────────────────
export function SubItemNode({
  node,
  materiais,
}: {
  node: SubNodeT;
  materiais: Material[];
}) {
  const { item, cy } = node;
  const m = getMaterial(materiais, item.materialId);
  const pending = subitemPending(item);
  return (
    <div
      style={{ left: CV.x4, top: cy - 16, width: CV.w4, height: 32, transition: NODE_TRANSITION }}
      className={cn(
        "absolute z-[4] flex items-center gap-1.5 rounded-md bg-neutral-gray-2 px-2.5",
        pending ? "border-[1.5px] border-functional-error" : "border border-neutral-gray-4"
      )}
    >
      <span className="flex-1 truncate text-[11.5px] font-medium text-neutral-gray-9">
        {m?.nome ?? item.nome}
      </span>
      {pending && <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-functional-error" />}
    </div>
  );
}

// ── Afford "adicionar" (ambiente vazio / tipologia vazia) ─────────────
export function AddNode({
  x,
  w,
  cy,
  label,
  onClick,
}: {
  x: number;
  w: number;
  cy: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{ left: x, top: cy - 15, width: w, height: 30, transition: NODE_TRANSITION }}
      className="group absolute z-[5] flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-[1.5px] border-dashed border-neutral-gray-5 bg-transparent transition-colors hover:border-primary-7 hover:bg-primary-1"
    >
      <Icon name="plus" size={13} className="text-neutral-gray-6 group-hover:text-primary-7" />
      <span className="text-[11.5px] font-semibold text-neutral-gray-7 group-hover:text-primary-7">
        {label}
      </span>
    </div>
  );
}
