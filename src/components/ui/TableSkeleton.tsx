import { Skeleton } from "./Skeleton";

interface TableSkeletonProps {
  /** Quantidade de linhas fantasma (default 6). */
  rows?: number;
  /** Renderiza uma barra de ferramentas (busca/filtros) acima das linhas. */
  showToolbar?: boolean;
}

// Larguras variadas para as linhas não parecerem um bloco sólido.
const NAME_WIDTHS = ["w-48", "w-40", "w-56", "w-44", "w-52", "w-36"];
const SUB_WIDTHS = ["w-24", "w-32", "w-20", "w-28", "w-24", "w-32"];

/** Placeholder pulsante que imita uma tabela de dados durante o carregamento. */
export function TableSkeleton({ rows = 6, showToolbar = false }: TableSkeletonProps) {
  return (
    <div aria-hidden aria-busy>
      {showToolbar && (
        <div className="flex items-center justify-between gap-3 border-b border-neutral-gray-4 px-4 py-3.5">
          <Skeleton className="h-10 w-72 max-w-full" />
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
      )}
      <div className="flex flex-col">
        <div className="flex items-center gap-4 border-b border-neutral-gray-4 px-4 py-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="ml-auto h-3 w-20" />
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b border-neutral-gray-3 px-4 py-3 last:border-b-0"
          >
            <Skeleton className="h-9 w-9 flex-none rounded-md" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className={`h-3.5 ${NAME_WIDTHS[i % NAME_WIDTHS.length]}`} />
              <Skeleton className={`h-3 ${SUB_WIDTHS[i % SUB_WIDTHS.length]}`} />
            </div>
            <Skeleton className="ml-auto h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
