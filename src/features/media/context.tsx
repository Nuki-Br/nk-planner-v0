"use client";

import { createContext, useContext, useMemo, useState } from "react";

import type {
  MediaFileListItemDto,
  MediaFileType,
  MediaFolderDto,
} from "@/shared/types/media";

export type MediaCenterMode = "manage" | "select";
export type MediaTypeFilter = "all" | MediaFileType;
export type MediaSearchScope = "folder" | "all";

/** Filtro da UI → parâmetro da API ("all" = sem filtro). */
export function fileTypeParam(filter: MediaTypeFilter): MediaFileType | undefined {
  return filter === "all" ? undefined : filter;
}

interface MediaCenterContextValue {
  mode: MediaCenterMode;

  // Navegação de pastas
  /** Trilha do breadcrumb; a raiz é implícita (array vazio). */
  path: MediaFolderDto[];
  currentFolderId?: number;
  currentFolder?: MediaFolderDto;
  enterFolder: (folder: MediaFolderDto) => void;
  /** -1 = raiz. */
  goToCrumb: (index: number) => void;
  goToRoot: () => void;
  goBack: () => void;
  canGoBack: boolean;

  // Filtros
  search: string;
  setSearch: (value: string) => void;
  typeFilter: MediaTypeFilter;
  setTypeFilter: (value: MediaTypeFilter) => void;
  searchScope: MediaSearchScope;
  setSearchScope: (value: MediaSearchScope) => void;

  // Seleção (modo select)
  selectedFile: MediaFileListItemDto | null;
  setSelectedFile: (file: MediaFileListItemDto | null) => void;
}

const MediaCenterContext = createContext<MediaCenterContextValue | null>(null);

export function MediaCenterProvider({
  mode,
  children,
}: {
  mode: MediaCenterMode;
  children: React.ReactNode;
}) {
  const [path, setPath] = useState<MediaFolderDto[]>([]);
  const [search, setSearch] = useState("");
  // No modo select quem chama só aceita imagem, então o filtro já nasce travado.
  const [typeFilter, setTypeFilter] = useState<MediaTypeFilter>(
    mode === "select" ? "Image" : "all"
  );
  const [searchScope, setSearchScope] = useState<MediaSearchScope>("folder");
  const [selectedFile, setSelectedFile] = useState<MediaFileListItemDto | null>(null);

  const value = useMemo<MediaCenterContextValue>(() => {
    const currentFolder = path[path.length - 1];

    const enterFolder = (folder: MediaFolderDto) => {
      setPath((prev) => [...prev, folder]);
      setSelectedFile(null);
    };

    const goToCrumb = (index: number) => {
      setPath((prev) => (index < 0 ? [] : prev.slice(0, index + 1)));
      setSelectedFile(null);
    };

    return {
      mode,
      path,
      currentFolder,
      currentFolderId: currentFolder?.id,
      enterFolder,
      goToCrumb,
      goToRoot: () => goToCrumb(-1),
      goBack: () => goToCrumb(path.length - 2),
      canGoBack: path.length > 0,
      search,
      setSearch,
      typeFilter,
      setTypeFilter,
      searchScope,
      setSearchScope,
      selectedFile,
      setSelectedFile,
    };
  }, [mode, path, search, typeFilter, searchScope, selectedFile]);

  return (
    <MediaCenterContext.Provider value={value}>{children}</MediaCenterContext.Provider>
  );
}

export function useMediaCenter(): MediaCenterContextValue {
  const ctx = useContext(MediaCenterContext);
  if (!ctx) throw new Error("useMediaCenter precisa estar dentro de um MediaCenterProvider");
  return ctx;
}
