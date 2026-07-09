"use client";

import { Card as HeroCard, CardBody } from "@heroui/react";

import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  /** Padding interno em px. Use 0 para tabelas encostadas na borda. */
  padding?: number;
  className?: string;
}

/** Card Nuki: superfície branca, borda cinza, radius 8 (Card do protótipo). */
export function Card({ children, padding = 24, className }: CardProps) {
  return (
    <HeroCard
      shadow="none"
      radius="sm"
      className={cn("border border-neutral-gray-5 bg-white", className)}
    >
      <CardBody className="gap-0" style={{ padding }}>
        {children}
      </CardBody>
    </HeroCard>
  );
}
