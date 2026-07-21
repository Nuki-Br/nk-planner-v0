// Fábrica central de query keys do React Query — padrão ["<recurso>", ...params]
// (docs/conventions.md). Toda invalidação referencia estas keys.
export const queryKeys = {
  projects: ["projects"] as const,
  project: (id: number) => ["projects", id] as const,
  tipologias: ["tipologias"] as const,
  tipologia: (id: number) => ["tipologias", id] as const,
  materiais: ["materiais"] as const,
  kits: ["kits"] as const,
  /**
   * Lista paginada do catálogo (materiais + kits) — mesmo par parametrizada +
   * prefixo cru do Media Center. `excludeKey` é a lista de ids excluídos já
   * normalizada em string ordenada (ver useCatalogEntities): um array recriado
   * a cada render churnaria a key e viraria refetch em loop.
   */
  catalogEntities: (
    tipo: string,
    page: number,
    search: string,
    categoriaId: string,
    excludeKey: string
  ) => ["catalog-entities", tipo, page, search, categoriaId, excludeKey] as const,
  /** Prefixo de TODAS as listas de catálogo. */
  catalogEntitiesAll: ["catalog-entities"] as const,
  categorias: ["categorias"] as const,
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

  // ─── Media Center ─────────────────────────────────────────────────────
  // Cada recurso tem a key parametrizada + um prefixo cru para invalidar o
  // conjunto (mesmo padrão de comments/commentThreads acima). `null` de pasta
  // vira "root" porque null não distingue bem dentro de uma key.
  /** Lista paginada de arquivos. */
  mediaFiles: (
    folderId: number | null,
    page: number,
    search: string,
    fileType: string
  ) => ["media-files", folderId ?? "root", page, search, fileType] as const,
  /** Prefixo de TODAS as listas de arquivos. */
  mediaFilesAll: ["media-files"] as const,
  mediaRecent: (fileType: string) => ["media-recent", fileType] as const,
  mediaRecentAll: ["media-recent"] as const,
  mediaFolders: (parentFolderId: number | null) =>
    ["media-folders", parentFolderId ?? "root"] as const,
  mediaFoldersAll: ["media-folders"] as const,
  mediaFolderTree: ["media-folder-tree"] as const,
  mediaUsage: ["media-usage"] as const,
  mediaFileUsages: (id: number) => ["media-file-usages", id] as const,
};
