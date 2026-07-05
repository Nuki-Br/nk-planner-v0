import { cn } from "@/lib/utils";

export type ChipTone =
  | "gray"
  | "teal"
  | "blue"
  | "violet"
  | "pink"
  | "amber"
  | "emerald"
  | "sky"
  | "red";

const TONE_CLASSES: Record<ChipTone, string> = {
  gray: "bg-neutral-gray-4 text-neutral-gray-8",
  teal: "bg-primary-1 text-primary-7",
  blue: "bg-tint-blue-bg text-tint-blue-fg",
  violet: "bg-tint-violet-bg text-tint-violet-fg",
  pink: "bg-tint-pink-bg text-tint-pink-fg",
  amber: "bg-tint-amber-bg text-tint-amber-fg",
  emerald: "bg-tint-emerald-bg text-tint-emerald-fg",
  sky: "bg-tint-sky-bg text-tint-sky-fg",
  red: "bg-tint-red-bg text-tint-red-fg",
};

interface ChipProps {
  children: React.ReactNode;
  tone?: ChipTone;
  className?: string;
}

/**
 * Chip pastel genérico (categorias, marcadores). Para status de fluxo use
 * StatusBadge; para categorias de material combine com CAT_COLORS via className.
 */
export function Chip({ children, tone = "gray", className }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        TONE_CLASSES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
