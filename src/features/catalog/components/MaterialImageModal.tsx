"use client";

import React from "react";

import { Button, Modal } from "@/components/ui";
import { ImagePickerField } from "@/features/media";
import { useUpdateMaterial } from "@/lib/hooks/useMateriais";
import type { ImagemVinculada, Material } from "@/shared/types/domain";

interface MaterialImageModalProps {
  /** Material em edição; null = fechado. */
  material: Material | null;
  onClose: () => void;
}

/**
 * Edita SÓ a imagem de um material, de qualquer tela.
 *
 * Existe porque a imagem precisa ser editável fora do catálogo (tipologias,
 * visualizador) sem arrastar o MaterialModal inteiro — que também mexe em
 * código, categoria, fabricante e unidade.
 *
 * Não faz trabalho de rede próprio: o useUpdateMaterial já aceita
 * `patch: { imagem }` e invalida queryKeys.materiais no sucesso, e TODA tela que
 * mostra material assina essa key — então a edição se propaga sozinha.
 */
export function MaterialImageModal({ material, onClose }: MaterialImageModalProps) {
  const updateMaterial = useUpdateMaterial();
  const [imagem, setImagem] = React.useState<ImagemVinculada | null>(null);

  React.useEffect(() => {
    if (material) setImagem(material.imagem ?? null);
  }, [material]);

  const handleSave = () => {
    if (!material) return;
    updateMaterial.mutate({ id: material.id, patch: { imagem } }, { onSuccess: onClose });
  };

  return (
    <Modal
      open={material !== null}
      onClose={onClose}
      title="Imagem do material"
      width={480}
      actions={
        <>
          <Button variant="bordered" onPress={onClose}>
            Cancelar
          </Button>
          <Button variant="teal" onPress={handleSave} isLoading={updateMaterial.isPending}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-neutral-gray-7">
          {material?.nome}
          {material?.fabricante ? ` · ${material.fabricante}` : ""}
        </p>
        <ImagePickerField
          label="Imagem"
          hint="Foto ou render do acabamento, exibida no memorial."
          value={imagem}
          onChange={setImagem}
        />
      </div>
    </Modal>
  );
}
