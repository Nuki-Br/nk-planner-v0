import { cn } from "@/lib/utils";

import { Spinner } from "./Spinner";

interface LoadingStateProps {
  /** Rótulo abaixo do spinner. `null` esconde o texto. */
  label?: string | null;
  className?: string;
}

/** Estado de carregamento centralizado (par do EmptyState) para telas/seções. */
export function LoadingState({ label = "Carregando…", className }: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-16 text-center",
        className
      )}
    >
      <Spinner size={28} />
      {label && <p className="text-[13px] text-neutral-gray-7">{label}</p>}
    </div>
  );
}
