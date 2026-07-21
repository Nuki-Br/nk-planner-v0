"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Input as HeroInput } from "@heroui/react";

import {
  Button,
  Card,
  DataTable,
  EmptyState,
  Icon,
  PageHeader,
  ProgressBar,
  Select,
  Skeleton,
  StatCard,
  StatusBadge,
  TableSkeleton,
  type DataTableColumn,
} from "@/components/ui";
import { useProjects } from "@/lib/hooks/useProjects";
import { useSelection } from "@/lib/store/selection";
import { STATUS_CFG } from "@/shared/constants/status";
import type { Project, ProjectStatus } from "@/shared/types/domain";

import { EmpreendimentoModal } from "./EmpreendimentoModal";

const STATUS_OPTIONS = (
  ["rascunho", "em_preenchimento", "em_revisao", "publicado"] as ProjectStatus[]
).map((s) => ({ value: s, label: STATUS_CFG[s].label }));

// Tela 1 — Dashboard de empreendimentos (protótipo: DashboardScreen).
export function DashboardScreen() {
  const router = useRouter();
  const setActiveProject = useSelection((s) => s.setActiveProject);
  const { data: projects = [], isLoading, isError, refetch } = useProjects();

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  // Um estado só: null = fechado, { project: null } = criar, { project } =
  // editar. Dois booleanos permitiriam representar "aberto nos dois modos".
  const [modal, setModal] = React.useState<{ project: Project | null } | null>(null);

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
          {r.torre !== "" && (
            <span className="block text-[11px] text-neutral-gray-7">{r.torre}</span>
          )}
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
      // stopPropagation no wrapper: a linha inteira é clicável (onRowClick) e o
      // Button do HeroUI usa onPress, que não expõe o evento DOM para barrar.
      render: (r) => (
        <div
          className="flex items-center justify-end gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            title="Editar empreendimento"
            onClick={() => setModal({ project: r })}
            className="flex shrink-0 p-1.5 text-neutral-gray-6 hover:text-primary-7"
          >
            <Icon name="edit" size={15} />
          </button>
          <Button variant="bordered" size="sm" onPress={() => openProject(r)}>
            Abrir
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Planejamento e Orçamento"
        subtitle="Gerencie os ciclos de planejamento e orçamento dos seus empreendimentos"
        action={
          <Button icon="plus" onPress={() => setModal({ project: null })}>
            Novo empreendimento
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <StatCard
            key={s.label}
            label={s.label}
            value={s.value}
            accent={s.accent}
            isLoading={isLoading}
          />
        ))}
      </div>

      <Card>
        {isLoading ? (
          <div aria-hidden>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <Skeleton className="h-10 w-[280px] max-w-full" />
              <Skeleton className="h-10 w-[180px]" />
            </div>
            <TableSkeleton rows={5} />
          </div>
        ) : isError ? (
          <EmptyState
            icon="warning"
            title="Não foi possível carregar os empreendimentos"
            subtitle="Verifique sua conexão e tente novamente."
            action={
              <Button variant="bordered" onPress={() => void refetch()}>
                Tentar novamente
              </Button>
            }
          />
        ) : projects.length === 0 ? (
          <EmptyState
            icon="building"
            title="Nenhum empreendimento ainda"
            subtitle="Crie seu primeiro empreendimento para começar o planejamento e o orçamento."
            action={
              <Button variant="teal" icon="plus" onPress={() => setModal({ project: null })}>
                Novo empreendimento
              </Button>
            }
          />
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <HeroInput
                value={search}
                onValueChange={setSearch}
                aria-label="Buscar empreendimento"
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
                aria-label="Filtrar por status"
                value={statusFilter}
                onValueChange={setStatusFilter}
                small
                className="w-[180px] flex-none"
                classNames={{
                  trigger: "h-10 min-h-10 !border-small border-neutral-gray-5 bg-white",
                  value: "text-[13px]",
                }}
              />
            </div>
            <DataTable
              aria-label="Empreendimentos"
              columns={columns}
              rows={filtered}
              rowKey={(r) => r.id}
              onRowClick={openProject}
              emptyText="Nenhum empreendimento encontrado."
            />
          </>
        )}
      </Card>

      <EmpreendimentoModal
        open={modal !== null}
        project={modal?.project ?? null}
        onClose={() => setModal(null)}
        // Criar e já cair no fluxo — o mesmo gesto do "Abrir".
        onCreated={openProject}
      />
    </div>
  );
}
