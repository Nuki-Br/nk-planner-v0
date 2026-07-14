"use client";

import React from "react";
import { Input as HeroInput } from "@heroui/react";

import { Button, Icon, Modal } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Kit, Material } from "@/shared/types/domain";

import { swatchStyle } from "../swatch";
import { CvIcon } from "./primitives";

interface MaterialPickerProps {
  open: boolean;
  title?: string;
  subtitle?: string;
  /** id de catálogo (baseId) atual, para pré-seleção. */
  currentId: number | null;
  materiais: Material[];
  kits: Kit[];
  onClose: () => void;
  /** Recebe o id de catálogo (Material ou Kit) escolhido. */
  onConfirm: (id: number) => void;
  confirming?: boolean;
}

/** Modal "Associar material": busca + filtro de categoria, kits primeiro. */
export function MaterialPicker({
  open,
  title,
  subtitle,
  currentId,
  materiais,
  kits,
  onClose,
  onConfirm,
  confirming,
}: MaterialPickerProps) {
  const [q, setQ] = React.useState("");
  const [cat, setCat] = React.useState("");
  const [sel, setSel] = React.useState<number | null>(null);
  React.useEffect(() => {
    if (!open) return;
    setQ("");
    setCat("");
    setSel(currentId);
  }, [open, currentId]);

  const cats = Array.from(new Set(materiais.map((m) => m.categoria)));
  const ql = q.trim().toLowerCase();
  const matList = materiais.filter(
    (m) =>
      (cat === "" || m.categoria === cat) &&
      (ql === "" || m.nome.toLowerCase().includes(ql) || m.codigo.toLowerCase().includes(ql))
  );
  const kitList = kits.filter(
    (k) => (cat === "" || k.categoria === cat) && (ql === "" || k.nome.toLowerCase().includes(ql))
  );

  const Row = ({
    id,
    nome,
    sub,
    isKit = false,
    mat,
  }: {
    id: number;
    nome: string;
    sub: string;
    isKit?: boolean;
    mat?: Material;
  }) => {
    const on = sel === id;
    return (
      <button
        type="button"
        onClick={() => setSel(id)}
        className={cn(
          "flex w-full min-w-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left",
          on ? "border-2 border-primary-7 bg-primary-1" : "border border-neutral-gray-4 bg-white"
        )}
      >
        {isKit ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[7px] bg-primary-8 text-white">
            <CvIcon name="hex" size={18} />
          </span>
        ) : (
          <span
            className="h-9 w-9 shrink-0 rounded-[7px] border border-neutral-gray-5"
            style={swatchStyle(mat)}
          />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-neutral-gray-11">
            {nome}
          </span>
          <span className="block text-[11px] text-neutral-gray-7">{sub}</span>
        </span>
        {on && <Icon name="check" size={16} className="shrink-0 text-primary-7" />}
      </button>
    );
  };

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
      <HeroInput
        value={q}
        onValueChange={setQ}
        placeholder="Buscar material no catálogo…"
        aria-label="Buscar material no catálogo"
        variant="bordered"
        radius="sm"
        size="sm"
        startContent={<Icon name="search" size={14} className="text-neutral-gray-6" />}
        classNames={{
          base: "mb-3",
          inputWrapper: "!border-small h-10 border-neutral-gray-5 bg-white",
          input: "text-[13px]",
        }}
      />
      <div className="mb-3 flex flex-wrap gap-1.5">
        {["", ...cats].map((c) => {
          const on = cat === c;
          return (
            <button
              key={c === "" ? "all" : c}
              type="button"
              onClick={() => setCat(c)}
              className={cn(
                "rounded-full border px-[11px] py-[5px] text-[11.5px] font-semibold transition-colors",
                on
                  ? "border-primary-7 bg-primary-1 text-primary-7"
                  : "border-neutral-gray-5 bg-white text-neutral-gray-8 hover:border-neutral-gray-6"
              )}
            >
              {c === "" ? "Todos" : c}
            </button>
          );
        })}
      </div>
      <div className="grid max-h-[360px] grid-cols-1 gap-2 overflow-y-auto pr-1 md:grid-cols-2">
        {kitList.map((k) => (
          <Row key={k.id} id={k.id} nome={k.nome} sub={`Kit · ${k.itens.length} itens`} isKit />
        ))}
        {matList.map((m) => (
          <Row key={m.id} id={m.id} nome={m.nome} sub={`${m.fabricante} · ${m.categoria}`} mat={m} />
        ))}
        {kitList.length + matList.length === 0 && (
          <p className="col-span-full p-6 text-center text-[13px] text-neutral-gray-6">
            Nenhum material encontrado.
          </p>
        )}
      </div>
    </Modal>
  );
}
