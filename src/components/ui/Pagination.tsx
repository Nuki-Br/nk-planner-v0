"use client";

import { Pagination as HeroPagination } from "@heroui/react";

import { cn } from "@/lib/utils";

interface PaginationProps {
  /** Página atual (1-based). */
  page: number;
  /** Total de páginas. Menos de 2 → não renderiza. */
  total: number;
  onChange: (page: number) => void;
  className?: string;
}

/** Paginação numerada. Centraliza o estado ativo teal dos tokens Nuki. */
export function Pagination({ page, total, onChange, className }: PaginationProps) {
  if (total < 2) return null;

  return (
    <HeroPagination
      page={page}
      total={total}
      onChange={onChange}
      radius="sm"
      variant="light"
      classNames={{
        item: "text-sm-p text-neutral-gray-9",
        cursor: "bg-primary-7 text-white font-semibold",
        wrapper: cn("gap-1", className),
      }}
    />
  );
}
