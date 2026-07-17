import { Skeleton, TableSkeleton } from "@/components/ui";

// Esqueleto do Construtor de Preço — espelha o layout (cabeçalho + ações,
// alternância Preço/Custos, abas de tipologia e a tabela) enquanto o orçamento
// carrega, no mesmo padrão das demais telas (catálogo, navbar).
export function BudgetScreenSkeleton() {
  return (
    <div className="mx-auto max-w-[1400px]" aria-hidden aria-busy>
      {/* Cabeçalho: breadcrumb + título + ações */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-64" />
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-3.5 w-[520px] max-w-full" />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Skeleton className="h-10 w-48 rounded-lg" />
          <Skeleton className="h-10 w-52 rounded-lg" />
        </div>
      </div>

      {/* Alternância Preço final / Custos base */}
      <div className="mb-3.5 flex items-center gap-3.5">
        <Skeleton className="h-[42px] w-[280px] rounded-lg" />
        <Skeleton className="h-3.5 w-64" />
      </div>

      {/* Barra de ajuda */}
      <Skeleton className="mb-3.5 h-[38px] w-full rounded-lg" />

      {/* Abas de tipologia */}
      <div className="flex gap-6 border-b-2 border-neutral-gray-4 pb-2.5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-4 w-44" />
      </div>

      {/* Tabela */}
      <div className="mt-4 overflow-hidden rounded-lg border border-neutral-gray-4 bg-white">
        <TableSkeleton rows={8} />
      </div>
    </div>
  );
}
