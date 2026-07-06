"use client";

import React from "react";
import { useRouter } from "next/navigation";

import { Button, Card, Input, PageHeader } from "@/components/ui";
import { SEED_ACTIVE_PROJECT_ID } from "@/lib/data/seed";
import { useProject, useUpdateProject } from "@/lib/hooks/useProjects";
import { useSelection } from "@/lib/store/selection";
import { parseBR } from "@/lib/utils";
import type { Project } from "@/shared/types/domain";

interface FormState {
  nome: string;
  torre: string;
  construtora: string;
  email: string;
  inccBase: string;
  taxConstrutora: string;
  taxINCC: string;
  taxIncorporadora: string;
}

function toForm(p: Project): FormState {
  return {
    nome: p.nome,
    torre: p.torre,
    construtora: p.construtora,
    email: p.emailConstrutora ?? "",
    inccBase: p.inccBase ?? "",
    taxConstrutora: String(p.taxas?.construtora ?? 8),
    taxINCC: String(p.taxas?.incc ?? 5),
    taxIncorporadora: String(p.taxas?.incorporadora ?? 22),
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
  const activeProjectId = useSelection((s) => s.activeProjectId);
  const projectId = activeProjectId ?? SEED_ACTIVE_PROJECT_ID;
  const { data: project } = useProject(projectId);
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
          construtora: form.construtora,
          emailConstrutora: form.email,
          inccBase: form.inccBase,
          taxas: {
            construtora: parseBR(form.taxConstrutora),
            incc: parseBR(form.taxINCC),
            incorporadora: parseBR(form.taxIncorporadora),
          },
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
            <Input label="Incorporadora" value="Grupo Axis Incorporações" isDisabled />
            <Input
              label="Data base INCC"
              value={form.inccBase}
              onValueChange={set("inccBase")}
              placeholder="MM/AAAA"
            />
          </div>
        </Card>

        <Card>
          <SectionTitle sub="A construtora receberá um link para preencher os custos dos materiais">
            Construtora
          </SectionTitle>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              label="Nome da construtora"
              value={form.construtora}
              onValueChange={set("construtora")}
              placeholder="Ex: Vertex Engenharia"
            />
            <Input
              label="E-mail(s) para envio do link"
              value={form.email}
              onValueChange={set("email")}
              placeholder="email@construtora.com"
              type="email"
            />
          </div>
        </Card>

        <Card>
          <SectionTitle sub="Esses valores se aplicam a todos os itens por padrão. Podem ser sobrescritos por componente.">
            Taxas globais de formação de preço
          </SectionTitle>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Input
              label="Taxa construtora (%)"
              value={form.taxConstrutora}
              onValueChange={set("taxConstrutora")}
              type="number"
              description="Aplicada sobre o custo de troca"
            />
            <Input
              label="Contingência INCC (%)"
              value={form.taxINCC}
              onValueChange={set("taxINCC")}
              type="number"
              description="Aplicada sobre o custo de troca"
            />
            <Input
              label="Taxa incorporadora (%)"
              value={form.taxIncorporadora}
              onValueChange={set("taxIncorporadora")}
              type="number"
              description="Aplicada sobre o custo total"
            />
          </div>
          <div className="mt-4 rounded-lg bg-primary-1 px-4 py-3 text-xs text-primary-8">
            <strong>Fórmula:</strong> Preço final = Custo de troca + Taxa construtora +
            Contingência INCC + Taxa incorporadora
          </div>
        </Card>
      </div>
    </div>
  );
}
