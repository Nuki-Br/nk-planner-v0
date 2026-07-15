"use client";

import { useCallback, useState } from "react";

import { addToast } from "@heroui/react";
import { useQueryClient } from "@tanstack/react-query";

import { confirmUpload, requestUploadUrl, uploadToStorage } from "@/lib/api/media";
import { queryKeys } from "@/lib/hooks/queryKeys";
import type { MediaFileDto } from "@/shared/types/media";
import { isAcceptedMediaMimeType, isImageMimeType } from "@/shared/utils/media";

export type MediaUploadStatus =
  | "pending"
  | "uploading"
  | "confirming"
  | "done"
  | "error";

export interface MediaUploadItem {
  /** Id local (nome + tamanho + timestamp) — não é o id do MediaFile. */
  id: string;
  file: File;
  status: MediaUploadStatus;
  error?: string;
  result?: MediaFileDto;
}

/**
 * Dimensões naturais da imagem, no browser. Resolve undefined para não-imagem
 * ou em falha — as dimensões são opcionais no backend.
 */
function readImageDimensions(file: File): Promise<{ width?: number; height?: number }> {
  if (!isImageMimeType(file.type) || file.type === "image/svg+xml") {
    return Promise.resolve({});
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({});
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

function makeLocalId(file: File): string {
  return `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Motor de upload (3 passos: assinar → PUT → confirmar).
 *
 * Nota de toast: isto NÃO é um useMutation, então o MutationCache global não
 * cobre os erros daqui. Por isso os toasts são explícitos — e seletivos:
 *   - MIME rejeitado → toast (o arquivo nunca entra na lista, não há onde mostrar)
 *   - falha por arquivo → SEM toast (a linha do dropzone já mostra o erro; um
 *     lote de 10 falhando dispararia 10 toasts)
 *   - sucesso do lote → toast único
 */
export function useMediaUpload() {
  const queryClient = useQueryClient();
  const [uploads, setUploads] = useState<MediaUploadItem[]>([]);

  const patchUpload = useCallback(
    (localId: string, patch: Partial<MediaUploadItem>) => {
      setUploads((prev) => prev.map((u) => (u.id === localId ? { ...u, ...patch } : u)));
    },
    []
  );

  const uploadSingle = useCallback(
    async (item: MediaUploadItem, folderId?: number): Promise<MediaFileDto | null> => {
      const { file } = item;
      try {
        const { width, height } = await readImageDimensions(file);

        patchUpload(item.id, { status: "uploading" });
        const { id, uploadUrl } = await requestUploadUrl({
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          folderId,
          width,
          height,
        });

        await uploadToStorage(uploadUrl, file);

        patchUpload(item.id, { status: "confirming" });
        const result = await confirmUpload(id, {
          optimize: isImageMimeType(file.type),
          width,
          height,
        });

        patchUpload(item.id, { status: "done", result });
        return result;
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Erro ao enviar o arquivo.";
        // Superfície inline (linha do dropzone), sem toast — ver nota acima.
        patchUpload(item.id, { status: "error", error: message });
        return null;
      }
    },
    [patchUpload]
  );

  /** Valida e envia um lote. Devolve os arquivos criados com sucesso. */
  const uploadFiles = useCallback(
    async (files: File[], folderId?: number): Promise<MediaFileDto[]> => {
      const accepted: MediaUploadItem[] = [];

      for (const file of files) {
        if (!isAcceptedMediaMimeType(file.type)) {
          addToast({
            title: `${file.name}: formato de arquivo não suportado.`,
            color: "danger",
            severity: "danger",
          });
          continue;
        }
        accepted.push({ id: makeLocalId(file), file, status: "pending" });
      }

      if (accepted.length === 0) return [];

      setUploads((prev) => [...accepted, ...prev]);

      const settled = await Promise.all(
        accepted.map((item) => uploadSingle(item, folderId))
      );
      const created = settled.filter((r): r is MediaFileDto => r !== null);

      if (created.length > 0) {
        queryClient.invalidateQueries({ queryKey: queryKeys.mediaFilesAll });
        queryClient.invalidateQueries({ queryKey: queryKeys.mediaRecentAll });
        queryClient.invalidateQueries({ queryKey: queryKeys.mediaUsage });
        addToast({
          title:
            created.length === 1
              ? "Arquivo enviado com sucesso!"
              : `${created.length} arquivos enviados com sucesso!`,
          color: "success",
          severity: "success",
        });
      }

      return created;
    },
    [queryClient, uploadSingle]
  );

  const isUploading = uploads.some(
    (u) => u.status === "uploading" || u.status === "confirming"
  );

  // Sem `reset`: o provider do media center é remontado a cada abertura, então
  // a lista de uploads já nasce vazia. O admin expõe um reset que ninguém chama.
  return { uploads, uploadFiles, isUploading };
}
