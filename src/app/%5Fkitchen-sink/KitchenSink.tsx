"use client";

import React from "react";

import {
  Breadcrumbs,
  Button,
  Card,
  Chip,
  DataTable,
  EmptyState,
  Icon,
  ICON_NAMES,
  Input,
  Modal,
  PageHeader,
  ProgressBar,
  Select,
  StatCard,
  StatusBadge,
  StepNav,
  Tabs,
  Textarea,
  type ButtonVariant,
  type DataTableColumn,
} from "@/components/ui";
import { fmtBRL, fmtNum, parseBR } from "@/lib/utils";
import { CAT_COLORS, CATEGORIAS } from "@/shared/constants/categorias";
import { STATUS_KEYS } from "@/shared/constants/status";
import { UNIDADES } from "@/shared/constants/unidades";

const BUTTON_VARIANTS: ButtonVariant[] = ["solid", "bordered", "teal", "ghost", "danger"];

const WORKFLOW_STEPS = [
  { key: "project-setup", label: "Configuração" },
  { key: "typologies", label: "Tipologias" },
  { key: "materials-catalog", label: "Materiais" },
  { key: "budget-table", label: "Construtor de Preço" },
  { key: "publish", label: "Publicação" },
];

interface SampleRow {
  id: string;
  nome: string;
  categoria: (typeof CATEGORIAS)[number];
  custo: number;
}

const SAMPLE_ROWS: SampleRow[] = [
  { id: "piso-001", nome: "Porcelanato Portobello 90x90", categoria: "Piso", custo: 189.9 },
  { id: "metal-014", nome: "Torneira Deca Link", categoria: "Metal", custo: 420 },
  { id: "pedra-003", nome: "Bancada em quartzo Branco", categoria: "Pedra", custo: 1250.5 },
  { id: "rodape-002", nome: "Rodapé poliestireno 10cm", categoria: "Rodapé", custo: 32.75 },
];

const TABLE_COLUMNS: DataTableColumn<SampleRow>[] = [
  {
    key: "id",
    label: "Código",
    render: (r) => <span className="font-mono text-xs text-neutral-gray-8">{r.id}</span>,
    sortValue: (r) => r.id,
  },
  {
    key: "nome",
    label: "Especificação",
    render: (r) => r.nome,
    sortValue: (r) => r.nome,
  },
  {
    key: "categoria",
    label: "Categoria",
    render: (r) => <Chip className={CAT_COLORS[r.categoria]}>{r.categoria}</Chip>,
    sortValue: (r) => r.categoria,
  },
  {
    key: "custo",
    label: "Custo",
    align: "end",
    render: (r) => fmtBRL(r.custo),
    sortValue: (r) => r.custo,
  },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-title-4 text-neutral-gray-10">{title}</h2>
      {children}
    </section>
  );
}

export function KitchenSink() {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [categoria, setCategoria] = React.useState("");
  const [tab, setTab] = React.useState("t1");
  const [clickedRow, setClickedRow] = React.useState<string | null>(null);
  const [brInput, setBrInput] = React.useState("1,5");

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-8 py-10">
      <PageHeader
        breadcrumb={[{ label: "Empreendimentos", href: "/dashboard" }, { label: "Kitchen sink" }]}
        title="Kitchen sink — primitivos Nuki"
        subtitle="Conferência visual dos componentes de src/components/ui/ (Fase 0, dev only)"
        action={
          <>
            <Button variant="bordered">Ação secundária</Button>
            <Button variant="teal" icon="plus">
              Ação primária
            </Button>
          </>
        }
      />

      <Section title="StepNav">
        <StepNav steps={WORKFLOW_STEPS} currentKey="materials-catalog" />
      </Section>

      <Section title="Button">
        <Card>
          <div className="flex flex-col gap-4">
            {(["sm", "md", "lg"] as const).map((size) => (
              <div key={size} className="flex flex-wrap items-center gap-3">
                <span className="w-8 text-xs text-neutral-gray-7">{size}</span>
                {BUTTON_VARIANTS.map((v) => (
                  <Button key={v} variant={v} size={size}>
                    {v}
                  </Button>
                ))}
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-3">
              <span className="w-8 text-xs text-neutral-gray-7">—</span>
              <Button variant="teal" icon="plus">
                Com ícone
              </Button>
              <Button variant="solid" isDisabled>
                Desabilitado
              </Button>
              <Button variant="bordered" fullWidth>
                fullWidth
              </Button>
            </div>
          </div>
        </Card>
      </Section>

      <Section title="Input / Select / Textarea">
        <Card>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Nome do empreendimento" placeholder="Ex.: Residencial Aurora" />
            <Input label="Compacto (small)" small placeholder="48px de altura" />
            <Input
              label="Com erro"
              isInvalid
              errorMessage="Campo obrigatório"
              defaultValue="valor inválido"
            />
            <Input label="Desabilitado" isDisabled defaultValue="Incorporadora Alfa" />
            <Input
              label="Com descrição"
              description="Texto auxiliar de 11px, como no protótipo"
              placeholder="MM/AAAA"
            />
            <Select
              label="Categoria"
              options={CATEGORIAS.map((c) => ({ value: c, label: c }))}
              value={categoria}
              onValueChange={setCategoria}
            />
            <div className="md:col-span-2">
              <Textarea label="Descrição" placeholder="Observações da tipologia..." />
            </div>
          </div>
        </Card>
      </Section>

      <Section title="StatusBadge">
        <Card>
          <div className="flex flex-wrap gap-2">
            {STATUS_KEYS.map((s) => (
              <StatusBadge key={s} status={s} />
            ))}
          </div>
        </Card>
      </Section>

      <Section title="Chip (tons) e categorias (CAT_COLORS)">
        <Card>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {(["gray", "teal", "blue", "violet", "pink", "amber", "emerald", "sky", "red"] as const).map(
                (tone) => (
                  <Chip key={tone} tone={tone}>
                    {tone}
                  </Chip>
                )
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIAS.map((c) => (
                <Chip key={c} className={CAT_COLORS[c]}>
                  {c}
                </Chip>
              ))}
              <Chip tone="teal">⬡ Kit</Chip>
            </div>
            <p className="text-xs text-neutral-gray-7">
              Unidades do domínio: {UNIDADES.join(" · ")}
            </p>
          </div>
        </Card>
      </Section>

      <Section title="ProgressBar">
        <Card>
          <div className="flex flex-col gap-4">
            <ProgressBar value={34} />
            <ProgressBar value={100} />
            <ProgressBar value={98} max={214} label="98/214" />
          </div>
        </Card>
      </Section>

      <Section title="StatCard">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Total de empreendimentos" value={6} />
          <StatCard label="Em andamento" value={3} accent sub="revisão + preenchimento" />
          <StatCard label="Publicados" value={2} />
          <StatCard label="Rascunhos" value={1} />
        </div>
      </Section>

      <Section title="DataTable (ordenável; clique na linha)">
        <Card padding={0}>
          <DataTable
            aria-label="Materiais de exemplo"
            columns={TABLE_COLUMNS}
            rows={SAMPLE_ROWS}
            rowKey={(r) => r.id}
            onRowClick={(r) => setClickedRow(r.nome)}
          />
        </Card>
        {clickedRow && (
          <p className="text-xs text-neutral-gray-7">Linha clicada: {clickedRow}</p>
        )}
        <Card padding={0}>
          <DataTable<SampleRow>
            aria-label="Tabela vazia"
            columns={TABLE_COLUMNS}
            rows={[]}
            rowKey={(r) => r.id}
            emptyText="Nenhum material cadastrado."
          />
        </Card>
      </Section>

      <Section title="Tabs">
        <Card>
          <Tabs
            items={[
              { key: "t1", label: "Tipo 01 — 45m²" },
              { key: "t2", label: "Tipo 02 — 62m²" },
              { key: "t3", label: "Garden — 98m²" },
            ]}
            selectedKey={tab}
            onSelectionChange={setTab}
          />
          <p className="mt-2 text-xs text-neutral-gray-7">Aba ativa: {tab}</p>
        </Card>
      </Section>

      <Section title="Modal">
        <Card>
          <Button variant="teal" onPress={() => setModalOpen(true)}>
            Abrir modal
          </Button>
          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Nova tipologia"
            width={520}
            actions={
              <>
                <Button variant="ghost" onPress={() => setModalOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="teal" onPress={() => setModalOpen(false)}>
                  Salvar
                </Button>
              </>
            }
          >
            <div className="flex flex-col gap-4">
              <Input label="Nome" placeholder="Ex.: Tipo 03" />
              <Input label="Metragem (m²)" placeholder="Ex.: 72,5" />
            </div>
          </Modal>
        </Card>
      </Section>

      <Section title="EmptyState">
        <Card padding={0}>
          <EmptyState
            icon="box"
            title="Nenhum material cadastrado"
            subtitle="Adicione materiais ao catálogo para configurar os componentes."
            action={<Button variant="teal" icon="plus">Adicionar material</Button>}
          />
        </Card>
      </Section>

      <Section title="Breadcrumbs">
        <Card>
          <Breadcrumbs
            items={[
              { label: "Empreendimentos", href: "/dashboard" },
              { label: "Tipologias", href: "/tipologias" },
              { label: "Tipo 01" },
            ]}
          />
        </Card>
      </Section>

      <Section title="Icon (mapa completo)">
        <Card>
          <div className="flex flex-wrap gap-3">
            {ICON_NAMES.map((n) => (
              <span
                key={n}
                className="flex items-center gap-1.5 rounded-lg bg-neutral-gray-2 px-2 py-1 text-xs text-neutral-gray-8"
              >
                <Icon name={n} size={15} className="text-neutral-gray-9" />
                {n}
              </span>
            ))}
          </div>
        </Card>
      </Section>

      <Section title="Formatadores (fmtBRL · fmtNum · parseBR)">
        <Card>
          <div className="flex flex-col gap-3 text-[13px] text-neutral-gray-11">
            <p>
              fmtBRL(1234.5) → <strong>{fmtBRL(1234.5)}</strong> · fmtBRL(null) →{" "}
              <strong>{fmtBRL(null)}</strong>
            </p>
            <p>
              fmtNum(0.1234, 3) → <strong>{fmtNum(0.1234, 3)}</strong> · fmtNum(1234.5) →{" "}
              <strong>{fmtNum(1234.5)}</strong>
            </p>
            <div className="flex items-end gap-3">
              <Input
                label="Entrada BR"
                small
                value={brInput}
                onValueChange={setBrInput}
                className="max-w-40"
              />
              <p className="pb-3">
                parseBR(&quot;{brInput}&quot;) → <strong>{parseBR(brInput)}</strong>
              </p>
            </div>
          </div>
        </Card>
      </Section>
    </div>
  );
}
