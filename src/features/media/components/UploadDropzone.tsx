"use client";

import { useRef, useState } from "react";

import { Icon, Spinner } from "@/components/ui";
import { cn } from "@/lib/utils";
import { ACCEPTED_MEDIA_MIME_TYPES } from "@/shared/utils/media";

import { useMediaUpload, type MediaUploadItem } from "../hooks/useMediaUpload";

const ACCEPT_ATTR = ACCEPTED_MEDIA_MIME_TYPES.join(",");

const STATUS_LABEL: Record<MediaUploadItem["status"], string> = {
  pending: "Aguardando...",
  uploading: "Enviando...",
  confirming: "Finalizando...",
  done: "Concluído",
  error: "Erro",
};

/**
 * Dropzone na mão (sem lib): input escondido + eventos nativos de drag.
 *
 * Não há porcentagem de progresso: o PUT usa fetch, que não reporta progresso de
 * upload. Os estados são discretos (pending → uploading → confirming → done).
 */
export function UploadDropzone({ folderId }: { folderId?: number }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { uploads, uploadFiles, isUploading } = useMediaUpload();

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    void uploadFiles(Array.from(fileList), folderId);
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-nk-2xl border border-dashed px-6 py-6 text-center transition-colors",
          isDragging
            ? "border-primary-7 bg-primary-1"
            : "border-primary-7/60 bg-primary-1/40 hover:bg-primary-1"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_ATTR}
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            // Zera para que reescolher o MESMO arquivo dispare onChange de novo.
            e.target.value = "";
          }}
        />
        {isUploading ? (
          <Spinner size={28} />
        ) : (
          <Icon name="cloud_upload" size={32} className="text-primary-7" />
        )}
        <p className="text-sm-p font-semibold text-primary-7">
          Clique ou arraste arquivos para enviar
        </p>
        <p className="text-xs-p text-neutral-gray-8">Imagens, PDF e documentos do Word</p>
      </div>

      {uploads.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-nk-xl bg-white p-3">
          {uploads.map((upload) => (
            <div key={upload.id} className="flex items-center gap-2 text-xs-p">
              {upload.status === "done" ? (
                <Icon name="check_circle" size={16} className="shrink-0 text-primary-7" />
              ) : upload.status === "error" ? (
                <Icon name="error_circle" size={16} className="shrink-0 text-functional-error" />
              ) : (
                <Spinner size={14} className="shrink-0" />
              )}
              <span className="flex-1 truncate text-neutral-gray-11">{upload.file.name}</span>
              <span
                className={cn(
                  "shrink-0",
                  upload.status === "error" ? "text-functional-error" : "text-neutral-gray-8"
                )}
              >
                {upload.error ?? STATUS_LABEL[upload.status]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
