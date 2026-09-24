// Fábrica central de query keys do React Query — padrão ["<recurso>", ...params]
// (docs/conventions.md). Toda invalidação referencia estas keys.
export const queryKeys = {
  projects: ["projects"] as const,
  project: (id: number) => ["projects", id] as const,
  /**
   * Raiz das tipologias — existe SÓ para invalidação em massa (useTreeMutation
   * cobre lista + detalhes num invalidate). Não a substitua por `tipologias(0)`:
   * as 21 mutações da árvore dependem dela ser um prefixo puro.
   */
  tipologiasRoot: ["tipologias"] as const,
  /** O discriminante "list"/"detail" evita que ["tipologias", projectId] e
   *  ["tipologias", id] virem a MESMA key com formas incompatíveis. */
  tipologias: (projectId: number) => ["tipologias", "list", projectId] as const,
  tipologia: (id: number) => ["tipologias", "detail", id] as const,
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
  unitGroups: (projectId: number) => ["unit-groups", projectId] as const,
  /** Raiz — para quem invalida sem saber de qual empreendimento é o grupo. */
  unitGroupsRoot: ["unit-groups"] as const,
  torres: (projectId: number) => ["torres", projectId] as const,
  budgetColumns: (projectId: number) => ["budget-columns", projectId] as const,
  /** Custo base por empreendimento (aba "Custos base"), já com a composição. */
  custosBase: (projectId: number) => ["custos-base", projectId] as const,
  /** Insumos da org com o preço deste empreendimento (aba "Itens de custo"). */
  costItems: (projectId: number) => ["itens-de-custo", projectId] as const,
  /** Rascunho de precificação (optionId → overrides). */
  pricing: (projectId: number) => ["pricing", projectId] as const,
  /** Diff rascunho × publicado — badge de status e modal de publicar. */
  pricingDiff: (projectId: number) => ["pricing-diff", projectId] as const,
  sharedAmbientes: (projectId: number) => ["shared-ambientes", projectId] as const,
  sharedAmbientesRoot: ["shared-ambientes"] as const,
  versions: (projectId: number) => ["versions", projectId] as const,
  /**
   * Raiz dos comentários — cobre a thread aberta E o mapa de contadores num
   * invalidate só (é disso que useAppendComment depende).
   */
  commentsRoot: ["comments"] as const,
  /** rowKey = String(optionId) (id da linha Material). */
  comments: (rowKey: string) => ["comments", "row", rowKey] as const,
  commentThreads: (projectId: number) => ["comments", "threads", projectId] as const,
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

// Mutation keys das gravações otimistas do Construtor de Preço. A reconciliação
// (`isMutating`) e o gate de publicar (`waitForSaves`) localizam as gravações
// em voo por estas keys — um literal digitado errado num dos lados desligaria
// a proteção em silêncio, por isso a fábrica única.
export const mutationKeys = {
  savePricing: (projectId: number) => ["save-pricing", projectId] as const,
  /** Custo mat/MO, coeficiente do material e qtd de linha de composição (otimistas). */
  saveCusto: (projectId: number) => ["save-custo", projectId] as const,
  /** Identidade/preço de um insumo (otimista). */
  saveCostItem: (projectId: number) => ["save-cost-item", projectId] as const,
  /** Operações estruturais da composição e criação/remoção de insumos. */
  composicao: (projectId: number) => ["composicao", projectId] as const,
};
