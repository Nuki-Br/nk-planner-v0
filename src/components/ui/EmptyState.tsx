import { Icon, type IconName } from "./Icon";

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

/** Estado vazio centralizado: ícone em círculo, título, subtítulo e ação. */
export function EmptyState({ icon = "box", title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-gray-3">
        <Icon name={icon} size={24} className="text-neutral-gray-6" />
      </div>
      <p className="text-[15px] font-bold text-neutral-gray-11">{title}</p>
      {subtitle && <p className="text-[13px] text-neutral-gray-7">{subtitle}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
