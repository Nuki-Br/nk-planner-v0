import { cn } from "@/lib/utils";

interface SpinnerProps {
  /** Diâmetro em px. */
  size?: number;
  /** Cor via `text-*` (o anel herda de `currentColor`). */
  className?: string;
}

/** Spinner circular (arco girando). Cor herda de `currentColor` (default teal). */
export function Spinner({ size = 20, className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Carregando"
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-current border-t-transparent text-primary-6",
        className
      )}
      style={{ width: size, height: size }}
    />
  );
}
