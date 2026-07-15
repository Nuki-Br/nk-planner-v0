// DTOs do Media Center — espelham o contrato da nk-api-customization
// (docs/media-center-frontend-integration.md) para que o front porte 1:1 e uma
// eventual reintegração seja troca de driver, não reescrita.
//
// Diferente de domain.ts (modelo interno do planner, PT-BR), estes tipos são
// contract-shaped: nomes em inglês, camelCase, sufixo Dto. Os mappers de
// lib/server/media.ts traduzem DB → DTO.
//
// Divergências deliberadas do contrato (ver docs/decisions.md):
//   - organizationId é string (uuid): o planner tem Organization própria, o
//     contrato original usa Int.
//   - publicOptimizedUrl existe mas vem sempre null no v0.
//   - materials.asRender vem sempre [] (não há coluna de render no planner).
//   - StorageUsageDto não tem `id`: nenhum consumidor usa (o StorageUsageBar lê
//     só usedBytes/fileCount) e a org sem uso ainda recebe um DTO zerado, que
//     não tem linha — logo, não tem id que não seja mentira.
//
// Os enums são unions de string, NÃO os enums gerados do Prisma: estes tipos
// são consumidos por componentes "use client" e importar @prisma/client puxaria
// o Prisma para o bundle. Os valores coincidem, então a atribuição é direta.

export type MediaFileStatus = "Pending" | "Active" | "Deleted";
export type MediaFileType = "Image" | "Document";

// ─── Arquivos ───────────────────────────────────────────────────────────

/** Detalhe completo de um arquivo. */
export interface MediaFileDto {
  id: number;
  organizationId: string;
  /** null = raiz. */
  folderId: number | null;
  /** authUserId de quem subiu. */
  uploadedById: string;
  displayName: string;
  originalFilename: string;
  storagePath: string;
  storageContainer: string;
  /** null enquanto status = "Pending". */
  publicUrl: string | null;
  /** Sempre null no v0 — o front faz `publicOptimizedUrl ?? publicUrl`. */
  publicOptimizedUrl: string | null;
  mimeType: string;
  fileType: MediaFileType;
  /** BigInt serializado como string — parse com BigInt() antes de aritmética. */
  sizeBytes: string;
  width: number | null;
  height: number | null;
  status: MediaFileStatus;
  createdAt: string;
  updatedAt: string;
}

/** Item enxuto para as listagens do grid. */
export interface MediaFileListItemDto {
  id: number;
  folderId: number | null;
  displayName: string;
  mimeType: string;
  fileType: MediaFileType;
  /** BigInt serializado como string. */
  sizeBytes: string;
  width: number | null;
  height: number | null;
  publicUrl: string | null;
  publicOptimizedUrl: string | null;
  createdAt: string;
}

// ─── Pastas ─────────────────────────────────────────────────────────────

export interface MediaFolderDto {
  id: number;
  organizationId: string;
  /** null = raiz. */
  parentFolderId: number | null;
  name: string;
  /** Derivado do name pelo backend. Read-only. */
  slug: string;
  /** 0 = raiz, máx 4 (o teto de 5 níveis é contado a partir de 1). */
  depth: number;
  createdAt: string;
  updatedAt: string;
}

/** Nó recursivo — retornado quando mode=tree. */
export interface FolderTreeNodeDto {
  id: number;
  parentFolderId: number | null;
  name: string;
  slug: string;
  depth: number;
  children: FolderTreeNodeDto[];
}

// ─── Uso de armazenamento ───────────────────────────────────────────────

export interface StorageUsageDto {
  organizationId: string;
  /** BigInt serializado como string. */
  usedBytes: string;
  fileCount: number;
  updatedAt: string;
}

// ─── "Onde é usado?" ────────────────────────────────────────────────────

export interface FileUsageItemDto {
  id: number;
  name: string;
  enterpriseName: string;
}

export interface FileUsagesDto {
  blueprints: FileUsageItemDto[];
  rooms: FileUsageItemDto[];
  materials: {
    asPreview: FileUsageItemDto[];
    /** Sempre [] no planner — não há coluna de render em BaseMaterial. */
    asRender: FileUsageItemDto[];
  };
}

// ─── Bodies de request ──────────────────────────────────────────────────

export interface RequestUploadUrlBody {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  /** Omitir para subir na raiz. */
  folderId?: number;
  width?: number;
  height?: number;
}

export interface RequestUploadUrlResponse {
  /** MediaFile id — usar no passo de confirm. */
  id: number;
  /** URL assinada do Supabase Storage — dar PUT direto nela. */
  uploadUrl: string;
  /** ISO. A assinatura do Supabase expira em 2h (fixo, sem parâmetro). */
  expiresAt: string;
}

export interface ConfirmUploadBody {
  width?: number;
  height?: number;
  /** Aceito por paridade de contrato; ignorado no v0 (sem pipeline WebP). */
  optimize?: boolean;
}

export interface UpdateFileBody {
  displayName?: string;
  /** null = mover para a raiz. */
  folderId?: number | null;
}

export interface CreateFolderBody {
  name: string;
  /** Omitir para criar na raiz. */
  parentFolderId?: number;
}

export interface UpdateFolderBody {
  name?: string;
  /** null = mover para a raiz. */
  parentFolderId?: number | null;
}

// ─── Listagem ───────────────────────────────────────────────────────────

export interface FetchMediaFilesParams {
  folderId?: number;
  page?: number;
  limit?: number;
  search?: string;
  /**
   * Filtro de tipo. Divergência do contrato original: no admin isto é aplicado
   * no cliente DEPOIS da paginação, então contagem e resultados discordam. Aqui
   * vai para o `where` do Prisma.
   */
  fileType?: MediaFileType;
}

export interface FetchMediaFilesResponse {
  results: MediaFileListItemDto[];
  total: number;
  page: number;
  limit: number;
}
