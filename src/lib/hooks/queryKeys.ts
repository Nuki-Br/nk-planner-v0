// Fábrica central de query keys do React Query — padrão ["<recurso>", ...params]
// (docs/conventions.md). Toda invalidação referencia estas keys.
export const queryKeys = {
  projects: ["projects"] as const,
  project: (id: string) => ["projects", id] as const,
  tipologias: ["tipologias"] as const,
  tipologia: (id: string) => ["tipologias", id] as const,
  materiais: ["materiais"] as const,
  kits: ["kits"] as const,
  unitGroups: ["unit-groups"] as const,
  torres: ["torres"] as const,
  budgetColumns: (projectId: string) => ["budget-columns", projectId] as const,
  sharedAmbientes: ["shared-ambientes"] as const,
  versions: ["versions"] as const,
  comments: (rowKey: string) => ["comments", rowKey] as const,
  pendingItems: ["pending-items"] as const,
};
