"use client";

import React from "react";
import { useMotionValue, useMotionValueEvent, type MotionValue } from "framer-motion";

import { PLANE_W } from "@/lib/canvas/buildLayout";

// Pan/zoom do canvas — matemática portada verbatim do protótipo
// (canvas.jsx linhas 928-1011), mas escrita em motion values do framer-motion:
// atualizar x/y/scale NÃO re-renderiza o React (o protótipo re-renderizava a
// árvore inteira a cada frame de pan). Só o rótulo de % vive em state.
export interface CanvasView {
  x: MotionValue<number>;
  y: MotionValue<number>;
  scale: MotionValue<number>;
  viewportRef: React.RefObject<HTMLDivElement>;
  /** Percentual de zoom arredondado (para o indicador). */
  zoomPct: number;
  onBgDown: (e: React.MouseEvent) => void;
  applyZoom: (factor: number) => void;
  fitView: (planeHeight: number) => void;
  startNoteDrag: (e: React.MouseEvent, note: { id: string; x: number; y: number }) => void;
}

export function useCanvasView(
  onNoteDrag: (id: string, nx: number, ny: number) => void
): CanvasView {
  const x = useMotionValue(40);
  const y = useMotionValue(24);
  const scale = useMotionValue(0.78);
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const panRef = React.useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);
  const noteDragRef = React.useRef<{ id: string; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const onNoteDragRef = React.useRef(onNoteDrag);
  onNoteDragRef.current = onNoteDrag;

  const [zoomPct, setZoomPct] = React.useState(() => Math.round(scale.get() * 100));
  useMotionValueEvent(scale, "change", (v) => setZoomPct(Math.round(v * 100)));

  // Pan do fundo + drag de post-it num único pipeline global (drag tem prioridade).
  React.useEffect(() => {
    const move = (e: MouseEvent) => {
      const d = noteDragRef.current;
      if (d) {
        const z = scale.get();
        onNoteDragRef.current(d.id, d.ox + (e.clientX - d.sx) / z, d.oy + (e.clientY - d.sy) / z);
      } else if (panRef.current) {
        const p = panRef.current;
        x.set(p.px + (e.clientX - p.sx));
        y.set(p.py + (e.clientY - p.sy));
      }
    };
    const up = () => {
      panRef.current = null;
      noteDragRef.current = null;
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [x, y, scale]);

  // Zoom pela roda, ancorado no cursor (preventDefault exige passive: false).
  React.useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const ax = e.clientX - rect.left;
      const ay = e.clientY - rect.top;
      const cz = scale.get();
      const wx = (ax - x.get()) / cz;
      const wy = (ay - y.get()) / cz;
      const factor = e.deltaY < 0 ? 1.045 : 1 / 1.045;
      const nz = Math.max(0.35, Math.min(2, cz * factor));
      scale.set(nz);
      x.set(ax - wx * nz);
      y.set(ay - wy * nz);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [x, y, scale]);

  const onBgDown = React.useCallback(
    (e: React.MouseEvent) => {
      panRef.current = { sx: e.clientX, sy: e.clientY, px: x.get(), py: y.get() };
    },
    [x, y]
  );

  const applyZoom = React.useCallback(
    (factor: number) => {
      const el = viewportRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const ax = rect.width / 2;
      const ay = rect.height / 2;
      const cz = scale.get();
      const wx = (ax - x.get()) / cz;
      const wy = (ay - y.get()) / cz;
      const nz = Math.max(0.35, Math.min(2, cz * factor));
      scale.set(nz);
      x.set(ax - wx * nz);
      y.set(ay - wy * nz);
    },
    [x, y, scale]
  );

  const fitView = React.useCallback(
    (planeHeight: number) => {
      const el = viewportRef.current;
      if (!el) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      const s = Math.max(0.4, Math.min(1, (w - 48) / PLANE_W, (h - 48) / planeHeight));
      scale.set(s);
      x.set(Math.max(24, (w - PLANE_W * s) / 2));
      y.set(24);
    },
    [x, y, scale]
  );

  const startNoteDrag = React.useCallback(
    (e: React.MouseEvent, note: { id: string; x: number; y: number }) => {
      noteDragRef.current = { id: note.id, sx: e.clientX, sy: e.clientY, ox: note.x, oy: note.y };
    },
    []
  );

  return { x, y, scale, viewportRef, zoomPct, onBgDown, applyZoom, fitView, startNoteDrag };
}
