"use client";

import React from "react";

import { Button, Icon, Input, MaterialThumb, Modal, Select, Switch } from "@/components/ui";
import { EntityPickerList } from "@/features/catalog/components/EntityPickerList";
import { cn } from "@/lib/utils";
import { UNIDADE_OPTIONS } from "@/shared/constants/unidades";

import type {
  CatalogEntity,
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
  /** Opção (Material id) a que o item se prende; null = todas as opções. */
  materialOptionId: number | null;
  unidade: Unidade;
  lado: CostComponentSide;
  qtd: number;
}

/**
 * Cria/edita um item de custo direto da tabela de orçamento.
 *
 * O LADO não é perguntado: vem da seção da linha em que o usuário clicou
 * (padrão → crédito, personalizado → débito). Por padrão o item é AVULSO (preso
 * à opção clicada) e o preço vem ESPELHADO; dois switches abrem os outros modos.
 */
export function CostItemModal({
  open,
  editing,
  lado,
  optionId,
  compNome,
  ambNome,
  nOpcoes,
  qtdInicial,
  baseInicial,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  /** null = criando. */
  editing: CostComponent | null;
  /** Determinado pela seção da linha — o usuário não escolhe. */
  lado: CostComponentSide;
  /** Opção clicada (alvo do escopo avulso). null quando não há opção específica. */
  optionId: number | null;
  compNome: string;
  ambNome: string;
  /** Quantas opções de upgrade o componente tem (para o aviso de abrangência). */
  nOpcoes: number;
  qtdInicial: number;
  /** Material já gravado em `editing.baseId`, resolvido pelo chamador. */
  baseInicial: Material | null;
  saving: boolean;
  onClose: () => void;
  onSave: (v: CostItemValue) => void;
}) {
  const [nome, setNome] = React.useState("");
  // Switches: escopo (todas as opções) e origem do preço (material do catálogo).
  const [todasOpcoes, setTodasOpcoes] = React.useState(false);
  const [usaCatalogo, setUsaCatalogo] = React.useState(false);
  // Guarda a entidade, não só o id: a lista do picker vem paginada do servidor,
  // então o material escolhido pode não estar em memória na hora de exibi-lo.
  const [baseEntity, setBaseEntity] = React.useState<CatalogEntity | null>(null);
  const [picking, setPicking] = React.useState(false);
  const [unidade, setUnidade] = React.useState<Unidade>("und");
  const [qtd, setQtd] = React.useState("1");

  // Escopo só faz sentido no upgrade (o padrão é um material só).
  const escopoAplicavel = lado === "upgrade";

  // Semeia UMA vez por abertura. `baseInicial` é recalculado a cada render a
  // partir da lista de materiais do BudgetScreen, então um refetch em segundo
  // plano troca a identidade do objeto — sem esta trava o efeito rodaria de
  // novo e jogaria fora o material que o usuário acabou de escolher.
  const seededRef = React.useRef(false);
  React.useEffect(() => {
    if (!open) {
      seededRef.current = false;
      return;
    }
    if (seededRef.current) return;
    seededRef.current = true;
    setNome(editing?.nome ?? "");
    // Ao editar, o escopo vem do item; ao criar, o default é avulso — a menos
    // que não haja opção específica para prender (aí nasce "todas").
    setTodasOpcoes(editing ? editing.materialOptionId == null : optionId == null);
    setUsaCatalogo((editing?.tipo ?? "espelho") === "fixo");
    // `editing` só carrega baseId; o nome para exibir vem de baseInicial, que o
    // BudgetScreen resolve com a lista que ele já tem para os cálculos.
    setBaseEntity(baseInicial ? { ...baseInicial, isKit: false } : null);
    setPicking(false);
    setUnidade(editing?.unidade ?? "und");
    setQtd(String(qtdInicial || 1));
  }, [open, editing, optionId, qtdInicial, baseInicial]);

  const baseId = baseEntity?.id ?? null;

  const pickBase = React.useCallback((e: CatalogEntity) => {
    setBaseEntity(e);
    setPicking(false);
  }, []);

  const qtdNum = parseFloat(qtd.replace(",", ".")) || 0;
  const invalido = nome.trim() === "" || (usaCatalogo && baseId == null) || qtdNum <= 0;

  const submit = () => {
    // Padrão não tem escopo (material único) → sempre "todas" (materialOptionId null).
    const aplicaTodas = !escopoAplicavel || todasOpcoes;
    onSave({
      nome: nome.trim(),
      tipo: usaCatalogo ? "fixo" : "espelho",
      baseId: usaCatalogo ? baseId : null,
      materialOptionId: aplicaTodas ? null : optionId,
      unidade,
      lado,
      qtd: qtdNum,
    });
  };

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
          <Button isDisabled={invalido} isLoading={saving} onPress={submit}>
            {editing ? "Salvar" : "Adicionar"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Contexto: o lado já está decidido pela seção da linha clicada. */}
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
            Peça que entra no custo mas <strong>não é escolhida pelo cliente</strong> — soleira,
            rodapé, reserva técnica.{" "}
            {lado === "padrao"
              ? "Entra no crédito do padrão, aumentando o desconto na troca."
              : "Entra no débito da opção."}
          </p>
        </div>

        <Input
          label="Nome"
          value={nome}
          onValueChange={setNome}
          placeholder="Soleira, Rodapé, Reserva técnica…"
          description="Aparece como sub-linha abaixo do item na tabela"
        />

        {escopoAplicavel && (
          <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-neutral-gray-4 px-3 py-2.5">
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-neutral-gray-9">
                Aplicar a todas as opções do componente
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-neutral-gray-6">
                {todasOpcoes
                  ? `Entra no débito de todas as ${nOpcoes} opções de ${compNome}.`
                  : "Fica só nesta opção — as outras não recebem este item."}
              </span>
            </span>
            <Switch isSelected={todasOpcoes} onValueChange={setTodasOpcoes} />
          </label>
        )}

        <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-neutral-gray-4 px-3 py-2.5">
          <span className="min-w-0">
            <span className="block text-xs font-semibold text-neutral-gray-9">
              Usar material do catálogo
            </span>
            <span className="mt-0.5 block text-[11px] leading-snug text-neutral-gray-6">
              {usaCatalogo
                ? "Preço fixo de um material do catálogo, igual em toda opção. Precisa ter custo preenchido."
                : lado === "padrao"
                  ? "O preço acompanha o material padrão do componente."
                  : "O preço acompanha a opção que o cliente escolher."}
            </span>
          </span>
          <Switch isSelected={usaCatalogo} onValueChange={setUsaCatalogo} />
        </label>

        {usaCatalogo && (
          <div>
            <p className="mb-1.5 text-xs font-semibold text-neutral-gray-9">Material</p>
            {baseEntity && !picking ? (
              <div className="flex items-center gap-3 rounded-lg border border-neutral-gray-4 px-3 py-2.5">
                <MaterialThumb
                  url={baseEntity.isKit ? null : baseEntity.imagem?.url}
                  alt={baseEntity.nome}
                  isKit={baseEntity.isKit}
                  size={36}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-neutral-gray-11">
                    {baseEntity.nome}
                  </p>
                  <p className="mt-px truncate text-[11px] text-neutral-gray-7">
                    {baseEntity.isKit
                      ? `${baseEntity.codigo} · ${baseEntity.itens.length} itens`
                      : `${baseEntity.codigo} · ${baseEntity.fabricante || "sem fabricante"}`}
                  </p>
                </div>
                <Button variant="bordered" size="sm" onPress={() => setPicking(true)}>
                  Trocar
                </Button>
              </div>
            ) : (
              <EntityPickerList
                tipo="single"
                mode="single"
                selectedId={baseId}
                onSelect={pickBase}
                maxHeightClass="max-h-[260px]"
                emptyText="Nenhum material encontrado."
              />
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Unidade de medida"
            value={unidade}
            onValueChange={(v) => setUnidade(v as Unidade)}
            options={UNIDADE_OPTIONS}
          />
          <Input
            label="Quantidade"
            type="number"
            step="0.01"
            value={qtd}
            onValueChange={setQtd}
            description="Já com a reserva técnica embutida"
          />
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-neutral-gray-2 px-3 py-2">
          <Icon name="info" size={13} className="mt-px shrink-0 text-neutral-gray-7" />
          <p className="text-[11px] leading-snug text-neutral-gray-8">
            Este item vale para <strong>todas as tipologias</strong> que usam &ldquo;{ambNome}
            &rdquo; — definição e quantidade são compartilhadas.
          </p>
        </div>
      </div>
    </Modal>
  );
}
