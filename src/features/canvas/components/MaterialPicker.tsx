"use client";

import React from "react";

import { Button, Modal } from "@/components/ui";
import { useCategoriaIdByNome } from "@/lib/hooks/useCategorias";
import { cn } from "@/lib/utils";
import { EntityPickerList } from "@/features/catalog/components/EntityPickerList";
import type { CatalogEntity } from "@/shared/types/domain";

interface MaterialPickerProps {
  open: boolean;
  title?: string;
  subtitle?: string;
  /** id de catálogo (baseId) atual, para pré-seleção. */
  currentId: number | null;
  /**
   * Categoria (nome) do material padrão do componente — vira o filtro inicial
   * da lista, removível pelo usuário. "" = componente sem padrão, sem filtro.
   */
  categoria: string;
  /** Seleção múltipla (adicionar várias opções de uma vez); padrão = uma só. */
  multiple?: boolean;
  /** Ids de catálogo a esconder (opções que o componente já tem). */
  excludeIds?: readonly number[];
  onClose: () => void;
  /**
   * Ids de catálogo (Material ou Kit) escolhidos, na ordem de seleção — sempre
   * um só item quando `multiple` é falso.
   */
  onConfirm: (ids: number[]) => void;
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
 *
 * No modo `multiple` a seleção sobrevive à troca de busca, filtro e página,
 * então dá para juntar itens de categorias diferentes numa confirmação só.
 */
export function MaterialPicker({
  open,
  title,
  subtitle,
  currentId,
  categoria,
  multiple = false,
  excludeIds,
  onClose,
  onConfirm,
  confirming,
}: MaterialPickerProps) {
  // Array (não Set) para preservar a ordem de clique — é a ordem das opções.
  const [sel, setSel] = React.useState<number[]>([]);

  React.useEffect(() => {
    if (!open) return;
    setSel(currentId !== null ? [currentId] : []);
  }, [open, currentId]);

  // Só o filtro INICIAL (mesma regra da config de materiais): o padrão pode
  // estar numa categoria à parte (ex.: "Não entregue") e os upgrades noutra.
  const initialCategoriaId = useCategoriaIdByNome(categoria);

  const selectedIds = React.useMemo(() => new Set(sel), [sel]);

  const handleSelect = React.useCallback(
    (e: CatalogEntity) =>
      setSel((prev) => {
        if (!multiple) return [e.id];
        return prev.includes(e.id) ? prev.filter((id) => id !== e.id) : [...prev, e.id];
      }),
    [multiple]
  );

  const n = sel.length;
  const confirmLabel = !multiple
    ? "Confirmar"
    : n === 0
      ? "Adicionar"
      : `Adicionar ${n} ${n === 1 ? "opção" : "opções"}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title ?? "Associar material"}
      width={620}
      actions={
        <>
          {multiple && n > 0 && (
            <span className="mr-auto flex items-center gap-2 text-xs text-neutral-gray-7">
              {n} {n === 1 ? "selecionado" : "selecionados"}
              <button
                type="button"
                onClick={() => setSel([])}
                className="font-semibold text-primary-7 hover:underline"
              >
                Limpar
              </button>
            </span>
          )}
          <Button variant="bordered" onPress={onClose}>
            Cancelar
          </Button>
          <Button onPress={() => n > 0 && onConfirm(sel)} isDisabled={n === 0} isLoading={confirming}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {subtitle && (
        <p className={cn("text-[13px] text-neutral-gray-7", categoria !== "" ? "mb-1" : "mb-3")}>
          {subtitle}
        </p>
      )}
      {categoria !== "" && (
        <p className="mb-3 text-xs text-neutral-gray-7">
          Filtrado pela categoria <strong>{categoria}</strong> do material padrão — troque o filtro
          para ver outras categorias.
        </p>
      )}
      <EntityPickerList
        tipo="all"
        initialCategoriaId={initialCategoriaId}
        excludeIds={excludeIds}
        mode={multiple ? "multi" : "single"}
        selectedId={sel[0] ?? null}
        selectedIds={selectedIds}
        onSelect={handleSelect}
        maxHeightClass="max-h-[360px]"
        emptyText="Nenhum material encontrado."
      />
    </Modal>
  );
}
