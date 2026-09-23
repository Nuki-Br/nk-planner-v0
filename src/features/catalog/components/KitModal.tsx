"use client";

import React from "react";

import { Button, Icon, Input, Modal, Select } from "@/components/ui";
import { getMaterial } from "@/lib/data/entities";
import { useCategoriaIdByNome, useCategorias } from "@/lib/hooks/useCategorias";
import { useCreateKit, useUpdateKit } from "@/lib/hooks/useKits";
import { UNIDADE_OPTIONS, type Unidade } from "@/shared/constants/unidades";
import type { CatalogEntity, Kit, KitItem, Material } from "@/shared/types/domain";

import { CategoryChip } from "./CategoryChip";
import { CategoryCombobox } from "./CategoryCombobox";
import { EntityPickerList } from "./EntityPickerList";

interface KitModalProps {
  open: boolean;
  onClose: () => void;
  /** Kit em edição; null = criar. */
  kit: Kit | null;
  materiais: Material[];
}

/** Código automático do kit: "KIT-" + iniciais do nome (mock). */
function kitCodigo(nome: string): string {
  const initials = nome
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 4);
  return `KIT-${initials || "NOVO"}`;
}

// Modal Criar/Editar kit (largura 640). Trocar a categoria reseta a
// composição, como no protótipo. A unidade de cada sub-item é escolhida AQUI
// (select por item, persistida em MaterialKitItem.Unit) — o material não
// carrega unidade; ela pertence ao contexto de uso.
export function KitModal({ open, onClose, kit, materiais }: KitModalProps) {
  const { data: categorias = [] } = useCategorias();
  const createKit = useCreateKit();
  const updateKit = useUpdateKit();
  const isEdit = kit !== null;

  const [nome, setNome] = React.useState("");
  const [categoria, setCategoria] = React.useState("");
  const [itens, setItens] = React.useState<KitItem[]>([]);

  React.useEffect(() => {
    if (!open) return;
    setNome(kit?.nome ?? "");
    setCategoria(kit?.categoria ?? "");
    setItens(kit?.itens ?? []);
  }, [open, kit]);

  const addItem = (m: Material) =>
    setItens((xs) =>
      xs.some((it) => it.materialId === m.id)
        ? xs
        : [
            ...xs,
            {
              id: 0,
              materialId: m.id,
              nome: m.nome,
              fabricante: m.fabricante,
              unidade: "und",
            },
          ]
    );
  const removeItem = (materialId: number) =>
    setItens((xs) => xs.filter((it) => it.materialId !== materialId));
  const setItemUnidade = (materialId: number, unidade: Unidade) =>
    setItens((xs) => xs.map((it) => (it.materialId === materialId ? { ...it, unidade } : it)));

  /** O picker entrega CatalogEntity; tipo="single" garante que nunca é kit. */
  const addEntity = React.useCallback((e: CatalogEntity) => {
    if (e.isKit) return;
    addItem(e);
  }, []);

  // A categoria do kit trava o picker. Categoria não escolhida ainda (ou nome
  // que não resolve) → sem trava.
  const lockedCategoriaId = useCategoriaIdByNome(categoria);

  const excludeIds = React.useMemo(() => itens.map((it) => it.materialId), [itens]);

  const valid = nome.trim() !== "" && categoria !== "" && itens.length > 0;
  const pending = createKit.isPending || updateKit.isPending;

  const handleSubmit = () => {
    if (!valid) return;
    const base = { nome: nome.trim(), categoria, itens };
    const opts = { onSuccess: onClose };
    if (isEdit) updateKit.mutate({ id: kit.id, patch: base }, opts);
    else createKit.mutate({ ...base, codigo: kitCodigo(nome) }, opts);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar kit" : "Criar kit"}
      width={640}
      actions={
        <>
          <Button variant="bordered" onPress={onClose}>
            Cancelar
          </Button>
          <Button onPress={handleSubmit} isDisabled={!valid} isLoading={pending}>
            {isEdit ? "Salvar alterações" : "Criar kit"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-[13px] text-neutral-gray-7">
          Um kit agrupa materiais do catálogo sob um nome único. O custo é a soma dos
          sub-itens — preenchido na revisão de custos por material. Quantidades são definidas
          por tipologia.
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[2fr_1fr]">
          <Input
            label="Nome do kit"
            value={nome}
            onValueChange={setNome}
            placeholder="Ex: Metais Bronze"
          />
          <CategoryCombobox
            value={categoria}
            onChange={(v) => {
              setCategoria(v);
              setItens([]);
            }}
            // Rename da categoria selecionada NÃO reseta a composição.
            onRenamed={setCategoria}
          />
        </div>

        <div className="border-t border-neutral-gray-4 pt-3.5">
          <p className="text-[13px] font-bold text-neutral-gray-9">Composição do kit</p>
          <p className="mb-3 mt-0.5 text-xs text-neutral-gray-7">
            Adicione os materiais que compõem este kit
            {categoria !== "" ? ` — categoria ${categoria}` : ""}.
          </p>

          {itens.length === 0 ? (
            <div className="mb-3 rounded-lg border border-dashed border-neutral-gray-5 p-4 text-center">
              <span className="text-xs text-neutral-gray-6">Nenhum material adicionado ainda</span>
            </div>
          ) : (
            <div className="mb-3.5 flex flex-col gap-1.5">
              {itens.map((it) => {
                const m = getMaterial(materiais, it.materialId);
                if (!m) return null;
                return (
                  <div
                    key={it.materialId}
                    className="flex items-center gap-2.5 rounded-lg border border-neutral-gray-4 bg-neutral-gray-2 px-3 py-[9px]"
                  >
                    <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-primary-7" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-neutral-gray-11">
                        {m.nome}
                      </p>
                      <code className="text-[10px] text-neutral-gray-6">{m.codigo}</code>
                    </div>
                    <CategoryChip
                      nome={m.categoria}
                      categorias={categorias}
                      className="!text-[10px]"
                    />
                    <Select
                      aria-label="Unidade de medida deste item"
                      options={UNIDADE_OPTIONS}
                      value={it.unidade}
                      // Guarda contra deseleção (HeroUI emite "" ao limpar).
                      onValueChange={(v) => {
                        if (v !== "") setItemUnidade(it.materialId, v as Unidade);
                      }}
                      small
                      className="w-[132px] shrink-0"
                      classNames={{ trigger: "h-8 min-h-8 bg-white" }}
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(it.materialId)}
                      title="Remover do kit"
                      className="flex p-1 text-neutral-gray-7 hover:text-functional-error"
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <EntityPickerList
            tipo="single"
            lockedCategoriaId={lockedCategoriaId}
            excludeIds={excludeIds}
            mode="add"
            onSelect={addEntity}
            maxHeightClass="max-h-[220px]"
            emptyText="Nenhum material disponível para adicionar"
          />
        </div>
      </div>
    </Modal>
  );
}
