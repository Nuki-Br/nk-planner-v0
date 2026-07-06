"use client";

import React from "react";

import { UnderConstruction } from "@/components/layout/UnderConstruction";
import { useTipologia } from "@/lib/hooks/useTipologias";
import { useSelection } from "@/lib/store/selection";

// Tela 4 — Visualizador editável (canvas). O parâmetro vivo do protótipo
// (onNavigate com o objeto tipologia) vira rota [id] + seleção no store;
// os dados vêm do hook.
export default function CanvasPage({ params }: { params: { id: string } }) {
  const setSelectedTipologia = useSelection((s) => s.setSelectedTipologia);
  React.useEffect(() => {
    setSelectedTipologia(params.id);
  }, [params.id, setSelectedTipologia]);

  const { data: tipologia, isLoading } = useTipologia(params.id);
  const nome = tipologia?.nome ?? (isLoading ? "…" : "Tipologia não encontrada");

  return (
    <UnderConstruction
      title="Visualizador"
      subtitle={
        tipologia ? `${nome} · ${tipologia.ambientes.length} ambientes` : nome
      }
      breadcrumb={[
        { label: "Empreendimentos", href: "/dashboard" },
        { label: "Tipologias", href: "/tipologias" },
        { label: nome },
      ]}
      fase={6}
    />
  );
}
