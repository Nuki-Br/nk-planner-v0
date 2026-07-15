"use client";

import Image from "next/image";

import { Modal } from "@/components/ui";
import type { MediaFileListItemDto } from "@/shared/types/media";

/**
 * Lightbox de imagem.
 *
 * O wrapper Modal do repo sempre renderiza header — diverge do lightbox sem
 * chrome do admin, mas ganha nome acessível de graça, o que vale a troca.
 */
export function FilePreviewModal({
  file,
  onClose,
}: {
  file: MediaFileListItemDto | null;
  onClose: () => void;
}) {
  const url = file ? file.publicUrl ?? file.publicOptimizedUrl : null;

  return (
    <Modal open={!!file} onClose={onClose} title="Pré-visualização" width={860}>
      <div className="relative h-[540px] w-full">
        {url && (
          <Image
            src={url}
            alt={file?.displayName ?? ""}
            fill
            sizes="860px"
            className="rounded-nk-xl object-scale-down"
          />
        )}
      </div>
    </Modal>
  );
}
