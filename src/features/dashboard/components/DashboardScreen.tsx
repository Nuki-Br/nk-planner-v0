"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Input as HeroInput } from "@heroui/react";

import {
  Button,
  Card,
  DataTable,
  Icon,
  PageHeader,
  ProgressBar,
  Select,
  StatCard,
  StatusBadge,
  type DataTableColumn,
} from "@/components/ui";
import { useProjects } from "@/lib/hooks/useProjects";
import { useSelection } from "@/lib/store/selection";
import { STATUS_CFG } from "@/shared/constants/status";
import type { Project, ProjectStatus } from "@/shared/types/domain";

const STATUS_OPTIONS = (
  ["rascunho", "em_preenchimento", "em_revisao", "publicado"] as ProjectStatus[]
).map((s) => ({ value: s, label: STATUS_CFG[s].label }));

// Tela 1 — Dashboard de empreendimentos (protótipo: DashboardScreen).
export function DashboardScreen() {
  const router = useRouter();
  const setActiveProject = useSelection((s) => s.setActiveProject);
  const { data: projects = [] } = useProjects();

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");

  const filtered = projects.filter(
    (p) =>
      p.nome.toLowerCase().includes(search.toLowerCase()) &&
      (!statusFilter || p.status === statusFilter)
  );

  const stats = [
    { label: "Total de empreendimentos", value: projects.length },
    {
      label: "Em andamento",
      value: projects.filter((p) => p.status === "em_revisao" || p.status === "em_preenchimento")
        .length,
      accent: true,
    },
    { label: "Publicados", value: projects.filter((p) => p.status === "publicado").length },
    { label: "Rascunhos", value: projects.filter((p) => p.status === "rascunho").length },
  ];

  // No mock, qualquer projeto abre o mesmo conjunto de dados (THE_PROJECT).
  const openProject = React.useCallback(
    (project: Project) => {
      setActiveProject(project.id);
      router.push("/tipologias");
    },
    [setActiveProject, router]
  );

  const columns: DataTableColumn<Project>[] = [
    {
      key: "nome",
      label: "Empreendimento",
      sortValue: (r) => r.nome,
      render: (r) => (
        <div>
          <span className="font-semibold text-neutral-gray-11">{r.nome}</span>
          <span className="block text-[11px] text-neutral-gray-7">
            {r.torre} · {r.construtora}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortValue: (r) => r.status,
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "enviadoEm",
      label: "Enviado em",
      sortValue: (r) => r.enviadoEm ?? "",
      render: (r) => r.enviadoEm ?? <span className="text-neutral-gray-5">—</span>,
    },
    {
      key: "prazo",
      label: "Prazo retorno",
      sortValue: (r) => r.prazo ?? "",
      render: (r) => r.prazo ?? <span className="text-neutral-gray-5">—</span>,
    },
    {
      key: "preenchimento",
      label: "Preenchimento",
      sortValue: (r) => r.itensPreenchidos,
      render: (r) =>
        r.totalItens > 0 ? (
          <ProgressBar
            value={r.itensPreenchidos}
            max={r.totalItens}
            label={`${r.itensPreenchidos}/${r.totalItens}`}
            className="min-w-36"
          />
        ) : (
          <span className="text-xs text-neutral-gray-5">—</span>
        ),
    },
    {
      key: "acoes",
      label: "",
      render: (r) => (
        <Button variant="bordered" size="sm" onPress={() => openProject(r)}>
          Abrir
        </Button>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Planejamento e Orçamento"
        subtitle="Gerencie os ciclos de planejamento e orçamento dos seus empreendimentos"
        action={
          <Button icon="plus" onPress={() => router.push("/config-base")}>
            Novo empreendimento
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} accent={s.accent} />
        ))}
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <HeroInput
            value={search}
            onValueChange={setSearch}
            placeholder="Buscar empreendimento..."
            variant="bordered"
            radius="sm"
            size="sm"
            startContent={<Icon name="search" size={14} className="text-neutral-gray-6" />}
            classNames={{
              base: "w-[280px] max-w-full flex-none",
              inputWrapper: "!border-small h-10 border-neutral-gray-5 bg-white",
              input: "text-[13px]",
            }}
          />
          <Select
            options={STATUS_OPTIONS}
            placeholder="Todos os status"
            value={statusFilter}
            onValueChange={setStatusFilter}
            small
            className="w-[180px] flex-none"
          />
          <div className="ml-auto">
            <Button variant="ghost" icon="filter" size="sm">
              Filtros
            </Button>
          </div>
        </div>
        <DataTable
          aria-label="Empreendimentos"
          columns={columns}
          rows={filtered}
          rowKey={(r) => r.id}
          onRowClick={openProject}
          emptyText="Nenhum empreendimento encontrado."
        />
      </Card>
    </div>
  );
}
