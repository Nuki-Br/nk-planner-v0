"use client";

import { Icon, type IconName } from "@/components/ui";
import { cn } from "@/lib/utils";

interface RowIconBtnProps {
  icon: IconName;
  title: string;
  onClick: (e: React.MouseEvent) => void;
  danger?: boolean;
}

/** Botão compacto só-ícone das ações de linha (ambiente/componente). */
export function RowIconBtn({ icon, title, onClick, danger = false }: RowIconBtnProps) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-lg text-neutral-gray-7 transition-colors",
        danger
          ? "hover:bg-functional-error-light hover:text-functional-error"
          : "hover:bg-neutral-gray-3 hover:text-primary-7"
      )}
    >
      <Icon name={icon} size={15} />
    </button>
  );
}
