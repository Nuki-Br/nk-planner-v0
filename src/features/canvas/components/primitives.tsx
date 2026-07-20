"use client";

import React from "react";

import { Icon, Spinner, type IconName } from "@/components/ui";
import { getMaterial } from "@/lib/data/entities";
import { cn } from "@/lib/utils";
import type { Material } from "@/shared/types/domain";

import { MaterialSwatch } from "./MaterialSwatch";

/** Ícones locais do canvas (hexágono de kit etc.). */
export function CvIcon({
  name,
  size = 16,
  className,
}: {
  name: "image" | "addPhoto" | "hex";
  size?: number;
  className?: string;
}) {
  const p = {
    image:
      "M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z",
    addPhoto:
      "M3 4V1h2v3h3v2H5v3H3V6H0V4h3zm3 6V7h3V4h7l1.83 2H21c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V10h3zm7 9c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-3.2-5c0 1.77 1.43 3.2 3.2 3.2s3.2-1.43 3.2-3.2-1.43-3.2-3.2-3.2-3.2 1.43-3.2 3.2z",
    hex: "M17.5 3.5h-11L1 12l5.5 8.5h11L23 12l-5.5-8.5z",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d={p[name]} />
    </svg>
  );
}

/**
 * Flyout com "ponte de hover": o padding invisível (clicável) encosta no nó,
 * então o ponteiro nunca sai da região de hover ao ir do nó para o menu.
 */
export function Flyout({
  side,
  show,
  gap = 8,
  children,
}: {
  side: "top" | "bottom" | "right";
  show: boolean;
  gap?: number;
  children: React.ReactNode;
}) {
  const pos: React.CSSProperties =
    side === "top"
      ? { bottom: "100%", left: "50%", transform: "translateX(-50%)", paddingBottom: gap, flexDirection: "column", alignItems: "center" }
      : side === "bottom"
        ? { top: "100%", left: "50%", transform: "translateX(-50%)", paddingTop: gap, flexDirection: "column", alignItems: "center" }
        : { left: "100%", top: "50%", transform: "translateY(-50%)", paddingLeft: gap };
  const origin = side === "right" ? "left center" : side === "top" ? "bottom center" : "top center";
  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        display: "flex",
        ...pos,
        zIndex: 40,
        opacity: show ? 1 : 0,
        pointerEvents: show ? "auto" : "none",
        transition: "opacity .15s",
      }}
    >
      <div
        style={{
          transform: `scale(${show ? 1 : 0.95})`,
          transformOrigin: origin,
          transition: "transform .15s",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export interface VMenuEntry {
  icon?: IconName;
  label?: string;
  onClick?: () => void;
  danger?: boolean;
  divider?: boolean;
  /** Mutação em andamento: troca o ícone por spinner e bloqueia o clique. */
  loading?: boolean;
}

/** Menu vertical de ações (linhas ícone + label, divisor e variante danger). */
export function VMenu({ items }: { items: VMenuEntry[] }) {
  return (
    <div className="min-w-[168px] rounded-xl border border-neutral-gray-4 bg-white p-1.5 shadow-[0_14px_38px_rgba(0,0,0,0.18)]">
      {items.map((it, i) =>
        it.divider ? (
          <div key={`d${i}`} className="mx-2 my-[5px] h-px bg-neutral-gray-4" />
        ) : (
          <button
            key={it.label}
            type="button"
            disabled={it.loading}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              if (it.loading) return;
              it.onClick?.();
            }}
            className={cn(
              "flex w-full items-center gap-[11px] rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition-colors",
              it.danger
                ? "text-functional-error hover:bg-functional-error-light"
                : "text-neutral-gray-9 hover:bg-neutral-gray-2",
              it.loading && "cursor-default opacity-60 hover:bg-transparent"
            )}
          >
            {it.loading ? (
              <Spinner size={17} className="text-current" />
            ) : (
              it.icon && <Icon name={it.icon} size={17} />
            )}
            {it.label}
          </button>
        )
      )}
    </div>
  );
}

/** Pílula tracejada de "adicionar" revelada no hover do nó. */
export function AddPill({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="group inline-flex items-center gap-[5px] whitespace-nowrap rounded-full border-[1.5px] border-dashed border-neutral-gray-5 bg-white px-[11px] py-[5px] text-[11px] font-semibold text-neutral-gray-7 shadow-[0_3px_10px_rgba(0,0,0,0.12)] transition-colors hover:border-primary-7 hover:bg-primary-1 hover:text-primary-7"
    >
      <Icon name="plus" size={12} className="text-neutral-gray-6 group-hover:text-primary-7" />
      {label}
    </button>
  );
}

/** Botão compacto só-ícone (ações do rail). */
export function ActBtn({
  icon,
  title,
  onClick,
  danger = false,
  loading = false,
}: {
  icon: IconName;
  title: string;
  onClick: () => void;
  danger?: boolean;
  /** Mutação em andamento: troca o ícone por spinner e bloqueia o clique. */
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={loading}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        if (loading) return;
        onClick();
      }}
      className={cn(
        "flex h-[26px] w-[26px] items-center justify-center rounded-md transition-colors",
        danger
          ? "text-functional-error hover:bg-functional-error-light"
          : "text-neutral-gray-8 hover:bg-neutral-gray-3 hover:text-primary-7",
        loading && "cursor-default opacity-60 hover:bg-transparent"
      )}
    >
      {loading ? <Spinner size={13} className="text-current" /> : <Icon name={icon} size={15} />}
    </button>
  );
}

/** Linha do painel de associação rápida de material (menu à direita do componente). */
export function MenuRow({
  materiais,
  swatchId,
  isKit = false,
  label,
  name,
  onClick,
  onDel,
  deleting = false,
  add = false,
}: {
  materiais: Material[];
  swatchId?: number | null;
  isKit?: boolean;
  label: string;
  name?: string;
  onClick: () => void;
  onDel?: () => void;
  /** Exclusão desta opção em andamento. */
  deleting?: boolean;
  add?: boolean;
}) {
  const [h, setH] = React.useState(false);
  const mat = swatchId != null && !isKit ? getMaterial(materiais, swatchId) : null;
  return (
    <div
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-lg px-[9px] py-[7px] transition-colors",
        h && "bg-neutral-gray-2"
      )}
    >
      {add ? (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] text-primary-7">
          <Icon name="plus" size={16} />
        </span>
      ) : isKit ? (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] bg-primary-8 text-white">
          <CvIcon name="hex" size={14} />
        </span>
      ) : (
        <MaterialSwatch
          mat={mat}
          size={24}
          className="h-6 w-6 rounded-[7px] border border-neutral-gray-5"
        />
      )}
      <span className="min-w-0 flex-1">
        {add ? (
          <span className="block text-[13px] font-semibold text-primary-7">{label}</span>
        ) : (
          <>
            <span className="block text-[9px] font-bold uppercase tracking-wider text-neutral-gray-6">
              {label}
            </span>
            <span className="block truncate text-[12.5px] font-semibold text-neutral-gray-11">
              {name}
            </span>
          </>
        )}
      </span>
      {onDel && (h || deleting) && (
        <button
          type="button"
          title="Excluir opção"
          disabled={deleting}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            if (deleting) return;
            onDel();
          }}
          className={cn(
            "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md bg-functional-error-light text-functional-error",
            deleting && "cursor-default opacity-60"
          )}
        >
          {deleting ? (
            <Spinner size={12} className="text-current" />
          ) : (
            <Icon name="trash" size={12} />
          )}
        </button>
      )}
    </div>
  );
}
