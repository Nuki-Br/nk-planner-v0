"use client";

import { Chip, EmptyState, PageHeader, type BreadcrumbEntry } from "@/components/ui";

interface UnderConstructionProps {
  title: string;
  subtitle?: string;
  breadcrumb?: BreadcrumbEntry[];
  /** Fase do plano em que esta tela será construída. */
  fase: number;
  action?: React.ReactNode;
}

/** Esqueleto padrão das telas ainda não migradas (Fase 2). */
export function UnderConstruction({
  title,
  subtitle,
  breadcrumb,
  fase,
  action,
}: UnderConstructionProps) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} breadcrumb={breadcrumb} action={action} />
      <div className="rounded-lg border border-neutral-gray-5 bg-white">
        <EmptyState
          icon="tune"
          title="Em construção"
          subtitle="Esta tela será migrada do protótipo nas próximas fases."
          action={<Chip tone="teal">Fase {fase}</Chip>}
        />
      </div>
    </div>
  );
}
