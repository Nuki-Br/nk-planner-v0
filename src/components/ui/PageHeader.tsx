"use client";

import { cn } from "@/lib/utils";

import { Breadcrumbs, type BreadcrumbEntry } from "./Breadcrumbs";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumb?: BreadcrumbEntry[];
  /** Ações à direita (botões). */
  action?: React.ReactNode;
  className?: string;
}

/** Cabeçalho de tela: breadcrumb, título, subtítulo e ações à direita. */
export function PageHeader({ title, subtitle, breadcrumb, action, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        {breadcrumb && breadcrumb.length > 0 && (
          <Breadcrumbs items={breadcrumb} className="mb-1.5" />
        )}
        <h1 className="text-[22px] font-bold leading-tight text-neutral-gray-11">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-[13px] text-neutral-gray-7">{subtitle}</p>}
      </div>
      {action && (
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">{action}</div>
      )}
    </div>
  );
}
