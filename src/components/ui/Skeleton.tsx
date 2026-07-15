import { cn } from "@/lib/utils";

interface SkeletonProps {
  /** Classes de tamanho/forma (ex.: "h-4 w-32 rounded-nk-xl"). */
  className?: string;
}

/**
 * Placeholder pulsante para conteúdo em carregamento.
 *
 * Tailwind puro na mão (como o Spinner), não o Skeleton do HeroUI: o do HeroUI
 * traz um wrapper com máscara e transição própria que brigaria com os tokens de
 * raio/cor daqui — e a versão pulsante é literalmente uma div.
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-neutral-gray-3", className)}
    />
  );
}
