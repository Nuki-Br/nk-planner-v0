"use client";

import React from "react";

import { Button, Card, Icon, Input, LoadingState, PageHeader } from "@/components/ui";
import { useActiveProjectId } from "@/lib/hooks/useActiveProject";
import { useProject, useUpdateProject } from "@/lib/hooks/useProjects";
import { useTorres, useUnitGroups, useUpdateTorres } from "@/lib/hooks/useUnitGroups";

import { TowersEditor, type TowerDraft } from "./TowersEditor";

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-bold text-neutral-gray-11">{children}</h3>
      {sub && <p className="mt-0.5 text-xs text-neutral-gray-7">{sub}</p>}
    </div>
  );
}

// Tela 2 — Config base do empreendimento (protótipo: ProjectSetupScreen).
// Edita o projeto ativo; sem projeto selecionado, edita o p001 (THE_PROJECT),
// como no mock original. As torres são linhas reais (Tower) reconciliadas em
// lote no salvar — o rótulo do dashboard (TowerLabel) é derivado no servidor.
export function ConfigBaseScreen() {
  const projectId = useActiveProjectId();
  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: torres, isLoading: torresLoading } = useTorres();
  const { data: unitGroups = [] } = useUnitGroups();
  const updateProject = useUpdateProject();
  const updateTorres = useUpdateTorres();

  const [nome, setNome] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (project && nome === null) setNome(project.nome);
  }, [project, nome]);

  const [towers, setTowers] = React.useState<TowerDraft[] | null>(null);
  React.useEffect(() => {
    if (torres && towers === null) setTowers(torres.map((t) => ({ id: t.id, nome: t.nome })));
  }, [torres, towers]);

  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const savedTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(
    () => () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    },
    []
  );

  if (!projectId || projectLoading || torresLoading)
    return <LoadingState label="Carregando dados do empreendimento…" />;
  if (nome === null || towers === null) return null;

  const groupCountByTorre = (torreNome: string) =>
    unitGroups.filter((g) => g.torre === torreNome).length;

  const saving = updateProject.isPending || updateTorres.isPending;

  const handleSave = async () => {
    setError(null);
    try {
      const [, savedTorres] = await Promise.all([
        updateProject.mutateAsync({ id: projectId, patch: { nome } }),
        updateTorres.mutateAsync(towers),
      ]);
      // Ressincroniza com os ids reais: torres novas ganham id no servidor —
      // sem isso, salvar de novo recriaria (e apagaria) as mesmas torres.
      setTowers(savedTorres.map((t) => ({ id: t.id, nome: t.nome })));
      setSaved(true);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        breadcrumb={[{ label: "Empreendimentos", href: "/dashboard" }, { label: "Configuração" }]}
        title={nome || "Novo empreendimento"}
        subtitle="Configure os dados base antes de definir tipologias"
        action={
          <>
            {saved && (
              <span className="text-xs text-functional-success">✓ Salvo</span>
            )}
            {error && <span className="text-xs text-functional-error">{error}</span>}
            <Button onPress={() => void handleSave()} isLoading={saving}>
              Salvar
            </Button>
          </>
        }
      />

      <div className="grid gap-5">
        {project?.incorporadora && (
          <div className="flex items-center gap-3 rounded-nk-xl border border-primary-3 bg-primary-1 px-4 py-3">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white text-primary-7">
              <Icon name="building" size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-primary-7">Incorporadora</p>
              <p className="truncate text-[13px] font-bold text-neutral-gray-11">
                {project.incorporadora}
              </p>
            </div>
          </div>
        )}
        <Card>
          <SectionTitle>Dados do empreendimento</SectionTitle>
          <Input
            label="Nome do empreendimento"
            value={nome}
            onValueChange={setNome}
            placeholder="Ex: Parque Ibirapuera Residências"
          />
        </Card>
        <Card>
          <SectionTitle sub="Adicione as torres/blocos do empreendimento — os grupos de unidades referenciam estas torres">
            Torres
          </SectionTitle>
          <TowersEditor
            towers={towers}
            onChange={setTowers}
            groupCountByTorre={groupCountByTorre}
          />
        </Card>
      </div>
    </div>
  );
}
