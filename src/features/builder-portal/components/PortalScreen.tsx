"use client";

import React from "react";

import { Button, EmptyState, Icon, LoadingState, ProgressBar } from "@/components/ui";
import { usePortalData, useSubmitPortalFills } from "@/lib/hooks/usePortalFills";
import { cn } from "@/lib/utils";
import type { PortalData } from "@/shared/types/api";
import type { PortalFill } from "@/shared/types/domain";

import { PortalCostList, isFillFilled } from "./PortalCostList";

type Fills = Record<string, PortalFill>;

/** Marca da Nuki no header do portal (sem asset de logo no repo — wordmark). */
function BrandBlock() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-4 font-bold text-white">
        N
      </div>
      <span className="text-sm font-bold text-neutral-gray-10">Nuki</span>
    </div>
  );
}

// Tela 9 — Portal do terceiro (construtora), acessada por link tokenizado, sem
// shell nem login. O escopo (tipologias/campos/prazo) e a senha são resolvidos
// NO SERVIDOR via /api/portal/[token]; a grade espelha a aba "Custos base".
export function PortalScreen({ token }: { token: string }) {
  // senha validada (vai na query do GET); null enquanto o gate não liberou.
  const [senha, setSenha] = React.useState<string | null>(null);
  const [senhaInput, setSenhaInput] = React.useState("");
  const [senhaError, setSenhaError] = React.useState(false);
  const { data, isLoading, error } = usePortalData(token, senha);

  const [costs, setCosts] = React.useState<Fills | null>(null);
  const [submitted, setSubmitted] = React.useState(false);
  const [openComment, setOpenComment] = React.useState<string | null>(null);
  const [nome, setNome] = React.useState("");
  const submitFills = useSubmitPortalFills(token, senha);

  // Senha errada: o servidor rejeita o GET — volta ao gate com o aviso.
  React.useEffect(() => {
    if (error && senha !== null) {
      setSenha(null);
      setSenhaError(true);
    }
  }, [error, senha]);

  // Inicializa o rascunho quando o payload liberado chega: fills já enviados
  // sobrepõem o custo base já preenchido NESTE empreendimento.
  React.useEffect(() => {
    if (costs !== null || !data || data.protegido) return;
    const init: Fills = {};
    for (const row of data.custoRows) {
      const key = String(row.baseId);
      init[key] = data.fills[key] ?? {
        mat: row.custoMat > 0 ? String(row.custoMat) : "",
        mo: row.custoMO > 0 ? String(row.custoMO) : "",
        comment: "",
      };
    }
    setCosts(init);
  }, [costs, data]);

  const setCostField = (baseId: string, fld: keyof PortalFill, val: string) =>
    setCosts((p) => {
      const prev = p ?? {};
      const cur = prev[baseId] ?? { mat: "", mo: "", comment: "" };
      return { ...prev, [baseId]: { ...cur, [fld]: val } };
    });

  if (isLoading)
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <LoadingState label="Abrindo o portal…" />
      </div>
    );
  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-lg border border-neutral-gray-5 bg-white">
          <EmptyState
            icon="link"
            title="Link inválido ou expirado"
            subtitle="Confira o endereço com quem enviou o link ou solicite um novo."
          />
        </div>
      </div>
    );
  }

  // ── Gate de senha (validação no servidor) ──
  if (data.protegido) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-standard px-6">
        <div className="w-full max-w-sm rounded-xl border border-neutral-gray-4 bg-white p-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary-1">
            <Icon name="lock" size={26} className="text-primary-7" />
          </div>
          <h1 className="mb-2 text-lg font-bold text-neutral-gray-11">Link protegido por senha</h1>
          <p className="mb-6 text-[13px] text-neutral-gray-7">
            Digite a senha fornecida pela incorporadora para acessar o preenchimento.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (senhaInput === "") return;
              setSenhaError(false);
              setSenha(senhaInput);
            }}
          >
            <input
              type="password"
              autoFocus
              value={senhaInput}
              onChange={(e) => {
                setSenhaInput(e.target.value);
                setSenhaError(false);
              }}
              placeholder="Senha"
              className={cn(
                "mb-2 h-11 w-full rounded-lg border px-3.5 text-sm outline-none focus:border-primary-7",
                senhaError ? "border-functional-error" : "border-neutral-gray-5"
              )}
            />
            {senhaError && (
              <p className="mb-2 text-left text-xs text-functional-error">Senha incorreta.</p>
            )}
            <Button type="submit" fullWidth>
              Acessar
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <PortalContent
      data={data}
      costs={costs}
      setCostField={setCostField}
      openComment={openComment}
      setOpenComment={setOpenComment}
      nome={nome}
      setNome={setNome}
      submitted={submitted}
      setSubmitted={setSubmitted}
      isSubmitting={submitFills.isPending}
      onSubmit={(fills) =>
        submitFills.mutate({ fills, nome: nome.trim() }, { onSuccess: () => setSubmitted(true) })
      }
    />
  );
}

function PortalContent({
  data,
  costs,
  setCostField,
  openComment,
  setOpenComment,
  nome,
  setNome,
  submitted,
  setSubmitted,
  isSubmitting,
  onSubmit,
}: {
  data: PortalData;
  costs: Fills | null;
  setCostField: (baseId: string, fld: keyof PortalFill, val: string) => void;
  openComment: string | null;
  setOpenComment: (id: string | null) => void;
  nome: string;
  setNome: (v: string) => void;
  submitted: boolean;
  setSubmitted: (v: boolean) => void;
  isSubmitting: boolean;
  onSubmit: (fills: Fills) => void;
}) {
  const rows = data.custoRows;
  if (costs === null) return null;

  const allFilled = rows.filter((r) => isFillFilled(costs[String(r.baseId)], data.campos)).length;
  const hasNome = nome.trim() !== "";
  // Cotação parcial é esperada: basta ter nome e ao menos um item preenchido.
  const canSubmit = hasNome && allFilled > 0;

  // ── Estado de sucesso ──
  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-standard">
        <div className="max-w-[480px] text-center">
          <div className="mx-auto mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-functional-success-light">
            <Icon name="check" size={36} className="text-functional-success" />
          </div>
          <h2 className="mb-3 text-[22px] font-bold text-neutral-gray-11">Preenchimento enviado!</h2>
          <p className="mb-6 text-sm text-neutral-gray-7">
            A incorporadora foi notificada. Você pode retornar a este link para editar os valores
            ou adicionar comentários.
          </p>
          <Button variant="bordered" onPress={() => setSubmitted(false)}>
            ← Voltar ao preenchimento
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-standard">
      {/* Header próprio do portal */}
      <div className="sticky top-0 z-10 border-b border-neutral-gray-3 bg-white">
        <div className="mx-auto flex h-16 max-w-[1100px] items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <BrandBlock />
            <div className="border-l border-neutral-gray-4 pl-4">
              <p className="text-sm font-bold text-neutral-gray-11">{data.projectNome}</p>
              <p className="text-[11px] text-neutral-gray-7">
                Preenchimento de custos{data.prazo ? ` · Prazo: ${data.prazo}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-bold text-neutral-gray-11">
                {allFilled}/{rows.length} itens preenchidos
              </p>
              <div className="w-40">
                <ProgressBar value={allFilled} max={rows.length} />
              </div>
            </div>
            <Button onPress={() => onSubmit(costs)} isDisabled={!canSubmit} isLoading={isSubmitting}>
              Enviar preenchimento
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1100px] p-6">
        {/* Identificação de quem está preenchendo (assina os comentários) */}
        <div
          className={cn(
            "mb-5 flex flex-col gap-1.5 rounded-xl border px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4",
            hasNome ? "border-neutral-gray-4 bg-white" : "border-primary-7/40 bg-primary-1"
          )}
        >
          <div className="flex items-center gap-2">
            <Icon name="person" size={16} className="text-primary-7" />
            <label htmlFor="portal-nome" className="text-[13px] font-semibold text-neutral-gray-11">
              Seu nome <span className="text-functional-error">*</span>
            </label>
          </div>
          <input
            id="portal-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Marcos Lima · Construtora Alfa"
            className="h-10 flex-1 rounded-lg border border-neutral-gray-5 px-3 text-[13px] outline-none focus:border-primary-7"
          />
          <span className="text-[11px] text-neutral-gray-6">
            Usado para identificar suas respostas e comentários para a incorporadora.
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-lg border border-neutral-gray-4 bg-white">
            <EmptyState
              icon="layers"
              title="Nenhum item para preencher neste link"
              subtitle="As tipologias incluídas neste link ainda não têm materiais a precificar."
            />
          </div>
        ) : (
          <>
            <PortalCostList
              rows={rows}
              campos={data.campos}
              categorias={data.categorias}
              costs={costs}
              setCostField={setCostField}
              openComment={openComment}
              setOpenComment={setOpenComment}
            />

            <div className="mt-4 flex justify-end">
              <Button
                onPress={() => onSubmit(costs)}
                isDisabled={!canSubmit}
                isLoading={isSubmitting}
              >
                Enviar preenchimento
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
