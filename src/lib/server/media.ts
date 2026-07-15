// Store de servidor do Media Center — a única camada que fala Prisma/Storage
// para mídia. As rotas /api/media/* são os únicos consumidores; cada função
// recebe organizationId explícito (vem da sessão; o cliente NUNCA envia org).
//
// Fica fora de store.ts de propósito: aquele é o grafo Enterprise→Blueprint→Room
// com mappers PT-BR, e mídia é um contexto delimitado com DTOs contract-shaped.
// O único acoplamento é resolveMediaUrl, que mora no mediaRules.ts puro.
//
// ⚠ BigInt: JSON.stringify LANÇA em bigint, então ok() → NextResponse.json()
// morre se um SizeBytes/UsedBytes cru escapar. Todo mapper emite String() —
// que é o que o contrato pede (sizeBytes: string).
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type {
  ConfirmUploadBody,
  CreateFolderBody,
  FetchMediaFilesParams,
  FetchMediaFilesResponse,
  FileUsageItemDto,
  FileUsagesDto,
  FolderTreeNodeDto,
  MediaFileDto,
  MediaFileListItemDto,
  MediaFileType,
  MediaFolderDto,
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
  StorageUsageDto,
  UpdateFileBody,
  UpdateFolderBody,
} from "@/shared/types/media";
import {
  isAcceptedMediaMimeType,
  isImageMimeType,
  MEDIA_BUCKET,
  MEDIA_MAX_FILE_BYTES,
} from "@/shared/utils/media";

import {
  buildFolderTree,
  collectSubtreeIds,
  depthUnder,
  fitsDepth,
  MAX_FOLDER_DEPTH,
  moveFitsDepth,
  slugifyFolderName,
  subtreeHeight,
  type FolderNode,
} from "./mediaRules";
import {
  buildStoragePath,
  createUploadUrl,
  publicUrlFor,
  removeObject,
  SIGNED_UPLOAD_TTL_MS,
  statObject,
} from "./mediaStorage";

/** Teto do contrato para a listagem de recentes. */
const RECENT_LIMIT = 50;
const DEFAULT_PAGE_SIZE = 60;

// ─── Mappers ────────────────────────────────────────────────────────────

type MediaFileRow = Prisma.MediaFileGetPayload<object>;
type MediaFolderRow = Prisma.MediaFolderGetPayload<object>;
type StorageUsageRow = Prisma.StorageUsageGetPayload<object>;

function toMediaFileDto(row: MediaFileRow): MediaFileDto {
  return {
    id: row.Id,
    organizationId: row.OrganizationId,
    folderId: row.FolderId,
    uploadedById: row.UploadedById,
    displayName: row.DisplayName,
    originalFilename: row.OriginalFilename,
    storagePath: row.StoragePath,
    storageContainer: row.StorageContainer,
    publicUrl: row.PublicUrl,
    publicOptimizedUrl: row.PublicOptimizedUrl,
    mimeType: row.MimeType,
    fileType: row.FileType,
    sizeBytes: String(row.SizeBytes),
    width: row.Width,
    height: row.Height,
    status: row.Status,
    createdAt: row.CreatedAt.toISOString(),
    updatedAt: row.UpdatedAt.toISOString(),
  };
}

function toMediaFileListItemDto(row: MediaFileRow): MediaFileListItemDto {
  return {
    id: row.Id,
    folderId: row.FolderId,
    displayName: row.DisplayName,
    mimeType: row.MimeType,
    fileType: row.FileType,
    sizeBytes: String(row.SizeBytes),
    width: row.Width,
    height: row.Height,
    publicUrl: row.PublicUrl,
    publicOptimizedUrl: row.PublicOptimizedUrl,
    createdAt: row.CreatedAt.toISOString(),
  };
}

function toMediaFolderDto(row: MediaFolderRow): MediaFolderDto {
  return {
    id: row.Id,
    organizationId: row.OrganizationId,
    parentFolderId: row.ParentFolderId,
    name: row.Name,
    slug: row.Slug,
    depth: row.Depth,
    createdAt: row.CreatedAt.toISOString(),
    updatedAt: row.UpdatedAt.toISOString(),
  };
}

/** Org sem uso ainda não tem linha — devolve DTO zerado, não 404. */
function toStorageUsageDto(
  row: StorageUsageRow | null,
  organizationId: string
): StorageUsageDto {
  if (!row) {
    return {
      organizationId,
      usedBytes: "0",
      fileCount: 0,
      updatedAt: new Date(0).toISOString(),
    };
  }
  return {
    organizationId: row.OrganizationId,
    usedBytes: String(row.UsedBytes),
    fileCount: row.FileCount,
    updatedAt: row.UpdatedAt.toISOString(),
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

function mediaFileTypeFor(mimeType: string): MediaFileType {
  return isImageMimeType(mimeType) ? "Image" : "Document";
}

/** Valida o ?fileType= da query. Vazio/ausente = sem filtro. */
export function parseFileType(raw: string | null): MediaFileType | undefined {
  if (raw === null || raw === "") return undefined;
  if (raw === "Image" || raw === "Document") return raw;
  throw new Error("Tipo de arquivo inválido.");
}

async function findFolderOrThrow(
  organizationId: string,
  id: number
): Promise<MediaFolderRow> {
  const folder = await prisma.mediaFolder.findFirst({
    where: { Id: id, OrganizationId: organizationId },
  });
  if (!folder) throw new Error("Pasta não encontrada.");
  return folder;
}

/** Só arquivos utilizáveis: Deleted é invisível (o binário não existe mais). */
async function findFileOrThrow(
  organizationId: string,
  id: number
): Promise<MediaFileRow> {
  const file = await prisma.mediaFile.findFirst({
    where: { Id: id, OrganizationId: organizationId, Status: { not: "Deleted" } },
  });
  if (!file) throw new Error("Arquivo não encontrado.");
  return file;
}

/**
 * Guarda de org para vincular um MediaFile a uma entidade (store.ts).
 * Sem isto, um request forjado linkaria arquivo de outra organização e leria a
 * URL dele — violando o "toda linha é org-scoped" do CLAUDE.md.
 */
export async function assertMediaFileInOrg(
  organizationId: string,
  id: number
): Promise<void> {
  const found = await prisma.mediaFile.findFirst({
    where: { Id: id, OrganizationId: organizationId, Status: "Active" },
    select: { Id: true },
  });
  if (!found) throw new Error("Arquivo não encontrado.");
}

/**
 * Nome único dentro do mesmo pai. Validado aqui e não só pelo @@unique porque
 * o índice NÃO cobre a raiz (Postgres trata NULL como distinto) — e porque um
 * P2002 cru vazaria mensagem em inglês para o usuário.
 */
async function assertFolderNameFree(
  tx: Prisma.TransactionClient,
  organizationId: string,
  parentFolderId: number | null,
  name: string,
  excludeId?: number
): Promise<void> {
  const clash = await tx.mediaFolder.findFirst({
    where: {
      OrganizationId: organizationId,
      ParentFolderId: parentFolderId,
      Name: name,
      ...(excludeId === undefined ? {} : { Id: { not: excludeId } }),
    },
    select: { Id: true },
  });
  if (clash) throw new Error("Já existe uma pasta com esse nome neste nível.");
}

/** Linhas mínimas para navegar a árvore da org. */
async function loadFolderNodes(
  tx: Prisma.TransactionClient,
  organizationId: string
): Promise<FolderNode[]> {
  return tx.mediaFolder.findMany({
    where: { OrganizationId: organizationId },
    select: { Id: true, ParentFolderId: true },
  });
}

// ─── Upload ─────────────────────────────────────────────────────────────

/**
 * Passo 1 de 3: valida, reserva o path e devolve a URL assinada.
 * Assina ANTES de inserir: se o insert falhar, sobra só um token não usado (o
 * objeto não existe). Na ordem inversa sobraria uma linha Pending órfã.
 */
export async function requestUploadUrl(
  organizationId: string,
  uploadedById: string,
  body: RequestUploadUrlBody
): Promise<RequestUploadUrlResponse> {
  if (!isAcceptedMediaMimeType(body.mimeType)) {
    throw new Error("Formato de arquivo não suportado.");
  }
  if (body.sizeBytes > MEDIA_MAX_FILE_BYTES) {
    throw new Error("Arquivo excede o tamanho máximo de 25 MB.");
  }
  if (body.folderId !== undefined) {
    await findFolderOrThrow(organizationId, body.folderId);
  }

  const storagePath = buildStoragePath(organizationId, body.filename);
  const uploadUrl = await createUploadUrl(storagePath);

  const file = await prisma.mediaFile.create({
    data: {
      OrganizationId: organizationId,
      FolderId: body.folderId ?? null,
      UploadedById: uploadedById,
      DisplayName: body.filename,
      OriginalFilename: body.filename,
      StoragePath: storagePath,
      StorageContainer: MEDIA_BUCKET,
      MimeType: body.mimeType,
      FileType: mediaFileTypeFor(body.mimeType),
      // Declarado pelo cliente; o confirm sobrescreve com o tamanho REAL.
      SizeBytes: BigInt(Math.max(0, Math.trunc(body.sizeBytes))),
      Width: body.width ?? null,
      Height: body.height ?? null,
      Status: "Pending",
    },
  });

  return {
    id: file.Id,
    uploadUrl,
    expiresAt: new Date(Date.now() + SIGNED_UPLOAD_TTL_MS).toISOString(),
  };
}

/**
 * Passo 3 de 3: prova que o binário chegou, ativa e contabiliza.
 *
 * `body.optimize` é aceito por paridade de contrato e IGNORADO no v0 — não há
 * pipeline WebP, então PublicOptimizedUrl fica null (ver docs/decisions.md).
 */
export async function confirmUpload(
  organizationId: string,
  id: number,
  body: ConfirmUploadBody
): Promise<MediaFileDto> {
  const file = await findFileOrThrow(organizationId, id);

  // Idempotente: re-confirmar não pode contabilizar de novo.
  if (file.Status === "Active") return toMediaFileDto(file);

  const stat = await statObject(file.StoragePath);
  if (!stat) throw new Error("O arquivo não chegou ao armazenamento.");

  // Tamanho REAL, não o que o cliente declarou no passo 1 — é o que alimenta a
  // cota, então um cliente não pode subdeclarar para furar o limite.
  const realSize = BigInt(stat.sizeBytes);
  if (stat.sizeBytes > MEDIA_MAX_FILE_BYTES) {
    throw new Error("Arquivo excede o tamanho máximo de 25 MB.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.mediaFile.update({
      where: { Id: id },
      data: {
        Status: "Active",
        PublicUrl: publicUrlFor(file.StoragePath),
        SizeBytes: realSize,
        Width: body.width ?? file.Width,
        Height: body.height ?? file.Height,
      },
    });

    await tx.storageUsage.upsert({
      where: { OrganizationId: organizationId },
      create: { OrganizationId: organizationId, UsedBytes: realSize, FileCount: 1 },
      update: {
        UsedBytes: { increment: realSize },
        FileCount: { increment: 1 },
      },
    });

    return row;
  });

  return toMediaFileDto(updated);
}

// ─── Arquivos ───────────────────────────────────────────────────────────

/**
 * Listagem paginada. `folderId` ausente = TODOS os arquivos da org (contrato);
 * passar folderId escopa a uma pasta, não-recursivo.
 *
 * `fileType` vai no where do Prisma — no admin ele é aplicado no cliente DEPOIS
 * da paginação, o que faz a contagem de páginas discordar dos resultados sempre
 * que há filtro ativo.
 */
export async function listMediaFiles(
  organizationId: string,
  params: FetchMediaFilesParams
): Promise<FetchMediaFilesResponse> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(Math.max(1, params.limit ?? DEFAULT_PAGE_SIZE), 200);

  const where: Prisma.MediaFileWhereInput = {
    OrganizationId: organizationId,
    Status: "Active",
    ...(params.folderId === undefined ? {} : { FolderId: params.folderId }),
    ...(params.fileType === undefined ? {} : { FileType: params.fileType }),
    ...(params.search
      ? { DisplayName: { contains: params.search, mode: "insensitive" } }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.mediaFile.findMany({
      where,
      orderBy: { CreatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.mediaFile.count({ where }),
  ]);

  return { results: rows.map(toMediaFileListItemDto), total, page, limit };
}

/** Arquivos recentes da org (raiz sem busca). Sem paginação, teto de 50. */
export async function listRecentMediaFiles(
  organizationId: string,
  fileType?: MediaFileType
): Promise<MediaFileListItemDto[]> {
  const rows = await prisma.mediaFile.findMany({
    where: {
      OrganizationId: organizationId,
      Status: "Active",
      ...(fileType === undefined ? {} : { FileType: fileType }),
    },
    orderBy: { CreatedAt: "desc" },
    take: RECENT_LIMIT,
  });
  return rows.map(toMediaFileListItemDto);
}

export async function getStorageUsage(organizationId: string): Promise<StorageUsageDto> {
  const row = await prisma.storageUsage.findUnique({
    where: { OrganizationId: organizationId },
  });
  return toStorageUsageDto(row, organizationId);
}

/** Renomear e/ou mover. */
export async function updateMediaFile(
  organizationId: string,
  id: number,
  body: UpdateFileBody
): Promise<MediaFileDto> {
  await findFileOrThrow(organizationId, id);

  // null = mover para a raiz; undefined = não mexer. Não colapsar os dois.
  if (body.folderId !== undefined && body.folderId !== null) {
    await findFolderOrThrow(organizationId, body.folderId);
  }

  const name = body.displayName?.trim();
  if (body.displayName !== undefined && !name) {
    throw new Error("O nome do arquivo não pode ser vazio.");
  }

  const updated = await prisma.mediaFile.update({
    where: { Id: id },
    data: {
      ...(name === undefined ? {} : { DisplayName: name }),
      ...(body.folderId === undefined ? {} : { FolderId: body.folderId }),
    },
  });
  return toMediaFileDto(updated);
}

/**
 * Delete SOFT: a linha e as FKs sobrevivem (Status = Deleted), o binário some.
 * É por isso que resolveMediaUrl tem gate em Active — senão as entidades
 * vinculadas renderizariam URL morta em vez de cair no fallback legado.
 */
export async function deleteMediaFile(organizationId: string, id: number): Promise<void> {
  const file = await findFileOrThrow(organizationId, id);

  await prisma.$transaction(async (tx) => {
    await tx.mediaFile.update({ where: { Id: id }, data: { Status: "Deleted" } });

    // Só decrementa o que foi contabilizado: um Pending nunca incrementou.
    if (file.Status === "Active") {
      await tx.storageUsage.updateMany({
        where: { OrganizationId: organizationId },
        data: {
          UsedBytes: { decrement: file.SizeBytes },
          FileCount: { decrement: 1 },
        },
      });
    }
  });

  // Depois do commit, e sem derrubar a request: o banco já está consistente e o
  // arquivo já sumiu da UI. Falhar aqui deixaria no máximo bytes órfãos no
  // bucket — problema de faxina, não de correção.
  try {
    await removeObject(file.StoragePath);
  } catch (e: unknown) {
    console.warn(
      `[media] objeto órfão em ${file.StoragePath}:`,
      e instanceof Error ? e.message : e
    );
  }
}

/**
 * "Onde é usado?" — por FK, não por match de URL.
 *
 * Só materiais têm imagem no Planner (docs/context/product.md), então
 * `blueprints`, `rooms` e `materials.asRender` vêm sempre vazios. Os campos
 * ficam no DTO por paridade com o contrato da API de customização, onde essas
 * entidades TÊM imagem — e o UsageSection não renderiza seção vazia.
 */
export async function getFileUsages(
  organizationId: string,
  id: number
): Promise<FileUsagesDto> {
  await findFileOrThrow(organizationId, id);

  const materials = await prisma.baseMaterial.findMany({
    where: { MediaFileId: id, OrganizationId: organizationId },
    select: { Id: true, Name: true },
  });

  return {
    blueprints: [],
    rooms: [],
    materials: {
      // BaseMaterial não pertence a um Enterprise — é catálogo da org. O modal
      // usa enterpriseName como subtítulo, e "Catálogo" é onde ele de fato vive.
      asPreview: materials.map(
        (m): FileUsageItemDto => ({ id: m.Id, name: m.Name, enterpriseName: "Catálogo" })
      ),
      asRender: [],
    },
  };
}

// ─── Pastas ─────────────────────────────────────────────────────────────

export async function createMediaFolder(
  organizationId: string,
  body: CreateFolderBody
): Promise<MediaFolderDto> {
  const name = body.name.trim();
  if (!name) throw new Error("O nome da pasta não pode ser vazio.");

  const parent =
    body.parentFolderId === undefined
      ? null
      : await findFolderOrThrow(organizationId, body.parentFolderId);

  const depth = depthUnder(parent?.Depth ?? null);
  if (!fitsDepth(depth)) {
    throw new Error(`A profundidade máxima é de ${MAX_FOLDER_DEPTH} níveis.`);
  }

  const row = await prisma.$transaction(async (tx) => {
    await assertFolderNameFree(tx, organizationId, parent?.Id ?? null, name);
    return tx.mediaFolder.create({
      data: {
        OrganizationId: organizationId,
        ParentFolderId: parent?.Id ?? null,
        Name: name,
        Slug: slugifyFolderName(name),
        Depth: depth,
      },
    });
  });
  return toMediaFolderDto(row);
}

export async function listMediaFolders(
  organizationId: string,
  parentFolderId?: number
): Promise<MediaFolderDto[]> {
  const rows = await prisma.mediaFolder.findMany({
    where: {
      OrganizationId: organizationId,
      ParentFolderId: parentFolderId ?? null,
    },
    orderBy: { Name: "asc" },
  });
  return rows.map(toMediaFolderDto);
}

export async function listMediaFolderTree(
  organizationId: string,
  parentFolderId?: number
): Promise<FolderTreeNodeDto[]> {
  const rows = await prisma.mediaFolder.findMany({
    where: { OrganizationId: organizationId },
    orderBy: { Name: "asc" },
  });
  return buildFolderTree(rows.map(toMediaFolderDto), parentFolderId ?? null);
}

/**
 * Renomear e/ou mover.
 *
 * Mover é a operação delicada: Depth é desnormalizado, então a subárvore INTEIRA
 * precisa ser recalculada, e o teto vale para o nó mais fundo dela — não só para
 * a pasta movida.
 */
export async function updateMediaFolder(
  organizationId: string,
  id: number,
  body: UpdateFolderBody
): Promise<MediaFolderDto> {
  const folder = await findFolderOrThrow(organizationId, id);

  const name = body.name?.trim();
  if (body.name !== undefined && !name) {
    throw new Error("O nome da pasta não pode ser vazio.");
  }

  const movingParent = body.parentFolderId !== undefined;
  const targetParentId = movingParent ? body.parentFolderId ?? null : folder.ParentFolderId;

  const row = await prisma.$transaction(async (tx) => {
    if (name !== undefined || movingParent) {
      await assertFolderNameFree(
        tx,
        organizationId,
        targetParentId,
        name ?? folder.Name,
        id
      );
    }

    if (movingParent && targetParentId !== folder.ParentFolderId) {
      const nodes = await loadFolderNodes(tx, organizationId);
      const subtree = collectSubtreeIds(nodes, id);

      let targetDepth: number | null = null;
      if (targetParentId !== null) {
        // collectSubtreeIds inclui a própria raiz, então isto pega tanto
        // "mover para dentro de si" quanto "para dentro de um descendente".
        if (subtree.includes(targetParentId)) {
          throw new Error("Não é possível mover uma pasta para dentro dela mesma.");
        }
        const target = await tx.mediaFolder.findFirst({
          where: { Id: targetParentId, OrganizationId: organizationId },
          select: { Depth: true },
        });
        if (!target) throw new Error("Pasta não encontrada.");
        targetDepth = target.Depth;
      }

      const newDepth = depthUnder(targetDepth);
      if (!moveFitsDepth(newDepth, subtreeHeight(nodes, id))) {
        throw new Error(
          `A movimentação excede a profundidade máxima de ${MAX_FOLDER_DEPTH} níveis.`
        );
      }

      const delta = newDepth - folder.Depth;
      if (delta !== 0) {
        await tx.mediaFolder.updateMany({
          where: { Id: { in: subtree } },
          data: { Depth: { increment: delta } },
        });
      }
    }

    return tx.mediaFolder.update({
      where: { Id: id },
      data: {
        ...(name === undefined ? {} : { Name: name, Slug: slugifyFolderName(name) }),
        ...(movingParent ? { ParentFolderId: targetParentId } : {}),
      },
    });
  });

  return toMediaFolderDto(row);
}

/**
 * Delete NÃO-destrutivo (contrato): filhos e arquivos sobem um nível antes da
 * exclusão. Nada se perde.
 */
export async function deleteMediaFolder(organizationId: string, id: number): Promise<void> {
  const folder = await findFolderOrThrow(organizationId, id);

  try {
    await prisma.$transaction(async (tx) => {
      // A árvore é lida ANTES de mexer — depois da promoção ela mudou.
      const nodes = await loadFolderNodes(tx, organizationId);
      const descendants = collectSubtreeIds(nodes, id).filter((x) => x !== id);

      await tx.mediaFolder.updateMany({
        where: { OrganizationId: organizationId, ParentFolderId: id },
        data: { ParentFolderId: folder.ParentFolderId },
      });
      await tx.mediaFile.updateMany({
        where: { OrganizationId: organizationId, FolderId: id },
        data: { FolderId: folder.ParentFolderId },
      });
      if (descendants.length > 0) {
        await tx.mediaFolder.updateMany({
          where: { Id: { in: descendants } },
          data: { Depth: { decrement: 1 } },
        });
      }

      await tx.mediaFolder.delete({ where: { Id: id } });
    });
  } catch (e: unknown) {
    // A/B + A/X/B: excluir X promove B para dentro de A, onde já existe um B.
    if (isUniqueViolation(e)) {
      throw new Error(
        "Não foi possível excluir: já existe uma pasta com o mesmo nome no nível acima."
      );
    }
    throw e;
  }
}
