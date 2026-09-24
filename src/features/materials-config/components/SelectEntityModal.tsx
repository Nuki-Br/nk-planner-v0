"use client";

import React from "react";

import { Button, Modal } from "@/components/ui";
import { getMaterial } from "@/lib/data/entities";
import { useCategoriaIdByNome } from "@/lib/hooks/useCategorias";
import { fmtNum } from "@/lib/utils";
import { EntityPickerList } from "@/features/catalog/components/EntityPickerList";
import { KitBadge } from "@/features/catalog/components/KitBadge";
import type { CatalogEntity, Material, Unidade } from "@/shared/types/domain";

export interface SelectionResult {
  /** Id de catálogo (BaseMaterial) escolhido. */
  id: number;
  /**
   * Quantitativos por sub-item (keyed por KitItem id) quando a seleção é um kit.
   * Campo deixado em branco não entra: o sub-item herda a qtd do componente
   * (mesma unidade) ou fica pendente — em vez de virar 0 em silêncio.
   */
  kitQtds: Record<number, number> | null;
}

interface SelectEntityModalProps {
  open: boolean;
  mode: "padrao" | "upgrade";
  onClose: () => void;
  onConfirm: (result: SelectionResult) => void;
  categoria: string;
  /**
   * Só para o passo 2 (quantitativos): KitItem tem nome/fabricante mas NÃO tem
   * `codigo`, que a tela exibe — resolver pelo material continua necessário.
   * A lista do passo 1 vem paginada do servidor, não daqui.
   */
  materiais: Material[];
  /** Ids de catálogo excluídos da lista (padrão atual e upgrades já usados). */
  excludeIds: Set<number>;
  /** Quantitativos já gravados (keyed por KitItem id) — pré-preenche o passo 2. */
  existingKitQtds: Record<number, number>;
  /** Quantidade/unidade do componente nesta planta — o que o sub-item herda. */
  compQtd: number;
  compUnidade: Unidade;
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
  excludeIds,
  existingKitQtds,
  compQtd,
  compUnidade,
  compNome,
  tipNome,
  confirming,
}: SelectEntityModalProps) {
  const [step, setStep] = React.useState<1 | 2>(1);
  // Guarda a ENTIDADE, não só o id: com a lista paginada no servidor o kit
  // escolhido pode não estar mais na página quando o passo 2 precisar dele.
  const [pickedEntity, setPickedEntity] = React.useState<CatalogEntity | null>(null);
  const [qtds, setQtds] = React.useState<Record<number, string>>({});

  React.useEffect(() => {
    if (!open) return;
    setStep(1);
    setPickedEntity(null);
    setQtds({});
  }, [open]);

  // categoria "" (componente sem padrão) = sem filtro. É só o filtro INICIAL:
  // o padrão pode estar numa categoria à parte (ex.: "Não entregue") e os
  // upgrades noutra, então o usuário pode trocá-lo.
  const initialCategoriaId = useCategoriaIdByNome(categoria);

  // O picker recebe array; o call site já tem um Set.
  const excludeIdList = React.useMemo(() => [...excludeIds], [excludeIds]);

  const picked = pickedEntity?.id ?? null;
  const pickedKit = pickedEntity?.isKit ? pickedEntity : null;

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
    for (const [itemId, raw] of Object.entries(qtds)) {
      if (raw.trim() === "") continue;
      const n = parseFloat(raw.replace(",", "."));
      if (Number.isFinite(n) && n >= 0) parsed[Number(itemId)] = n;
    }
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
            {categoria === "" ? (
              <>Materiais e kits do catálogo. Kits aparecem com o selo Kit.</>
            ) : (
              <>
                Filtrado pela categoria <strong>{categoria}</strong> do material padrão — troque o
                filtro para ver outras categorias. Kits aparecem com o selo Kit.
              </>
            )}
          </p>
          <EntityPickerList
            tipo="all"
            initialCategoriaId={initialCategoriaId}
            excludeIds={excludeIdList}
            mode="single"
            selectedId={picked}
            onSelect={setPickedEntity}
            emptyText="Nenhum item encontrado com esses filtros."
          />
        </>
      )}

      {step === 2 && pickedKit && (
        <>
          <div className="mb-3.5 flex items-center gap-2 rounded-lg bg-primary-1 px-3.5 py-2.5">
            <KitBadge />
            <span className="text-[13px] font-bold text-primary-8">{pickedKit.nome}</span>
          </div>
          <p className="mb-3.5 text-xs text-neutral-gray-7">
            Informe o quantitativo líquido de cada sub-item para{" "}
            <strong>
              {compNome} · {tipNome}
            </strong>{" "}
            (a RT do componente entra no débito). Em branco, o item na unidade do componente
            herda {fmtNum(compQtd, 2)} {compUnidade}; os demais ficam pendentes no Construtor de
            Preço.
          </p>
          <div className="flex flex-col gap-2">
            {pickedKit.itens.map((it) => {
              const m = getMaterial(materiais, it.materialId);
              const herda = it.unidade === compUnidade;
              return (
                <div
                  key={it.id}
                  className="flex items-center gap-3 rounded-lg border border-neutral-gray-4 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-neutral-gray-11">
                      {m?.nome ?? it.nome}
                    </p>
                    <code className="text-[10px] text-neutral-gray-6">
                      {m?.codigo ?? it.fabricante}
                    </code>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      value={qtds[it.id] ?? ""}
                      onChange={(e) =>
                        setQtds((prev) => ({ ...prev, [it.id]: e.target.value }))
                      }
                      placeholder={herda ? fmtNum(compQtd, 2) : "pendente"}
                      className="h-9 w-[90px] rounded-lg border border-neutral-gray-5 px-2.5 text-right text-[13px] text-neutral-gray-11 outline-none focus:border-primary-7"
                    />
                    <span className="w-7 text-xs text-neutral-gray-7">{it.unidade}</span>
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
