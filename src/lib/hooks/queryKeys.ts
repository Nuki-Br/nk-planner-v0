// Fábrica central de query keys do React Query — padrão ["<recurso>", ...params]
// (docs/conventions.md). Toda invalidação referencia estas keys.
export const queryKeys = {
  projects: ["projects"] as const,
  project: (id: number) => ["projects", id] as const,
  tipologias: ["tipologias"] as const,
  tipologia: (id: number) => ["tipologias", id] as const,
  materiais: ["materiais"] as const,
  kits: ["kits"] as const,
  unitGroups: ["unit-groups"] as const,
  torres: ["torres"] as const,
  budgetColumns: (projectId: number) => ["budget-columns", projectId] as const,
  sharedAmbientes: ["shared-ambientes"] as const,
  versions: ["versions"] as const,
  /** rowKey = String(optionId) (id da linha Material). */
  comments: (rowKey: string) => ["comments", rowKey] as const,
  commentThreads: ["comments"] as const,
  /** Payload público do portal — muda com o token e com a senha fornecida. */
  portal: (token: string, senha: string | null) => ["portal", token, senha ?? ""] as const,
};
