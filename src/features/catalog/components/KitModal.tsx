"use client";

import React from "react";
import { Input as HeroInput } from "@heroui/react";

import { Button, Icon, Input, Modal, Select } from "@/components/ui";
import { getMaterial } from "@/lib/data/entities";
import { useCreateKit, useUpdateKit } from "@/lib/hooks/useKits";
import { cn } from "@/lib/utils";
import { CAT_COLORS, CATEGORIAS, type Categoria } from "@/shared/constants/categorias";
import type { Kit, Material } from "@/shared/types/domain";

interface KitModalProps {
  open: boolean;
  onClose: () => void;
  /** Kit em edição; null = criar. */
  kit: Kit | null;
  materiais: Material[];
}

const CATEGORIA_OPTIONS = CATEGORIAS.map((c) => ({ value: c, label: c }));

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
// composição, como no protótipo. Desvio documentado: a unidade de cada
// sub-item é a do próprio material (chip read-only) — o select por item do
// protótipo não era persistido em lugar nenhum e o tipo Kit não o comporta.
export function KitModal({ open, onClose, kit, materiais }: KitModalProps) {
  const createKit = useCreateKit();
  const updateKit = useUpdateKit();
  const isEdit = kit !== null;

  const [nome, setNome] = React.useState("");
  const [categoria, setCategoria] = React.useState("");
  const [itens, setItens] = React.useState<string[]>([]);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setNome(kit?.nome ?? "");
    setCategoria(kit?.categoria ?? "");
    setItens(kit?.itens ?? []);
    setSearch("");
  }, [open, kit]);

  const addItem = (id: string) => setItens((xs) => (xs.includes(id) ? xs : [...xs, id]));
  const removeItem = (id: string) => setItens((xs) => xs.filter((x) => x !== id));

  const candidates = materiais
    .filter((m) => categoria === "" || m.categoria === categoria)
    .filter((m) => !itens.includes(m.id))
    .filter(
      (m) =>
        m.nome.toLowerCase().includes(search.toLowerCase()) ||
        m.codigo.toLowerCase().includes(search.toLowerCase())
    );

  const valid = nome.trim() !== "" && categoria !== "" && itens.length > 0;
  const pending = createKit.isPending || updateKit.isPending;

  const handleSubmit = () => {
    if (!valid) return;
    const base = { nome: nome.trim(), categoria: categoria as Categoria, itens };
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
          <Select
            label="Categoria"
            options={CATEGORIA_OPTIONS}
            value={categoria}
            onValueChange={(v) => {
              setCategoria(v);
              setItens([]);
            }}
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
              {itens.map((mid) => {
                const m = getMaterial(materiais, mid);
                if (!m) return null;
                return (
                  <div
                    key={mid}
                    className="flex items-center gap-2.5 rounded-lg border border-neutral-gray-4 bg-neutral-gray-2 px-3 py-[9px]"
                  >
                    <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-primary-7" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-neutral-gray-11">
                        {m.nome}
                      </p>
                      <code className="text-[10px] text-neutral-gray-6">{m.codigo}</code>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-[9px] py-0.5 text-[10px] font-semibold",
                        CAT_COLORS[m.categoria]
                      )}
                    >
                      {m.categoria}
                    </span>
                    <span
                      title="Unidade de medida deste item (do cadastro do material)"
                      className="rounded border border-neutral-gray-5 bg-white px-1.5 py-0.5 text-xs text-neutral-gray-11"
                    >
                      {m.unidade}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(mid)}
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

          <HeroInput
            value={search}
            onValueChange={setSearch}
            placeholder="Buscar material para adicionar..."
            variant="bordered"
            radius="sm"
            size="sm"
            startContent={<Icon name="search" size={14} className="text-neutral-gray-6" />}
            classNames={{
              base: "mb-2.5",
              inputWrapper: "!border-small h-10 border-neutral-gray-5 bg-white",
              input: "text-[13px]",
            }}
          />
          <div className="max-h-[200px] overflow-y-auto rounded-lg border border-neutral-gray-4">
            {candidates.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => addItem(m.id)}
                className="flex w-full items-center gap-3 border-b border-neutral-gray-4 px-3 py-[9px] text-left last:border-b-0 hover:bg-primary-1"
              >
                <Icon name="plus" size={14} className="shrink-0 text-primary-7" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-neutral-gray-11">
                    {m.nome}
                  </span>
                  <span className="mt-px block text-[11px] text-neutral-gray-7">
                    {m.codigo} · {m.fabricante}
                  </span>
                </span>
              </button>
            ))}
            {candidates.length === 0 && (
              <div className="p-3.5 text-center text-xs text-neutral-gray-6">
                Nenhum material disponível para adicionar
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
