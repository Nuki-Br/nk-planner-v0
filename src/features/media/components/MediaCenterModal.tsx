"use client";

import { useEffect, useState } from "react";

import { AlertModal, Button, EmptyState, Modal, Pagination } from "@/components/ui";
import { useDebounce } from "@/lib/hooks/useDebounce";
import type { MediaFileListItemDto, MediaFolderDto } from "@/shared/types/media";

import {
  fileTypeParam,
  MediaCenterProvider,
  useMediaCenter,
  type MediaCenterMode,
} from "../context";
import { MEDIA_FILES_PAGE_SIZE, useMediaFiles, useRecentMediaFiles } from "../hooks/useMediaFiles";
import { useMediaFolders } from "../hooks/useMediaFolders";
import { useMediaMutations } from "../hooks/useMediaMutations";

import { FileGrid } from "./FileGrid";
import { FilePreviewModal } from "./FilePreviewModal";
import { FileUsagesModal } from "./FileUsagesModal";
import { FolderBreadcrumbs } from "./FolderBreadcrumbs";
import { FolderGrid } from "./FolderGrid";
import { MediaToolbar } from "./MediaToolbar";
import { MoveToFolderModal } from "./MoveToFolderModal";
import { NamePromptModal } from "./NamePromptModal";
import { StorageUsageBar } from "./StorageUsageBar";
import { UploadDropzone } from "./UploadDropzone";

export interface MediaCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: MediaCenterMode;
  /** Chamado no modo select quando o usuário confirma um arquivo. */
  onSelect?: (file: MediaFileListItemDto) => void;
}

type Target =
  | { kind: "folder"; folder: MediaFolderDto }
  | { kind: "file"; file: MediaFileListItemDto };

/**
 * Download best-effort: baixa o blob e força o save. Cai para abrir em nova aba
 * se o CORS do storage bloquear o fetch.
 */
async function downloadFile(file: MediaFileListItemDto): Promise<void> {
  const url = file.publicUrl ?? file.publicOptimizedUrl;
  if (!url) return;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("fetch failed");
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = file.displayName;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

/**
 * Todo o estado do media center vive aqui: o cabeçalho (que vai no `title` do
 * wrapper Modal), o corpo e os diálogos precisam compartilhá-lo, e o wrapper do
 * repo não expõe slots separados como o ModalHeader/ModalBody crus do HeroUI.
 *
 * Os diálogos são IRMÃOS do Modal, não filhos: aninhar um Modal dentro do
 * ModalBody de outro empilharia portais sem necessidade.
 */
function MediaCenterShell({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect?: (file: MediaFileListItemDto) => void;
}) {
  const { mode, currentFolderId, search, typeFilter, searchScope, selectedFile } =
    useMediaCenter();

  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);

  const isSearching = debouncedSearch.trim().length > 0;
  const isRoot = currentFolderId === undefined;
  // Na raiz sem busca ativa mostramos os recentes em vez da listagem da pasta.
  const showRecent = isRoot && !isSearching;
  // O escopo só importa durante a busca: "all" varre o diretório inteiro
  // largando o filtro de pasta.
  const effectiveFolderId = isSearching && searchScope === "all" ? undefined : currentFolderId;
  const fileType = fileTypeParam(typeFilter);

  useEffect(() => {
    setPage(1);
  }, [currentFolderId, debouncedSearch, typeFilter, searchScope]);

  const { data: folders, isLoading: foldersLoading } = useMediaFolders(currentFolderId);
  const { data: filesData, isLoading: filesLoading } = useMediaFiles({
    folderId: effectiveFolderId,
    page,
    search: debouncedSearch,
    fileType,
    enabled: !showRecent,
  });
  const { data: recentFiles, isLoading: recentLoading } = useRecentMediaFiles(
    showRecent,
    fileType
  );

  const {
    createFolderMutation,
    updateFolderMutation,
    deleteFolderMutation,
    updateFileMutation,
    deleteFileMutation,
  } = useMediaMutations();

  const [isCreateFolderOpen, setCreateFolderOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Target | null>(null);
  const [moveTarget, setMoveTarget] = useState<Target | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<MediaFolderDto | null>(null);
  const [deleteFileTarget, setDeleteFileTarget] = useState<MediaFileListItemDto | null>(null);
  const [usagesTarget, setUsagesTarget] = useState<MediaFileListItemDto | null>(null);
  const [previewTarget, setPreviewTarget] = useState<MediaFileListItemDto | null>(null);

  // Sem filtro client-side: `fileType` vai para a API. No admin ele é aplicado
  // aqui, DEPOIS da paginação — e por isso lá a contagem de páginas (que vem do
  // total não-filtrado) discorda dos resultados sempre que há filtro ativo.
  const visibleFiles = showRecent ? recentFiles ?? [] : filesData?.results ?? [];

  const filesAreLoading = showRecent ? recentLoading : filesLoading;
  const totalPages =
    !showRecent && filesData ? Math.ceil(filesData.total / MEDIA_FILES_PAGE_SIZE) : 0;

  const confirmSelection = (file: MediaFileListItemDto) => {
    onSelect?.(file);
    onClose();
  };

  const handlePreview = (file: MediaFileListItemDto) => {
    if (file.fileType === "Image") {
      setPreviewTarget(file);
      return;
    }
    const url = file.publicUrl ?? file.publicOptimizedUrl;
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  // Os erros viram toast pelo MutationCache global; o try/catch aqui só evita
  // fechar o diálogo quando a mutação falha.
  const submitRename = async (name: string) => {
    if (!renameTarget) return;
    try {
      if (renameTarget.kind === "folder") {
        await updateFolderMutation.mutateAsync({ id: renameTarget.folder.id, body: { name } });
      } else {
        await updateFileMutation.mutateAsync({
          id: renameTarget.file.id,
          body: { displayName: name },
        });
      }
      setRenameTarget(null);
    } catch {
      /* toast global */
    }
  };

  const submitMove = async (folderId: number | null) => {
    if (!moveTarget) return;
    try {
      if (moveTarget.kind === "folder") {
        await updateFolderMutation.mutateAsync({
          id: moveTarget.folder.id,
          body: { parentFolderId: folderId },
        });
      } else {
        await updateFileMutation.mutateAsync({ id: moveTarget.file.id, body: { folderId } });
      }
      setMoveTarget(null);
    } catch {
      /* toast global */
    }
  };

  const isEmpty =
    !filesAreLoading &&
    !foldersLoading &&
    visibleFiles.length === 0 &&
    (folders?.length ?? 0) === 0;

  return (
    <>
      <Modal
        open
        onClose={onClose}
        width={1024}
        title={
          <div className="flex w-full flex-col gap-3">
            <div className="flex w-full flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-title-3 text-neutral-gray-11">Media Center</span>
                <span className="text-xs-p font-normal text-neutral-gray-8">
                  {mode === "select"
                    ? "Selecione uma imagem da biblioteca"
                    : "Imagens, documentos e pastas"}
                </span>
              </div>
              <StorageUsageBar />
            </div>
            <MediaToolbar onCreateFolder={() => setCreateFolderOpen(true)} />
            <FolderBreadcrumbs />
          </div>
        }
        actions={
          mode === "select" ? (
            <>
              <Button variant="ghost" onPress={onClose}>
                Cancelar
              </Button>
              <Button
                variant="teal"
                isDisabled={!selectedFile}
                onPress={() => selectedFile && confirmSelection(selectedFile)}
              >
                Selecionar
              </Button>
            </>
          ) : undefined
        }
      >
        <div className="flex flex-col gap-5">
          <UploadDropzone folderId={currentFolderId} />

          {(foldersLoading || (folders?.length ?? 0) > 0) && (
            <section className="flex flex-col gap-2">
              <p className="text-sm-p font-bold text-neutral-gray-11">Pastas</p>
              <FolderGrid
                folders={folders ?? []}
                isLoading={foldersLoading}
                onRename={(folder) => setRenameTarget({ kind: "folder", folder })}
                onMove={(folder) => setMoveTarget({ kind: "folder", folder })}
                onDelete={(folder) => setDeleteFolderTarget(folder)}
              />
            </section>
          )}

          <section className="flex flex-col gap-2">
            <p className="text-sm-p font-bold text-neutral-gray-11">
              {showRecent ? "Arquivos recentes" : "Arquivos"}
            </p>
            {isEmpty ? (
              <EmptyState icon="image_off" title="Nenhum arquivo encontrado" />
            ) : (
              <FileGrid
                files={visibleFiles}
                isLoading={filesAreLoading}
                onPreview={handlePreview}
                onRename={(file) => setRenameTarget({ kind: "file", file })}
                onMove={(file) => setMoveTarget({ kind: "file", file })}
                onDownload={downloadFile}
                onShowUsages={(file) => setUsagesTarget(file)}
                onDelete={(file) => setDeleteFileTarget(file)}
                onConfirmSelect={confirmSelection}
              />
            )}

            {totalPages > 1 && (
              <div className="mt-2 flex w-full justify-center">
                <Pagination page={page} total={totalPages} onChange={setPage} />
              </div>
            )}
          </section>
        </div>
      </Modal>

      <NamePromptModal
        isOpen={isCreateFolderOpen}
        title="Criar pasta"
        label="Nome da pasta"
        confirmText="Criar"
        isLoading={createFolderMutation.isPending}
        onClose={() => setCreateFolderOpen(false)}
        onConfirm={async (name) => {
          try {
            await createFolderMutation.mutateAsync({ name, parentFolderId: currentFolderId });
            setCreateFolderOpen(false);
          } catch {
            /* toast global */
          }
        }}
      />

      <NamePromptModal
        isOpen={!!renameTarget}
        title={renameTarget?.kind === "folder" ? "Renomear pasta" : "Renomear arquivo"}
        label="Novo nome"
        initialValue={
          renameTarget?.kind === "folder"
            ? renameTarget.folder.name
            : renameTarget?.file.displayName
        }
        isLoading={updateFolderMutation.isPending || updateFileMutation.isPending}
        onClose={() => setRenameTarget(null)}
        onConfirm={submitRename}
      />

      <MoveToFolderModal
        isOpen={!!moveTarget}
        title={moveTarget?.kind === "folder" ? "Mover pasta" : "Mover arquivo"}
        excludeFolderId={moveTarget?.kind === "folder" ? moveTarget.folder.id : undefined}
        currentFolderId={
          moveTarget?.kind === "folder"
            ? moveTarget.folder.parentFolderId
            : moveTarget?.file.folderId
        }
        isLoading={updateFolderMutation.isPending || updateFileMutation.isPending}
        onClose={() => setMoveTarget(null)}
        onConfirm={submitMove}
      />

      <FileUsagesModal file={usagesTarget} onClose={() => setUsagesTarget(null)} />
      <FilePreviewModal file={previewTarget} onClose={() => setPreviewTarget(null)} />

      {deleteFolderTarget && (
        <AlertModal
          open
          title="Excluir pasta"
          variant="error"
          confirmLabel="Excluir"
          body={
            <>
              Você está excluindo a pasta “{deleteFolderTarget.name}”. Os arquivos e subpastas
              serão movidos para o nível acima — nada será perdido.
            </>
          }
          isLoading={deleteFolderMutation.isPending}
          onCancel={() => setDeleteFolderTarget(null)}
          onConfirm={async () => {
            try {
              await deleteFolderMutation.mutateAsync(deleteFolderTarget.id);
              setDeleteFolderTarget(null);
            } catch {
              /* toast global */
            }
          }}
        />
      )}

      {deleteFileTarget && (
        <AlertModal
          open
          title="Excluir arquivo"
          variant="error"
          confirmLabel="Excluir"
          body={
            <>
              Você está excluindo o arquivo “{deleteFileTarget.displayName}”. Esta ação não pode
              ser desfeita.
            </>
          }
          isLoading={deleteFileMutation.isPending}
          onCancel={() => setDeleteFileTarget(null)}
          onConfirm={async () => {
            try {
              await deleteFileMutation.mutateAsync(deleteFileTarget.id);
              setDeleteFileTarget(null);
            } catch {
              /* toast global */
            }
          }}
        />
      )}
    </>
  );
}

/**
 * Media Center. Não há rota /midia (decisão travada): só é alcançável pelos
 * pontos de imagem, via ImagePickerField.
 */
export function MediaCenterModal({
  isOpen,
  onClose,
  mode = "manage",
  onSelect,
}: MediaCenterModalProps) {
  // Montagem condicional: o provider nasce limpo a cada abertura, então
  // navegação e seleção não vazam de uma sessão para a outra.
  if (!isOpen) return null;

  return (
    <MediaCenterProvider mode={mode}>
      <MediaCenterShell onClose={onClose} onSelect={onSelect} />
    </MediaCenterProvider>
  );
}
