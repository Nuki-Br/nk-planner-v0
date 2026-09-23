// Mapa status → label PT-BR + classes de cor (bg/texto), espelhando o
// STATUS_CFG do protótipo. HeroUI só tem 5 cores semânticas, então o
// StatusBadge usa esta tabela de classes Tailwind (tokens em tailwind.config.ts).
export type StatusKey =
  | "rascunho"
  | "em_preenchimento"
  | "em_revisao"
  | "publicado"
  | "completa"
  | "incompleta"
  | "preenchido"
  | "pendente"
  | "sem_custo"
  | "com_comentario"
  | "variacao_alta";

export interface StatusConfig {
  label: string;
  className: string;
}

export const STATUS_CFG: Record<StatusKey, StatusConfig> = {
  rascunho: { label: "Rascunho", className: "bg-neutral-gray-4 text-neutral-gray-8" },
  em_preenchimento: {
    label: "Em preenchimento",
    className: "bg-tint-blue-bg text-tint-blue-fg",
  },
  em_revisao: {
    label: "Em revisão",
    className: "bg-functional-warning-light text-tint-orange-fg",
  },
  publicado: {
    label: "Publicado",
    className: "bg-functional-success-light text-functional-success",
  },
  completa: {
    label: "Completa",
    className: "bg-functional-success-light text-functional-success",
  },
  incompleta: { label: "Incompleta", className: "bg-tint-red-bg text-tint-red-fg" },
  preenchido: {
    label: "Preenchido",
    className: "bg-functional-success-light text-functional-success",
  },
  pendente: { label: "Pendente", className: "bg-neutral-gray-4 text-neutral-gray-7" },
  sem_custo: { label: "Sem custo", className: "bg-primary-1 text-primary-7" },
  com_comentario: {
    label: "Com comentário",
    className: "bg-tint-amber-bg text-tint-amber-fg",
  },
  variacao_alta: {
    label: "Variação alta",
    className: "bg-tint-red-bg text-tint-red-fg",
  },
};

export const STATUS_KEYS = Object.keys(STATUS_CFG) as StatusKey[];
