"use client";

import { Avatar } from "@heroui/react";

interface HeaderProps {
  title?: string;
}

export function Header({ title = "Planejamento e orçamento" }: HeaderProps) {
  return (
    <header className="fixed right-0 top-0 z-10 flex h-16 items-center justify-between border-b border-neutral-gray-5 bg-white px-6"
      style={{ left: 212 }}
    >
      <h1 className="text-title-4 text-neutral-gray-10">{title}</h1>
      <div className="flex items-center gap-3">
        <span className="text-sm-p text-neutral-gray-7">Beta</span>
        <Avatar size="sm" name="Nuki" className="bg-primary-4 text-white" />
      </div>
    </header>
  );
}
