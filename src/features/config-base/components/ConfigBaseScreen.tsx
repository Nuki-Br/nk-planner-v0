"use client";

import React from "react";
import { useRouter } from "next/navigation";

import { Button, Card, Input, LoadingState, PageHeader } from "@/components/ui";
import { useActiveProjectId } from "@/lib/hooks/useActiveProject";
import { useProject, useUpdateProject } from "@/lib/hooks/useProjects";
import type { Project } from "@/shared/types/domain";

interface FormState {
  nome: string;
  torre: string;
}

function toForm(p: Project): FormState {
  return {
    nome: p.nome,
    torre: p.torre,
  };
}

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
// como no mock original.
export function ConfigBaseScreen() {
  const router = useRouter();
  const projectId = useActiveProjectId();
  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const updateProject = useUpdateProject();

  const [form, setForm] = React.useState<FormState | null>(null);
  React.useEffect(() => {
    if (project && form === null) setForm(toForm(project));
  }, [project, form]);

  const [saved, setSaved] = React.useState(false);
  const savedTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(
    () => () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    },
    []
  );

  if (!projectId || projectLoading)
    return <LoadingState label="Carregando dados do empreendimento…" />;
  if (!form) return null;

  const set = (key: keyof FormState) => (value: string) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const handleSave = () => {
    updateProject.mutate(
      {
        id: projectId,
        patch: {
          nome: form.nome,
          torre: form.torre,
        },
      },
      {
        onSuccess: () => {
          setSaved(true);
          if (savedTimer.current) clearTimeout(savedTimer.current);
          savedTimer.current = setTimeout(() => setSaved(false), 2000);
        },
      }
    );
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        breadcrumb={[{ label: "Empreendimentos", href: "/dashboard" }, { label: "Configuração" }]}
        title={form.nome || "Novo empreendimento"}
        subtitle="Configure os dados base antes de definir tipologias"
        action={
          <>
            {saved && (
              <span className="text-xs text-functional-success">✓ Salvo</span>
            )}
            <Button
              variant="bordered"
              onPress={handleSave}
              isLoading={updateProject.isPending}
            >
              Salvar rascunho
            </Button>
            <Button onPress={() => router.push("/tipologias")}>
              Avançar para tipologias →
            </Button>
          </>
        }
      />

      <div className="grid gap-5">
        <Card>
          <SectionTitle>Dados do empreendimento</SectionTitle>
          <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-[2fr_1fr]">
            <Input
              label="Nome do empreendimento"
              value={form.nome}
              onValueChange={set("nome")}
              placeholder="Ex: Parque Ibirapuera Residências"
            />
            <Input
              label="Torre / Bloco (opcional)"
              value={form.torre}
              onValueChange={set("torre")}
              placeholder="Ex: Torre A"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input label="Incorporadora" value={project?.incorporadora ?? ""} isDisabled />
          </div>
        </Card>
      </div>
    </div>
  );
}
