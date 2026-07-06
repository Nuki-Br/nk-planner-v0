import { cn } from "@/lib/utils";

/** Badge que marca uma entidade como Kit (agrupamento) — distinto dos chips de categoria. */
export function KitBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-primary-8 px-[9px] py-0.5 text-[11px] font-bold text-white",
        className
      )}
    >
      <span className="leading-none">⬡</span> Kit
    </span>
  );
}
