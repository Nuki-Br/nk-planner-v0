"use client";

import React from "react";

import { CanvasScreen } from "@/features/canvas/components/CanvasScreen";
import { useSelection } from "@/lib/store/selection";

// Tela 4 — Visualizador editável (canvas node-graph).
export default function CanvasPage({ params }: { params: { id: string } }) {
  const setSelectedTipologia = useSelection((s) => s.setSelectedTipologia);
  React.useEffect(() => {
    setSelectedTipologia(Number(params.id));
  }, [params.id, setSelectedTipologia]);

  return <CanvasScreen tipologiaId={params.id} />;
}
