"use client";

import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Icon,
  Skeleton,
} from "@/components/ui";
import type { MediaFolderDto } from "@/shared/types/media";

import { useMediaCenter } from "../context";

interface FolderGridProps {
  folders: MediaFolderDto[];
  isLoading: boolean;
  onRename: (folder: MediaFolderDto) => void;
  onMove: (folder: MediaFolderDto) => void;
  onDelete: (folder: MediaFolderDto) => void;
}

const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4";

function FolderCard({
  folder,
  onRename,
  onMove,
  onDelete,
}: {
  folder: MediaFolderDto;
  onRename: (folder: MediaFolderDto) => void;
  onMove: (folder: MediaFolderDto) => void;
  onDelete: (folder: MediaFolderDto) => void;
}) {
  const { enterFolder } = useMediaCenter();

  return (
    <div
      role="button"
      tabIndex={0}
      // `title` nativo em vez do Tooltip do HeroUI: é afordância de truncamento,
      // não tooltip rico — e é o que o repo já faz (AmbienteModal).
      title={folder.name}
      onClick={() => enterFolder(folder)}
      onKeyDown={(e) => e.key === "Enter" && enterFolder(folder)}
      className="group flex cursor-pointer items-center gap-2 rounded-nk-xl border border-neutral-gray-4 bg-white px-3 py-2.5 transition-colors hover:border-primary-7 hover:bg-primary-1"
    >
      <Icon name="folder" size={22} className="shrink-0 text-primary-7" />
      <span className="flex-1 truncate text-sm-p text-neutral-gray-11">{folder.name}</span>

      <Dropdown>
        <DropdownTrigger>
          <button
            aria-label="Ações da pasta"
            onClick={(e) => e.stopPropagation()}
            className="rounded-md p-1 text-neutral-gray-8 opacity-0 transition-opacity hover:bg-neutral-gray-3 group-hover:opacity-100"
          >
            <Icon name="more_vert" size={18} />
          </button>
        </DropdownTrigger>
        <DropdownMenu
          aria-label="Ações da pasta"
          onAction={(key) => {
            if (key === "rename") onRename(folder);
            if (key === "move") onMove(folder);
            if (key === "delete") onDelete(folder);
          }}
        >
          <DropdownItem key="rename" startContent={<Icon name="edit" />}>
            Renomear
          </DropdownItem>
          <DropdownItem key="move" startContent={<Icon name="move" />}>
            Mover
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
  );
}

export function FolderGrid({ folders, isLoading, onRename, onMove, onDelete }: FolderGridProps) {
  if (isLoading) {
    return (
      <div className={GRID}>
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-11 w-full rounded-nk-xl" />
        ))}
      </div>
    );
  }

  if (folders.length === 0) return null;

  return (
    <div className={GRID}>
      {folders.map((folder) => (
        <FolderCard
          key={folder.id}
          folder={folder}
          onRename={onRename}
          onMove={onMove}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
