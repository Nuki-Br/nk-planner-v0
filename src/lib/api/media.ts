// Camada client do Media Center — chama as rotas /api/media/* via os wrappers
// de http.ts (envelope BaseResult). Espelha lib/api/Media.ts do nk-admin-portal,
// mas sobre fetch em vez de axios.
//
// Fica em lib/api/ e não em lib/data/store.ts porque é o que o conventions.md
// prescreve: "Funções de acesso em src/lib/api/*.ts usando os wrappers de
// src/lib/api/http.ts".
import type {
  ConfirmUploadBody,
  CreateFolderBody,
  FetchMediaFilesParams,
  FetchMediaFilesResponse,
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

import { httpGet, httpSend } from "./http";

const BASE = "/api/media";

// ─── Upload ─────────────────────────────────────────────────────────────

export async function requestUploadUrl(
  body: RequestUploadUrlBody
): Promise<RequestUploadUrlResponse> {
  return httpSend<RequestUploadUrlResponse, RequestUploadUrlBody>(
    `${BASE}/upload/url`,
    "POST",
    body
  );
}

/**
 * Passo 2 de 3: PUT do binário direto no Supabase Storage.
 *
 * fetch NU, de propósito: a resposta não é um BaseResult e não há sessão a
 * enviar (a URL assinada é o próprio token), então não pode passar pelo
 * httpSend. Sem `x-ms-blob-type` — aquilo era exigência do Azure.
 */
export async function uploadToStorage(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!res.ok) {
    throw new Error(`Falha no upload para o armazenamento (status ${res.status}).`);
  }
}

export async function confirmUpload(
  id: number,
  body: ConfirmUploadBody
): Promise<MediaFileDto> {
  return httpSend<MediaFileDto, ConfirmUploadBody>(
    `${BASE}/upload/${id}/confirm`,
    "POST",
    body
  );
}

// ─── Arquivos ───────────────────────────────────────────────────────────

export async function fetchMediaFiles(
  params: FetchMediaFilesParams
): Promise<FetchMediaFilesResponse> {
  const qs = new URLSearchParams();
  if (params.folderId !== undefined) qs.set("folderId", String(params.folderId));
  if (params.page !== undefined) qs.set("page", String(params.page));
  if (params.limit !== undefined) qs.set("limit", String(params.limit));
  if (params.search) qs.set("search", params.search);
  if (params.fileType) qs.set("fileType", params.fileType);
  return httpGet<FetchMediaFilesResponse>(`${BASE}/files?${qs.toString()}`);
}

export async function fetchRecentMediaFiles(
  fileType?: MediaFileType
): Promise<MediaFileListItemDto[]> {
  const qs = new URLSearchParams();
  if (fileType) qs.set("fileType", fileType);
  return httpGet<MediaFileListItemDto[]>(`${BASE}/files/recent?${qs.toString()}`);
}

export async function fetchStorageUsage(): Promise<StorageUsageDto> {
  return httpGet<StorageUsageDto>(`${BASE}/files/usage`);
}

export async function fetchFileUsages(id: number): Promise<FileUsagesDto> {
  return httpGet<FileUsagesDto>(`${BASE}/files/${id}/usages`);
}

export async function updateMediaFile(
  id: number,
  body: UpdateFileBody
): Promise<MediaFileDto> {
  return httpSend<MediaFileDto, UpdateFileBody>(`${BASE}/files/${id}`, "PATCH", body);
}

export async function deleteMediaFile(id: number): Promise<void> {
  await httpSend<void>(`${BASE}/files/${id}`, "DELETE");
}

// ─── Pastas ─────────────────────────────────────────────────────────────

export async function createFolder(body: CreateFolderBody): Promise<MediaFolderDto> {
  return httpSend<MediaFolderDto, CreateFolderBody>(`${BASE}/folders`, "POST", body);
}

export async function fetchFolders(parentFolderId?: number): Promise<MediaFolderDto[]> {
  const qs = new URLSearchParams({ mode: "flat" });
  if (parentFolderId !== undefined) qs.set("parentFolderId", String(parentFolderId));
  return httpGet<MediaFolderDto[]>(`${BASE}/folders?${qs.toString()}`);
}

export async function fetchFolderTree(
  parentFolderId?: number
): Promise<FolderTreeNodeDto[]> {
  const qs = new URLSearchParams({ mode: "tree" });
  if (parentFolderId !== undefined) qs.set("parentFolderId", String(parentFolderId));
  return httpGet<FolderTreeNodeDto[]>(`${BASE}/folders?${qs.toString()}`);
}

export async function updateFolder(
  id: number,
  body: UpdateFolderBody
): Promise<MediaFolderDto> {
  return httpSend<MediaFolderDto, UpdateFolderBody>(`${BASE}/folders/${id}`, "PATCH", body);
}

export async function deleteFolder(id: number): Promise<void> {
  await httpSend<void>(`${BASE}/folders/${id}`, "DELETE");
}
