import { AMB_ICONS } from "../ambIcons";

/** Ícone de ambiente (single-path 24×24, herda a cor via currentColor). */
export function AmbIcon({
  name,
  size = 20,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const d = AMB_ICONS[name] ?? AMB_ICONS.home;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d={d} />
    </svg>
  );
}
