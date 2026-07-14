"use client";

import React from "react";
import { Input as HeroInput } from "@heroui/react";

import { Button, Icon, Modal } from "@/components/ui";
import { getMaterial, type Entity } from "@/lib/data/entities";
import { cn, fmtBRL, parseBR } from "@/lib/utils";
import { KitBadge } from "@/features/catalog/components/KitBadge";
import type { Categoria, Kit, Material } from "@/shared/types/domain";

export interface SelectionResult {
  /** Id de catálogo (BaseMaterial) escolhido. */
  id: number;
  /** Quantitativos por sub-item (keyed por KitItem id) quando a seleção é um kit. */
  kitQtds: Record<number, number> | null;
}

interface SelectEntityModalProps {
  open: boolean;
  mode: "padrao" | "upgrade";
  onClose: () => void;
  onConfirm: (result: SelectionResult) => void;
  categoria: Categoria;
  materiais: Material[];
  kits: Kit[];
  /** Ids de catálogo excluídos da lista (padrão atual e upgrades já usados). */
  excludeIds: Set<number>;
  /** Quantitativos já gravados (keyed por KitItem id) — pré-preenche o passo 2. */
  existingKitQtds: Record<number, number>;
  compNome: string;
  tipNome: string;
  confirming?: boolean;
}

// Modal Selecionar material/kit (passo 1) + Quantitativos do kit (passo 2).
// Kits aparecem primeiro, como no protótipo.
export function SelectEntityModal({
  open,
  mode,
  onClose,
  onConfirm,
  categoria,
  materiais,
  kits,
  excludeIds,
  existingKitQtds,
  compNome,
  tipNome,
  confirming,
}: SelectEntityModalProps) {
  const [step, setStep] = React.useState<1 | 2>(1);
  const [picked, setPicked] = React.useState<number | null>(null);
  const [qtds, setQtds] = React.useState<Record<number, string>>({});
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setStep(1);
    setPicked(null);
    setQtds({});
    setSearch("");
  }, [open]);

  const candidates: Entity[] = [
    ...kits.filter((k) => k.categoria === categoria).map((k): Entity => ({ ...k, isKit: true })),
    ...materiais
      .filter((m) => m.categoria === categoria)
      .map((m): Entity => ({ ...m, isKit: false })),
  ]
    .filter((e) => !excludeIds.has(e.id))
    .filter(
      (e) =>
        e.nome.toLowerCase().includes(search.toLowerCase()) ||
        e.codigo.toLowerCase().includes(search.toLowerCase())
    );

  const pickedKit = picked !== null ? (kits.find((k) => k.id === picked) ?? null) : null;

  const goToQtds = () => {
    if (!pickedKit) return;
    const seeded: Record<number, string> = {};
    for (const it of pickedKit.itens) {
      const existing = existingKitQtds[it.id];
      seeded[it.id] = existing !== undefined ? String(existing).replace(".", ",") : "";
    }
    setQtds(seeded);
    setStep(2);
  };

  const confirmPick = () => {
    if (picked === null) return;
    if (pickedKit) {
      goToQtds();
      return;
    }
    onConfirm({ id: picked, kitQtds: null });
  };

  const confirmKitQtds = () => {
    if (picked === null) return;
    const parsed: Record<number, number> = {};
    for (const [mid, raw] of Object.entries(qtds)) parsed[Number(mid)] = parseBR(raw);
    onConfirm({ id: picked, kitQtds: parsed });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        step === 2
          ? "Quantitativos do kit"
          : mode === "padrao"
            ? "Trocar material padrão"
            : "Adicionar opção de upgrade"
      }
      width={620}
      actions={
        step === 2 ? (
          <>
            <Button variant="bordered" onPress={() => setStep(1)}>
              ← Voltar
            </Button>
            <Button onPress={confirmKitQtds} isLoading={confirming}>
              Confirmar quantitativos
            </Button>
          </>
        ) : (
          <>
            <Button variant="bordered" onPress={onClose}>
              Cancelar
            </Button>
            <Button onPress={confirmPick} isDisabled={picked === null} isLoading={confirming}>
              {pickedKit
                ? "Continuar →"
                : mode === "padrao"
                  ? "Definir padrão"
                  : "Adicionar"}
            </Button>
          </>
        )
      }
    >
      {step === 1 && (
        <>
          <p className="mb-3 text-xs text-neutral-gray-7">
            Materiais e kits da categoria <strong>{categoria}</strong>. Kits aparecem com o selo
            Kit.
          </p>
          <HeroInput
            value={search}
            onValueChange={setSearch}
            placeholder="Buscar material ou kit..."
            aria-label="Buscar material ou kit"
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
          <div className="flex max-h-[340px] flex-col gap-1 overflow-y-auto">
            {candidates.length === 0 && (
              <div className="p-[18px] text-center text-xs text-neutral-gray-6">
                Nenhum item encontrado nesta categoria.
              </div>
            )}
            {candidates.map((e) => {
              const sel = picked === e.id;
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setPicked(e.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left",
                    sel ? "border-primary-7 bg-primary-1" : "border-neutral-gray-4 bg-white"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                      sel ? "border-primary-7" : "border-neutral-gray-5"
                    )}
                  >
                    {sel && <span className="h-[7px] w-[7px] rounded-full bg-primary-7" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[13px] font-semibold text-neutral-gray-11">
                        {e.nome}
                      </span>
                      {e.isKit && <KitBadge />}
                    </span>
                    <span className="mt-px block text-[11px] text-neutral-gray-7">
                      {e.isKit
                        ? `${e.codigo} · ${e.itens.length} itens`
                        : `${e.codigo} · ${e.fabricante}`}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-neutral-gray-8">
                    {e.isKit ? (
                      <span className="text-neutral-gray-5">soma dos itens</span>
                    ) : (
                      `${fmtBRL(e.custoMat)}/${e.unidade}`
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {step === 2 && pickedKit && (
        <>
          <div className="mb-3.5 flex items-center gap-2 rounded-lg bg-primary-1 px-3.5 py-2.5">
            <KitBadge />
            <span className="text-[13px] font-bold text-primary-8">{pickedKit.nome}</span>
          </div>
          <p className="mb-3.5 text-xs text-neutral-gray-7">
            Informe o quantitativo de cada sub-item para{" "}
            <strong>
              {compNome} · {tipNome}
            </strong>
            .
          </p>
          <div className="flex flex-col gap-2">
            {pickedKit.itens.map((it) => {
              const m = getMaterial(materiais, it.materialId);
              if (!m) return null;
              return (
                <div
                  key={it.id}
                  className="flex items-center gap-3 rounded-lg border border-neutral-gray-4 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-neutral-gray-11">
                      {m.nome}
                    </p>
                    <code className="text-[10px] text-neutral-gray-6">{m.codigo}</code>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      value={qtds[it.id] ?? ""}
                      onChange={(e) =>
                        setQtds((prev) => ({ ...prev, [it.id]: e.target.value }))
                      }
                      placeholder="0,00"
                      className="h-9 w-[90px] rounded-lg border border-neutral-gray-5 px-2.5 text-right text-[13px] text-neutral-gray-11 outline-none focus:border-primary-7"
                    />
                    <span className="w-7 text-xs text-neutral-gray-7">{m.unidade}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Modal>
  );
}
