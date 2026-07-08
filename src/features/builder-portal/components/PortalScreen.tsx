"use client";

import React from "react";
import { useRouter } from "next/navigation";

import { Button, EmptyState, Icon, ProgressBar } from "@/components/ui";
import { getMaterial } from "@/lib/data/entities";
import { usePortalData, useSubmitPortalFills } from "@/lib/hooks/usePortalFills";
import { cn } from "@/lib/utils";
import type { PortalData } from "@/shared/types/api";
import type { Material, PortalFill, Tipologia } from "@/shared/types/domain";

type Fills = Record<string, PortalFill>;

/** Materiais (sem kits) referenciados pela tipologia: padrão + upgrades. */
function tipMateriais(tip: Tipologia, materiais: readonly Material[]): Material[] {
  const ids = new Set<string>();
  for (const amb of tip.ambientes) {
    for (const comp of amb.componentes) {
      if (comp.padrao) ids.add(comp.padrao);
      for (const u of comp.upgrades) ids.add(u);
    }
  }
  return Array.from(ids)
    .map((id) => getMaterial(materiais, id))
    .filter((m): m is Material => m !== undefined);
}

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

// Tela 9 — Portal do terceiro (protótipo: BuilderPortalScreen), acessada por
// link tokenizado, sem shell nem login. O escopo (tipologias/campos/prazo) e
// a senha são resolvidos NO SERVIDOR via /api/portal/[token] (Fase 10).
export function PortalScreen({ token }: { token: string }) {
  const router = useRouter();
  // senha validada (vai na query do GET); null enquanto o gate não liberou.
  const [senha, setSenha] = React.useState<string | null>(null);
  const [senhaInput, setSenhaInput] = React.useState("");
  const [senhaError, setSenhaError] = React.useState(false);
  const { data, isLoading, error } = usePortalData(token, senha);

  const [activeTipId, setActiveTipId] = React.useState<string | null>(null);
  const [costs, setCosts] = React.useState<Fills | null>(null);
  const [submitted, setSubmitted] = React.useState(false);
  const [openComment, setOpenComment] = React.useState<string | null>(null);
  const submitFills = useSubmitPortalFills(token, senha);

  // Senha errada: o servidor rejeita o GET — volta ao gate com o aviso.
  React.useEffect(() => {
    if (error && senha !== null) {
      setSenha(null);
      setSenhaError(true);
    }
  }, [error, senha]);

  // Inicializa o rascunho quando o payload liberado chega: fills já enviados
  // sobrepõem os custos do catálogo.
  React.useEffect(() => {
    if (costs !== null || !data || data.protegido) return;
    const init: Fills = {};
    for (const tip of data.tipologias) {
      for (const m of tipMateriais(tip, data.materiais)) {
        init[m.id] = data.fills[m.id] ?? {
          mat: m.custoMat > 0 ? String(m.custoMat) : "",
          mo: m.custoMO > 0 ? String(m.custoMO) : "",
          comment: "",
        };
      }
    }
    setCosts(init);
  }, [costs, data]);

  if (isLoading) return null;
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
      setCosts={setCosts}
      activeTipId={activeTipId}
      setActiveTipId={setActiveTipId}
      openComment={openComment}
      setOpenComment={setOpenComment}
      submitted={submitted}
      setSubmitted={setSubmitted}
      isSubmitting={submitFills.isPending}
      onSubmit={(fills) => submitFills.mutate(fills, { onSuccess: () => setSubmitted(true) })}
      onBackToPlatform={() => router.push("/revisao-custos")}
    />
  );
}

function PortalContent({
  data,
  costs,
  setCosts,
  activeTipId,
  setActiveTipId,
  openComment,
  setOpenComment,
  submitted,
  setSubmitted,
  isSubmitting,
  onSubmit,
  onBackToPlatform,
}: {
  data: PortalData;
  costs: Fills | null;
  setCosts: React.Dispatch<React.SetStateAction<Fills | null>>;
  activeTipId: string | null;
  setActiveTipId: (id: string) => void;
  openComment: string | null;
  setOpenComment: (id: string | null) => void;
  submitted: boolean;
  setSubmitted: (v: boolean) => void;
  isSubmitting: boolean;
  onSubmit: (fills: Fills) => void;
  onBackToPlatform: () => void;
}) {
  const { campos, tipologias: scopeTips, materiais } = data;
  const scopeMats = React.useMemo(() => {
    const byId = new Map<string, Material>();
    for (const tip of scopeTips) {
      for (const m of tipMateriais(tip, materiais)) byId.set(m.id, m);
    }
    return Array.from(byId.values());
  }, [scopeTips, materiais]);

  const tip = scopeTips.find((t) => t.id === activeTipId) ?? scopeTips[0] ?? null;
  if (!tip || costs === null) return null;

  const isFilled = (c: PortalFill | undefined): boolean => {
    if (!c) return false;
    const v = campos.mat ? c.mat : campos.mo ? c.mo : "";
    return v !== "" && v !== "0";
  };
  const setCostField = (matId: string, fld: keyof PortalFill, val: string) =>
    setCosts((p) => {
      const prev = p ?? {};
      const cur = prev[matId] ?? { mat: "", mo: "", comment: "" };
      return { ...prev, [matId]: { ...cur, [fld]: val } };
    });

  const allFilled = scopeMats.filter((m) => isFilled(costs[m.id])).length;
  const tipMats = tipMateriais(tip, materiais);
  const filled = tipMats.filter((m) => isFilled(costs[m.id])).length;
  const canSubmit = allFilled >= scopeMats.length * 0.5;

  // ── Estado de sucesso ──
  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-standard">
        <div className="max-w-[480px] text-center">
          <div className="mx-auto mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-functional-success-light">
            <Icon name="check" size={36} className="text-functional-success" />
          </div>
          <h2 className="mb-3 text-[22px] font-bold text-neutral-gray-11">
            Preenchimento enviado!
          </h2>
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
                {allFilled}/{scopeMats.length} itens preenchidos
              </p>
              <div className="w-40">
                <ProgressBar value={allFilled} max={scopeMats.length} />
              </div>
            </div>
            <Button
              onPress={() => onSubmit(costs)}
              isDisabled={!canSubmit}
              isLoading={isSubmitting}
            >
              Enviar preenchimento
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1100px] p-6">
        {/* Abas de tipologia (só as incluídas no link) */}
        <div className="mb-5 flex border-b-2 border-neutral-gray-4">
          {scopeTips.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTipId(t.id)}
              className={cn(
                "-mb-0.5 border-b-2 px-5 py-2.5 text-[13px]",
                t.id === tip.id
                  ? "border-primary-7 font-bold text-primary-7"
                  : "border-transparent text-neutral-gray-8"
              )}
            >
              {t.nome}
            </button>
          ))}
        </div>

        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs text-neutral-gray-7">
            {filled} de {tipMats.length} itens preenchidos nesta tipologia
          </span>
          <div className="max-w-[200px] flex-1">
            <ProgressBar value={filled} max={tipMats.length} />
          </div>
        </div>

        {tip.ambientes.map((amb) => {
          const ambMats = tipMateriais({ ...tip, ambientes: [amb] }, materiais);
          if (ambMats.length === 0) return null;
          return (
            <div
              key={amb.id}
              className="mb-4 overflow-hidden rounded-lg border border-neutral-gray-4 bg-white"
            >
              <div className="border-b border-neutral-gray-4 bg-neutral-gray-2 px-5 py-3">
                <span className="text-[13px] font-bold text-neutral-gray-11">{amb.nome}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-gray-4">
                      {[
                        "Especificação",
                        "Fabricante",
                        ...(campos.mat ? ["Custo material (R$)"] : []),
                        ...(campos.mo ? ["Custo mão de obra (R$)"] : []),
                        ...(campos.comment ? ["Comentário"] : []),
                        "",
                      ].map((h, i) => (
                        <th
                          key={i}
                          className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-neutral-gray-7"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ambMats.map((mat, mi) => {
                      const c = costs[mat.id] ?? { mat: "", mo: "", comment: "" };
                      const rowFilled = isFilled(c);
                      return (
                        <tr
                          key={mat.id}
                          className={cn(
                            "transition-colors",
                            mi < ambMats.length - 1 && "border-b border-neutral-gray-4",
                            rowFilled ? "bg-[#f0fdf4]" : "bg-white"
                          )}
                        >
                          <td className="px-4 py-2.5">
                            <p className="text-[13px] font-semibold text-neutral-gray-11">
                              {mat.nome}
                            </p>
                            <code className="text-[10px] text-neutral-gray-6">{mat.codigo}</code>
                          </td>
                          <td className="px-4 py-2.5 text-[13px] text-neutral-gray-7">
                            {mat.fabricante}
                          </td>
                          {campos.mat && (
                            <td className="w-40 px-4 py-2">
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-neutral-gray-7">
                                  R$
                                </span>
                                <input
                                  type="number"
                                  value={c.mat}
                                  onChange={(e) => setCostField(mat.id, "mat", e.target.value)}
                                  placeholder="0,00"
                                  className={cn(
                                    "h-9 w-full rounded-lg border py-0 pl-7 pr-2 text-[13px] outline-none focus:border-primary-7",
                                    rowFilled
                                      ? "border-functional-success"
                                      : "border-neutral-gray-5"
                                  )}
                                />
                              </div>
                            </td>
                          )}
                          {campos.mo && (
                            <td className="w-40 px-4 py-2">
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-neutral-gray-7">
                                  R$
                                </span>
                                <input
                                  type="number"
                                  value={c.mo}
                                  onChange={(e) => setCostField(mat.id, "mo", e.target.value)}
                                  placeholder="0,00"
                                  className="h-9 w-full rounded-lg border border-neutral-gray-5 py-0 pl-7 pr-2 text-[13px] outline-none focus:border-primary-7"
                                />
                              </div>
                            </td>
                          )}
                          {campos.comment && (
                            <td className="w-[180px] px-4 py-2">
                              {openComment === mat.id ? (
                                <input
                                  autoFocus
                                  value={c.comment}
                                  onChange={(e) =>
                                    setCostField(mat.id, "comment", e.target.value)
                                  }
                                  placeholder="Adicionar comentário..."
                                  onBlur={() => setOpenComment(null)}
                                  className="h-9 w-full rounded-lg border border-neutral-gray-5 px-2 text-xs outline-none focus:border-primary-7"
                                />
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setOpenComment(mat.id)}
                                  className={cn(
                                    "flex items-center gap-1 text-xs",
                                    c.comment
                                      ? "text-functional-warning"
                                      : "text-neutral-gray-6"
                                  )}
                                >
                                  <Icon name="chat" size={14} />
                                  {c.comment ? "Ver comentário" : "Adicionar"}
                                </button>
                              )}
                            </td>
                          )}
                          <td className="px-4 py-2">
                            {rowFilled && (
                              <Icon name="check" size={16} className="text-functional-success" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        <div className="mt-2 flex justify-end gap-3">
          {/* router.push (SPA) — navegação para a plataforma autenticada. */}
          <Button variant="bordered" onPress={onBackToPlatform}>
            ← Voltar à plataforma
          </Button>
          <Button
            onPress={() => onSubmit(costs)}
            isDisabled={!canSubmit}
            isLoading={isSubmitting}
          >
            Enviar preenchimento
          </Button>
        </div>
      </div>
    </div>
  );
}
