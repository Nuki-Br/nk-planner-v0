"use client";

import React from "react";

import { Button, Icon, Input, Modal, Select } from "@/components/ui";
import { cn } from "@/lib/utils";
import { UNIDADES } from "@/shared/constants/unidades";
import type {
  CostComponent,
  CostComponentKind,
  CostComponentSide,
  Material,
  Unidade,
} from "@/shared/types/domain";

/**
 * "Item de custo" é o nome do conceito para o usuário; internamente segue
 * CostComponent / RoomComponentCostItem.
 */
export interface CostItemValue {
  nome: string;
  tipo: CostComponentKind;
  baseId: number | null;
  unidade: Unidade;
  lado: CostComponentSide;
  qtd: number;
}

function RadioCard({
  selected,
  title,
  desc,
  onSelect,
}: {
  selected: boolean;
  title: string;
  desc: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex-1 rounded-lg border px-3 py-2.5 text-left",
        selected ? "border-primary-7 bg-primary-1" : "border-neutral-gray-4 bg-white"
      )}
    >
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "h-2.5 w-2.5 shrink-0 rounded-full border",
            selected ? "border-primary-7 bg-primary-7" : "border-neutral-gray-5"
          )}
        />
        <span className={cn("text-xs font-bold", selected ? "text-primary-8" : "text-neutral-gray-9")}>
          {title}
        </span>
      </div>
      <p className="mt-1 pl-4 text-[11px] leading-snug text-neutral-gray-7">{desc}</p>
    </button>
  );
}

/**
 * Cria/edita um item de custo direto da tabela de orçamento.
 *
 * O LADO não é perguntado: vem da seção da linha em que o usuário clicou
 * (padrão → crédito, personalizado → débito). O que ele escolhe é só como o
 * preço é resolvido (espelho/fixo), a unidade e a quantidade.
 */
export function CostItemModal({
  open,
  editing,
  lado,
  compNome,
  ambNome,
  nOpcoes,
  qtdInicial,
  materiais,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  /** null = criando. */
  editing: CostComponent | null;
  /** Determinado pela seção da linha — o usuário não escolhe. */
  lado: CostComponentSide;
  compNome: string;
  ambNome: string;
  /** Quantas opções de upgrade o componente tem (para o aviso de abrangência). */
  nOpcoes: number;
  qtdInicial: number;
  materiais: Material[];
  saving: boolean;
  onClose: () => void;
  onSave: (v: CostItemValue) => void;
}) {
  const [nome, setNome] = React.useState("");
  const [tipo, setTipo] = React.useState<CostComponentKind>("espelho");
  const [baseId, setBaseId] = React.useState<number | null>(null);
  const [unidade, setUnidade] = React.useState<Unidade>("und");
  const [qtd, setQtd] = React.useState("1");

  React.useEffect(() => {
    if (!open) return;
    setNome(editing?.nome ?? "");
    setTipo(editing?.tipo ?? "espelho");
    setBaseId(editing?.baseId ?? null);
    setUnidade(editing?.unidade ?? "und");
    setQtd(String(qtdInicial || 1));
  }, [open, editing, qtdInicial]);

  const qtdNum = parseFloat(qtd.replace(",", ".")) || 0;
  const invalido = nome.trim() === "" || (tipo === "fixo" && baseId == null) || qtdNum <= 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      width={560}
      title={editing ? "Editar item de custo" : "Novo item de custo"}
      actions={
        <>
          <Button variant="bordered" onPress={onClose}>
            Cancelar
          </Button>
          <Button
            isDisabled={invalido}
            isLoading={saving}
            onPress={() => onSave({ nome: nome.trim(), tipo, baseId, unidade, lado, qtd: qtdNum })}
          >
            {editing ? "Salvar" : "Adicionar"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Contexto: o lado já está decidido, e o item vale para o COMPONENTE
            inteiro — não só para a opção em que o usuário clicou. */}
        <div className="rounded-lg border border-neutral-gray-4 bg-neutral-gray-2 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "rounded px-1.5 py-px text-[10px] font-bold uppercase tracking-wide",
                lado === "padrao"
                  ? "bg-functional-success-light text-functional-success"
                  : "bg-[#fff7ed] text-[#c2410c]"
              )}
            >
              {lado === "padrao" ? "Padrão · crédito" : "Upgrade · débito"}
            </span>
            <span className="text-xs font-semibold text-neutral-gray-9">
              {ambNome} · {compNome}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-neutral-gray-7">
            {lado === "padrao" ? (
              <>Soma ao crédito do material padrão de {compNome}.</>
            ) : (
              <>
                Soma ao débito de <strong>todas as {nOpcoes} opções</strong> de {compNome} — não só
                da linha clicada.
              </>
            )}{" "}
            Não é oferecido ao cliente na personalização.
          </p>
        </div>

        <Input label="Nome" value={nome} onValueChange={setNome} placeholder="Soleira, Rodapé…" />

        <div>
          <p className="mb-1.5 text-xs font-semibold text-neutral-gray-9">Preço unitário</p>
          <div className="flex gap-2">
            <RadioCard
              selected={tipo === "espelho"}
              title="Espelha a opção"
              desc={
                lado === "padrao"
                  ? "Usa o preço do material padrão — ex.: soleira do mesmo piso."
                  : "Usa o preço da opção escolhida — ex.: soleira do mesmo porcelanato."
              }
              onSelect={() => setTipo("espelho")}
            />
            <RadioCard
              selected={tipo === "fixo"}
              title="Material fixo"
              desc="Sempre o mesmo material do catálogo, em todas as opções."
              onSelect={() => setTipo("fixo")}
            />
          </div>
        </div>

        {tipo === "fixo" && (
          <Select
            label="Material"
            value={baseId != null ? String(baseId) : ""}
            onValueChange={(v) => setBaseId(Number(v) || null)}
            options={materiais.map((m) => ({
              value: String(m.id),
              label: `${m.nome} · ${m.fabricante}`,
            }))}
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Unidade"
            value={unidade}
            onValueChange={(v) => setUnidade(v as Unidade)}
            options={UNIDADES.map((u) => ({ value: u, label: u }))}
          />
          <Input
            label="Quantidade"
            type="number"
            step="0.01"
            value={qtd}
            onValueChange={setQtd}
            description="Só desta tipologia"
          />
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-neutral-gray-2 px-3 py-2">
          <Icon name="info" size={13} className="mt-px shrink-0 text-neutral-gray-7" />
          <p className="text-[11px] leading-snug text-neutral-gray-8">
            Nome, preço unitário e unidade valem para todas as tipologias que usam &ldquo;{ambNome}
            &rdquo;. A quantidade é só desta tipologia.
          </p>
        </div>
      </div>
    </Modal>
  );
}
