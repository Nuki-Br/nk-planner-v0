"use client";

import { BreadcrumbItem, Breadcrumbs as HeroBreadcrumbs } from "@heroui/react";

export interface BreadcrumbEntry {
  label: string;
  /** Com href vira link (teal); sem href é o nível atual (cinza). */
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbEntry[];
  className?: string;
}

/** Trilha de navegação usada pelo PageHeader. */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <HeroBreadcrumbs
      size="sm"
      className={className}
      itemClasses={{
        item: "text-xs data-[current=true]:text-neutral-gray-7",
        separator: "text-neutral-gray-6",
      }}
    >
      {items.map((item, i) => (
        <BreadcrumbItem key={`${item.label}-${i}`} href={item.href}>
          <span className={item.href ? "text-primary-7" : undefined}>{item.label}</span>
        </BreadcrumbItem>
      ))}
    </HeroBreadcrumbs>
  );
}
