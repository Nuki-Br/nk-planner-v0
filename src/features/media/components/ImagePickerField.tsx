"use client";

import { useRef, useState } from "react";
import Image from "next/image";

import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Icon,
  Spinner,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import type { MediaFileListItemDto } from "@/shared/types/media";

import { useMediaUpload } from "../hooks/useMediaUpload";

import { MediaCenterModal } from "./MediaCenterModal";

/**
 * Imagem vinculada a uma entidade.
 *
 * `mediaFileId` é opcional só na ENTRADA: linhas legadas têm url sem MediaFile.
 * Na SAÍDA (onChange) ele vem sempre preenchido — ver nota do componente.
 */
export interface ImagePickerValue {
  name: string;
  url: string;
  mediaFileId?: number;
}

interface ImagePickerFieldProps {
  label: string;
  hint?: string;
  value: ImagePickerValue | null;
  onChange: (value: ImagePickerValue | null) => void;
  /** Pasta de destino do upload direto (padrão: raiz). */
  folderId?: number;
  isDisabled?: boolean;
}

function toValue(file: MediaFileListItemDto): ImagePickerValue {
  return {
    mediaFileId: file.id,
    name: file.displayName,
    url: file.publicOptimizedUrl ?? file.publicUrl ?? "",
  };
}

/**
 * Campo de imagem: sobe do dispositivo ou escolhe da biblioteca.
 *
 * Diferente do Upload.tsx do admin, que devolve DOIS tipos (File cru do
 * dispositivo, DTO da biblioteca) e deixa o upload a cargo de quem chama — é
 * por isso que o TableUploadInput de lá tem ~400 linhas. Aqui "upload do
 * dispositivo" sobe PARA DENTRO da biblioteca e devolve o resultado, então a
 * saída é sempre um arquivo vinculado e quem chama não tem lógica de upload.
 */
export function ImagePickerField({
  label,
  hint,
  value,
  onChange,
  folderId,
  isDisabled = false,
}: ImagePickerFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLibraryOpen, setLibraryOpen] = useState(false);
  const [isDragging, setDragging] = useState(false);
  const { uploadFiles, isUploading } = useMediaUpload();

  const uploadFromDevice = async (file: File | undefined) => {
    if (!file) return;
    const [created] = await uploadFiles([file], folderId);
    if (!created) return; // erro já sinalizado por toast
    onChange({
      mediaFileId: created.id,
      name: created.displayName,
      url: created.publicOptimizedUrl ?? created.publicUrl ?? "",
    });
  };

  return (
    <div>
      <p className="text-[13px] font-bold text-neutral-gray-11">{label}</p>
      {hint && <p className="mb-3 mt-0.5 text-xs text-neutral-gray-7">{hint}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void uploadFromDevice(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {value ? (
        <div className="flex items-center gap-3 rounded-lg border border-neutral-gray-4 p-3">
          <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg border border-neutral-gray-4">
            {/* next/image: *.supabase.co já está liberado no next.config, o que
                dispensa o eslint-disable do <img> que existia aqui. */}
            <Image src={value.url} alt={label} fill sizes="72px" className="object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-neutral-gray-11">
              {value.name}
            </p>
            <p className="text-xs text-neutral-gray-7">
              {isUploading ? "Enviando..." : "Imagem carregada"}
            </p>
          </div>
          <div className="flex gap-1.5">
            <Dropdown>
              <DropdownTrigger>
                <Button variant="bordered" size="sm" isDisabled={isDisabled || isUploading}>
                  Substituir
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Substituir imagem"
                onAction={(key) => {
                  if (key === "device") inputRef.current?.click();
                  if (key === "library") setLibraryOpen(true);
                }}
              >
                <DropdownItem key="device" startContent={<Icon name="file_up" />}>
                  Upload do dispositivo
                </DropdownItem>
                <DropdownItem key="library" startContent={<Icon name="library" />}>
                  Biblioteca de mídia
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
            <Button
              variant="ghost"
              size="sm"
              icon="trash"
              isDisabled={isDisabled || isUploading}
              onPress={() => onChange(null)}
            >
              Remover
            </Button>
          </div>
        </div>
      ) : (
        <Dropdown isDisabled={isDisabled || isUploading}>
          <DropdownTrigger>
            <div
              role="button"
              tabIndex={0}
              // Arrastar sobe direto, sem passar pelo dropdown (paridade com o
              // admin: quem arrasta já disse de onde vem o arquivo).
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragging(false);
                void uploadFromDevice(e.dataTransfer.files?.[0]);
              }}
              className={cn(
                "flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed p-[18px] transition-colors",
                isDragging
                  ? "border-primary-7 bg-primary-1"
                  : "border-neutral-gray-5 bg-neutral-gray-2 hover:border-neutral-gray-6"
              )}
            >
              {isUploading ? (
                <Spinner size={24} />
              ) : (
                <Icon name="upload" size={24} className="text-neutral-gray-7" />
              )}
              <p className="text-[13px] font-semibold text-neutral-gray-9">
                {isUploading ? "Enviando..." : "Clique ou arraste para enviar a imagem"}
              </p>
              <p className="text-[11px] text-neutral-gray-6">
                PNG, JPG, WebP ou SVG até 25MB
              </p>
            </div>
          </DropdownTrigger>
          <DropdownMenu
            aria-label="Origem da imagem"
            onAction={(key) => {
              if (key === "device") inputRef.current?.click();
              if (key === "library") setLibraryOpen(true);
            }}
          >
            <DropdownItem key="device" startContent={<Icon name="file_up" />}>
              Upload do dispositivo
            </DropdownItem>
            <DropdownItem key="library" startContent={<Icon name="library" />}>
              Biblioteca de mídia
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      )}

      <MediaCenterModal
        isOpen={isLibraryOpen}
        mode="select"
        onClose={() => setLibraryOpen(false)}
        onSelect={(file) => onChange(toValue(file))}
      />
    </div>
  );
}
