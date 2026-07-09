"use client";

import React from "react";

import { MaterialsConfigScreen } from "@/features/materials-config/components/MaterialsConfigScreen";
import { useSelection } from "@/lib/store/selection";

// Tela 7 — Configuração de materiais por componente. Os parâmetros vivos do
// protótipo ([id] tipologia, [cid] componente) vêm da rota; a seleção é
// sincronizada no store.
export default function ComponentePage({
  params,
}: {
  params: { id: string; cid: string };
}) {
  const setSelectedTipologia = useSelection((s) => s.setSelectedTipologia);
  const setSelectedComponent = useSelection((s) => s.setSelectedComponent);
  React.useEffect(() => {
    setSelectedTipologia(params.id);
    setSelectedComponent(params.cid);
  }, [params.id, params.cid, setSelectedTipologia, setSelectedComponent]);

  return <MaterialsConfigScreen tipologiaId={params.id} componenteId={params.cid} />;
}
