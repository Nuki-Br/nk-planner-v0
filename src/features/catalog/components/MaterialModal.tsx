"use client";

import React from "react";

import { Button, Input, Modal, Select } from "@/components/ui";
import { ImagePickerField } from "@/features/media";
import { useCreateMaterial, useUpdateMaterial } from "@/lib/hooks/useMateriais";
import { CATEGORIAS, type Categoria } from "@/shared/constants/categorias";
import { UNIDADES, type Unidade } from "@/shared/constants/unidades";
import type { ImagemVinculada, Material } from "@/shared/types/domain";

interface MaterialModalProps {
  open: boolean;
  onClose: () => void;
  /** Material em edição; null = adicionar. */
  material: Material | null;
}

const CATEGORIA_OPTIONS = CATEGORIAS.map((c) => ({ value: c, label: c }));
const UNIDADE_OPTIONS = UNIDADES.map((u) => ({ value: u, label: u }));

// Modal Adicionar/Editar material. Decisão §12: só identificação — custos
// nascem 0 (pendentes) e são preenchidos na revisão ou via link. O campo
// Unidade não existia no modal do protótipo, mas o domínio exige (exibições
// "R$/m²" etc.).
export function MaterialModal({ open, onClose, material }: MaterialModalProps) {
  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial();
  const isEdit = material !== null;

  const [codigo, setCodigo] = React.useState("");
  const [categoria, setCategoria] = React.useState("");
  const [nome, setNome] = React.useState("");
  const [fabricante, setFabricante] = React.useState("");
  const [unidade, setUnidade] = React.useState("und");
  const [imagem, setImagem] = React.useState<ImagemVinculada | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setCodigo(material?.codigo ?? "");
    setCategoria(material?.categoria ?? "");
    setNome(material?.nome ?? "");
    setFabricante(material?.fabricante ?? "");
    setUnidade(material?.unidade ?? "und");
    setImagem(material?.imagem ?? null);
  }, [open, material]);

  const valid = nome.trim() !== "" && categoria !== "";
  const pending = createMaterial.isPending || updateMaterial.isPending;

  const handleSubmit = () => {
    if (!valid) return;
    const ident = {
      codigo: codigo.trim(),
      nome: nome.trim(),
      fabricante: fabricante.trim(),
      categoria: categoria as Categoria,
      unidade: unidade as Unidade,
      imagem,
    };
    const opts = { onSuccess: onClose };
    if (isEdit) updateMaterial.mutate({ id: material.id, patch: ident }, opts);
    else createMaterial.mutate({ ...ident, custoMat: 0, custoMO: 0 }, opts);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar material" : "Adicionar material"}
      actions={
        <>
          <Button variant="bordered" onPress={onClose}>
            Cancelar
          </Button>
          <Button onPress={handleSubmit} isDisabled={!valid} isLoading={pending}>
            {isEdit ? "Salvar alterações" : "Adicionar"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-neutral-gray-7">
          Os custos podem ser preenchidos diretamente na revisão ou via link de preenchimento.
          Cadastre as informações de identificação.
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input
            label="Código de referência"
            value={codigo}
            onValueChange={setCodigo}
            placeholder="Ex: PP-6060-BI"
          />
          <Select
            label="Categoria"
            options={CATEGORIA_OPTIONS}
            value={categoria}
            onValueChange={setCategoria}
          />
        </div>
        <Input
          label="Especificação completa"
          value={nome}
          onValueChange={setNome}
          placeholder="Ex: Porcelanato Polido 60×60 Bianco"
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input
            label="Fabricante"
            value={fabricante}
            onValueChange={setFabricante}
            placeholder="Ex: Portinari"
          />
          <Select
            label="Unidade de medida"
            options={UNIDADE_OPTIONS}
            value={unidade}
            onValueChange={setUnidade}
          />
        </div>

        <div className="border-t border-neutral-gray-4 pt-4">
          <ImagePickerField
            label="Imagem do material"
            hint="Foto ou render do acabamento, exibida no memorial."
            value={imagem}
            onChange={setImagem}
          />
        </div>
      </div>
    </Modal>
  );
}
