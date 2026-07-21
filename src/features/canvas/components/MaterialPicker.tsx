"use client";

import React from "react";

import { Button, Modal } from "@/components/ui";
import { EntityPickerList } from "@/features/catalog/components/EntityPickerList";
import type { CatalogEntity } from "@/shared/types/domain";

interface MaterialPickerProps {
  open: boolean;
  title?: string;
  subtitle?: string;
  /** id de catálogo (baseId) atual, para pré-seleção. */
  currentId: number | null;
  onClose: () => void;
  /** Recebe o id de catálogo (Material ou Kit) escolhido. */
  onConfirm: (id: number) => void;
  confirming?: boolean;
}

/**
 * Modal "Associar material". A lista, a busca e o filtro de categoria vivem no
 * EntityPickerList compartilhado — antes esta tela carregava o catálogo inteiro
 * e refiltrava a cada tecla, com a linha declarada dentro do render (remontava
 * a lista toda a cada caractere).
 *
 * O filtro de categoria virou Select: os chips eram derivados da lista
 * carregada e, com a paginação no servidor, mostrariam só as categorias
 * presentes na página atual.
 */
export function MaterialPicker({
  open,
  title,
  subtitle,
  currentId,
  onClose,
  onConfirm,
  confirming,
}: MaterialPickerProps) {
  const [sel, setSel] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setSel(currentId);
  }, [open, currentId]);

  const handleSelect = React.useCallback((e: CatalogEntity) => setSel(e.id), []);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title ?? "Associar material"}
      width={620}
      actions={
        <>
          <Button variant="bordered" onPress={onClose}>
            Cancelar
          </Button>
          <Button
            onPress={() => sel !== null && onConfirm(sel)}
            isDisabled={sel === null}
            isLoading={confirming}
          >
            Confirmar
          </Button>
        </>
      }
    >
      {subtitle && <p className="mb-3 text-[13px] text-neutral-gray-7">{subtitle}</p>}
      <EntityPickerList
        tipo="all"
        mode="single"
        selectedId={sel}
        onSelect={handleSelect}
        maxHeightClass="max-h-[360px]"
        emptyText="Nenhum material encontrado."
      />
    </Modal>
  );
}
