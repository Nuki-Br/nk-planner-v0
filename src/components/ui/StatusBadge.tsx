import { cn } from "@/lib/utils";
import { STATUS_CFG, type StatusKey } from "@/shared/constants/status";

interface StatusBadgeProps {
  status: StatusKey;
  /** Sobrescreve o label padrão do status. */
  label?: string;
  className?: string;
}

/** Badge de status com o mapa de cores do protótipo (STATUS_CFG). */
export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const cfg = STATUS_CFG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        cfg.className,
        className
      )}
    >
      {label ?? cfg.label}
    </span>
  );
}
