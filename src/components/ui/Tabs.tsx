"use client";

import { Tab, Tabs as HeroTabs } from "@heroui/react";

import { cn } from "@/lib/utils";

export interface TabItem {
  key: string;
  label: string;
}

interface TabsProps {
  items: TabItem[];
  selectedKey: string;
  onSelectionChange: (key: string) => void;
  className?: string;
  /** Nome acessível do conjunto de abas (react-aria exige um). */
  "aria-label"?: string;
}

/** Abas sublinhadas em teal (abas de tipologia do orçamento/portal). */
export function Tabs({
  items,
  selectedKey,
  onSelectionChange,
  className,
  "aria-label": ariaLabel = "Abas",
}: TabsProps) {
  return (
    <HeroTabs
      aria-label={ariaLabel}
      variant="underlined"
      selectedKey={selectedKey}
      onSelectionChange={(key) => onSelectionChange(String(key))}
      className={className}
      classNames={{
        tab: "text-[13px]",
        tabContent: cn(
          "text-neutral-gray-7",
          "group-data-[selected=true]:font-semibold group-data-[selected=true]:text-primary-7"
        ),
        cursor: "bg-primary-7",
      }}
    >
      {items.map((item) => (
        <Tab key={item.key} title={item.label} />
      ))}
    </HeroTabs>
  );
}
