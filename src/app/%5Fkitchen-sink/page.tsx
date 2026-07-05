import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { KitchenSink } from "./KitchenSink";

export const metadata: Metadata = { title: "Kitchen sink — Nuki Planner" };

// Vitrine dos primitivos de src/components/ui/ para conferência visual.
// Disponível apenas em desenvolvimento (Fase 0).
export default function KitchenSinkPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <KitchenSink />;
}
