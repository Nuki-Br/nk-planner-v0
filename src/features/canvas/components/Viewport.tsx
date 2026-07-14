"use client";

import React from "react";
import { motion } from "framer-motion";

import { Icon } from "@/components/ui";
import { CV, PLANE_W } from "@/lib/canvas/buildLayout";
import type { Material } from "@/shared/types/domain";

import { swatchStyle } from "../swatch";
import type { CanvasView } from "../useCanvasView";

const COLUMN_HEADERS: [string, number, number][] = [
  ["Ambiente", CV.x1, CV.w1],
  ["Componente", CV.x2, CV.w2],
  ["Opção de material", CV.x3, CV.w3],
  ["Composição do kit", CV.x4, CV.w4],
];

function ZoomBtn({
  label,
  ariaLabel,
  onClick,
}: {
  label: string;
  ariaLabel?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="h-8 w-9 bg-white p-0 text-lg font-semibold leading-none text-neutral-gray-9 hover:bg-neutral-gray-3"
    >
      {label}
    </button>
  );
}

function CanvasLegend({ materiais }: { materiais: Material[] }) {
  const sample = materiais[0];
  const items: { node: React.ReactNode; label: string }[] = [
    {
      node: (
        <div
          className="h-[18px] w-[18px] rounded border border-neutral-gray-5"
          style={swatchStyle(sample)}
        />
      ),
      label: "Material associado",
    },
    {
      node: (
        <div className="h-[18px] w-[18px] rounded border-[1.5px] border-functional-error bg-functional-error-light" />
      ),
      label: "Sem custo base",
    },
    {
      node: <Icon name="edit" size={15} className="text-neutral-gray-7" />,
      label: "Passe o mouse sobre os nós para editar",
    },
  ];
  return (
    <div className="absolute bottom-4 left-4 z-40 rounded-lg border border-neutral-gray-5 bg-white/95 px-3.5 py-2.5 shadow-[0_2px_10px_rgba(0,0,0,0.08)] backdrop-blur-[2px]">
      <div className="flex max-w-[640px] flex-wrap gap-[18px]">
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-2">
            {it.node}
            <span className="text-[11px] text-neutral-gray-8">{it.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Viewport do canvas: fundo pontilhado com pan, plano transformado, legenda e controles de zoom. */
export function Viewport({
  view,
  planeHeight,
  materiais,
  children,
}: {
  view: CanvasView;
  planeHeight: number;
  materiais: Material[];
  children: React.ReactNode;
}) {
  return (
    <div
      ref={view.viewportRef}
      onMouseDown={view.onBgDown}
      className="relative flex-1 cursor-grab overflow-hidden"
      style={{
        background: "radial-gradient(#d9d9d9 1px, transparent 1px)",
        backgroundSize: "22px 22px",
      }}
    >
      <motion.div
        style={{
          x: view.x,
          y: view.y,
          scale: view.scale,
          transformOrigin: "0 0",
          position: "absolute",
          left: 0,
          top: 0,
          width: PLANE_W,
          height: planeHeight,
        }}
      >
        {COLUMN_HEADERS.map(([t, x, w]) => (
          <div
            key={t}
            style={{ left: x, top: 18, width: w }}
            className="absolute text-center text-[10px] font-bold uppercase tracking-wider text-neutral-gray-6"
          >
            {t}
          </div>
        ))}
        {children}
      </motion.div>

      <CanvasLegend materiais={materiais} />

      <div className="absolute bottom-4 right-4 z-40 flex flex-col overflow-hidden rounded-lg border border-neutral-gray-5 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)]">
        <ZoomBtn label="+" ariaLabel="Aumentar zoom" onClick={() => view.applyZoom(1.15)} />
        <div className="h-px bg-neutral-gray-4" />
        <div className="flex h-[30px] items-center justify-center text-[11px] font-bold text-neutral-gray-8">
          {view.zoomPct}%
        </div>
        <div className="h-px bg-neutral-gray-4" />
        <ZoomBtn label="−" ariaLabel="Diminuir zoom" onClick={() => view.applyZoom(0.87)} />
        <div className="h-px bg-neutral-gray-4" />
        <button
          type="button"
          onClick={() => view.fitView(planeHeight)}
          title="Ajustar à tela"
          aria-label="Ajustar à tela"
          className="flex h-8 w-9 items-center justify-center bg-white text-neutral-gray-8 hover:bg-neutral-gray-3"
        >
          <Icon name="share" size={14} />
        </button>
      </div>
    </div>
  );
}
