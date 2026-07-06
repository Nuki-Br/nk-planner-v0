"use client";

import React from "react";

import { UnderConstruction } from "@/components/layout/UnderConstruction";
import { useTipologia } from "@/lib/hooks/useTipologias";
import { useSelection } from "@/lib/store/selection";

// Tela 7 — Configuração de materiais por componente. Rota carrega os
// parâmetros vivos ([id] tipologia, [cid] componente) e sincroniza a seleção.
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

  const { data: tipologia, isLoading } = useTipologia(params.id);
  const match = tipologia?.ambientes
    .flatMap((amb) => amb.componentes.map((comp) => ({ amb, comp })))
    .find(({ comp }) => comp.id === params.cid);

  const nomeTip = tipologia?.nome ?? (isLoading ? "…" : "Tipologia não encontrada");
  const nomeComp = match
    ? `${match.amb.nome} — ${match.comp.nome}`
    : isLoading
      ? "…"
      : "Componente não encontrado";

  return (
    <UnderConstruction
      title="Configuração de materiais"
      subtitle={
        match
          ? `${nomeComp} · ${match.comp.qtd} ${match.comp.unidade}${match.comp.rt > 0 ? ` · RT ${match.comp.rt}%` : ""}`
          : nomeComp
      }
      breadcrumb={[
        { label: "Empreendimentos", href: "/dashboard" },
        { label: "Tipologias", href: "/tipologias" },
        { label: nomeTip },
        { label: match?.comp.nome ?? "Componente" },
      ]}
      fase={5}
    />
  );
}
