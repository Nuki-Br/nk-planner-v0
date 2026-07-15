"use client";

import Image from "next/image";

import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Icon,
  Skeleton,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import type { MediaFileListItemDto } from "@/shared/types/media";
import { humanFileSize } from "@/shared/utils/media";

import { useMediaCenter } from "../context";

interface FileGridProps {
  files: MediaFileListItemDto[];
  isLoading: boolean;
  onPreview: (file: MediaFileListItemDto) => void;
  onRename: (file: MediaFileListItemDto) => void;
  onMove: (file: MediaFileListItemDto) => void;
  onDownload: (file: MediaFileListItemDto) => void;
  onShowUsages: (file: MediaFileListItemDto) => void;
  onDelete: (file: MediaFileListItemDto) => void;
  onConfirmSelect: (file: MediaFileListItemDto) => void;
}

const GRID = "grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6";

function FileThumbnail({ file }: { file: MediaFileListItemDto }) {
  const url = file.publicOptimizedUrl ?? file.publicUrl;

  if (file.fileType === "Image" && url) {
    // next/image otimiza e redimensiona o remoto (*.supabase.co já liberado no
    // next.config) — é o que faz o grid não baixar a imagem em tamanho cheio.
    return <Image src={url} alt={file.displayName} fill sizes="160px" className="object-cover" />;
  }

  const isPdf = file.mimeType === "application/pdf";
  return (
    <div className="flex h-full w-full items-center justify-center bg-neutral-gray-2">
      {isPdf ? (
        <Icon name="file_pdf" size={40} className="text-secondary-6" />
      ) : (
        <Icon name="file" size={40} className="text-neutral-gray-8" />
      )}
    </div>
  );
}

function FileCard({
  file,
  onPreview,
  onRename,
  onMove,
  onDownload,
  onShowUsages,
  onDelete,
  onConfirmSelect,
}: { file: MediaFileListItemDto } & Omit<FileGridProps, "files" | "isLoading">) {
  const { mode, selectedFile, setSelectedFile } = useMediaCenter();
  const isSelected = selectedFile?.id === file.id;

  const handleClick = () => {
    if (mode === "select") setSelectedFile(file);
    else onPreview(file);
  };

  const handleDoubleClick = () => {
    if (mode === "select") onConfirmSelect(file);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      title={file.displayName}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      className={cn(
        "group relative flex cursor-pointer flex-col overflow-hidden rounded-nk-xl border bg-white transition-all",
        isSelected
          ? "border-primary-7 ring-2 ring-primary-7/40"
          : "border-neutral-gray-4 hover:border-primary-7"
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden">
        <FileThumbnail file={file} />

        {isSelected && (
          <div className="absolute right-1.5 top-1.5 rounded-full bg-white">
            <Icon name="check_circle" size={20} className="text-primary-7" />
          </div>
        )}

        <Dropdown>
          <DropdownTrigger>
            <button
              aria-label="Ações do arquivo"
              onClick={(e) => e.stopPropagation()}
              className="absolute left-1.5 top-1.5 rounded-md bg-white/90 p-1 text-neutral-gray-9 opacity-0 transition-opacity hover:bg-white group-hover:opacity-100"
            >
              <Icon name="more_vert" size={18} />
            </button>
          </DropdownTrigger>
          <DropdownMenu
            aria-label="Ações do arquivo"
            onAction={(key) => {
              if (key === "rename") onRename(file);
              if (key === "move") onMove(file);
              if (key === "download") onDownload(file);
              if (key === "usages") onShowUsages(file);
              if (key === "delete") onDelete(file);
            }}
          >
            <DropdownItem key="rename" startContent={<Icon name="edit" />}>
              Renomear
            </DropdownItem>
            <DropdownItem key="move" startContent={<Icon name="move" />}>
              Mover
            </DropdownItem>
            <DropdownItem key="download" startContent={<Icon name="download" />}>
              Baixar
            </DropdownItem>
            <DropdownItem key="usages" startContent={<Icon name="info" />}>
              Onde é usado?
            </DropdownItem>
            <DropdownItem
              key="delete"
              className="text-danger"
              color="danger"
              startContent={<Icon name="trash" />}
            >
              Excluir
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>

      <div className="flex flex-col px-2 py-1.5">
        <span className="truncate text-xs-p font-medium text-neutral-gray-11">
          {file.displayName}
        </span>
        <span className="text-xs-p text-neutral-gray-8">{humanFileSize(file.sizeBytes)}</span>
      </div>
    </div>
  );
}

export function FileGrid({ files, isLoading, ...handlers }: FileGridProps) {
  if (isLoading) {
    return (
      <div className={GRID}>
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full rounded-nk-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className={GRID}>
      {files.map((file) => (
        <FileCard key={file.id} file={file} {...handlers} />
      ))}
    </div>
  );
}
