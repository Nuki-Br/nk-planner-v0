"use client";

import { useEffect, useState } from "react";

import { Button, Icon, Modal, Spinner } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { FolderTreeNodeDto } from "@/shared/types/media";

import { useMediaFolderTree } from "../hooks/useMediaFolders";

interface MoveToFolderModalProps {
  isOpen: boolean;
  title: string;
  /** Pasta (e descendentes) a esconder — impede mover uma pasta para dentro de si. */
  excludeFolderId?: number;
  /** Pai atual, para desabilitar o confirmar quando nada muda. */
  currentFolderId?: number | null;
  isLoading?: boolean;
  onConfirm: (folderId: number | null) => void;
  onClose: () => void;
}

function FolderRow({
  node,
  selectedId,
  excludeFolderId,
  onSelect,
}: {
  node: FolderTreeNodeDto;
  selectedId: number | null;
  excludeFolderId?: number;
  onSelect: (id: number) => void;
}) {
  // Poda a subárvore inteira: sem isto daria para escolher um descendente da
  // pasta sendo movida, que o backend rejeitaria como ciclo.
  if (node.id === excludeFolderId) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => onSelect(node.id)}
        style={{ paddingLeft: `${12 + node.depth * 16}px` }}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg py-2 pr-3 text-left text-sm-p transition-colors",
          selectedId === node.id
            ? "bg-primary-1 text-primary-8"
            : "text-neutral-gray-11 hover:bg-neutral-gray-2"
        )}
      >
        <Icon name="folder" size={18} className="text-primary-7" />
        <span className="truncate">{node.name}</span>
      </button>
      {node.children.map((child) => (
        <FolderRow
          key={child.id}
          node={child}
          selectedId={selectedId}
          excludeFolderId={excludeFolderId}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

export function MoveToFolderModal({
  isOpen,
  title,
  excludeFolderId,
  currentFolderId,
  isLoading,
  onConfirm,
  onClose,
}: MoveToFolderModalProps) {
  const { data: tree, isLoading: isTreeLoading } = useMediaFolderTree(isOpen);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Sem isto a escolha anterior vazaria para o próximo item movido.
  useEffect(() => {
    if (isOpen) setSelectedId(null);
  }, [isOpen]);

  const isUnchanged = (currentFolderId ?? null) === selectedId;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={title}
      width={512}
      actions={
        <>
          <Button variant="ghost" onPress={onClose}>
            Cancelar
          </Button>
          <Button
            variant="teal"
            isLoading={isLoading}
            isDisabled={isUnchanged}
            onPress={() => onConfirm(selectedId)}
          >
            Mover para cá
          </Button>
        </>
      }
    >
      <div className="max-h-[360px] overflow-y-auto rounded-nk-xl border border-neutral-gray-4 p-1">
        <button
          type="button"
          onClick={() => setSelectedId(null)}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm-p transition-colors",
            selectedId === null
              ? "bg-primary-1 text-primary-8"
              : "text-neutral-gray-11 hover:bg-neutral-gray-2"
          )}
        >
          <Icon name="home" size={18} className="text-primary-7" />
          <span>Media Center (raiz)</span>
        </button>

        {isTreeLoading ? (
          <div className="flex justify-center py-6">
            <Spinner size={20} />
          </div>
        ) : (
          (tree ?? []).map((node) => (
            <FolderRow
              key={node.id}
              node={node}
              selectedId={selectedId}
              excludeFolderId={excludeFolderId}
              onSelect={setSelectedId}
            />
          ))
        )}
      </div>
    </Modal>
  );
}
