"use client";

import React from "react";
import { useRouter } from "next/navigation";

import { Button, Icon, Modal } from "@/components/ui";
import { useCreateFillLink } from "@/lib/hooks/useFillLinks";
import { useTipologias } from "@/lib/hooks/useTipologias";
import { cn } from "@/lib/utils";
import { useActiveProjectId } from "@/lib/hooks/useActiveProject";
import type { FillLink, FillLinkCampos, Tipologia } from "@/shared/types/domain";

/** Itens preenchíveis de uma tipologia (padrão + upgrades por componente). */
function itemCount(tip: Tipologia): number {
  return tip.ambientes.reduce(
    (a, amb) =>
      a +
      amb.componentes.reduce(
        (c, comp) => c + comp.options.filter((o) => !o.isDefault).length + 1,
        0
      ),
    0
  );
}

const CAMPOS: { key: keyof FillLinkCampos; label: string }[] = [
  { key: "mat", label: "Custo de material" },
  { key: "mo", label: "Custo de mão de obra" },
  { key: "comment", label: "Comentários" },
];

// Modal "Gerar link de preenchimento" (construtor-shared do protótipo), em
// 2 passos: config (tipologias, campos, prazo, senha) → link gerado. O link
// é persistido no store e o token abre /portal/[token].
export function LinkFillModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const projectId = useActiveProjectId();
  const { data: tipologias = [] } = useTipologias(projectId);
  const createLink = useCreateFillLink(projectId ?? 0);

  const [link, setLink] = React.useState<FillLink | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [showSenha, setShowSenha] = React.useState(false);
  const [tips, setTips] = React.useState<Record<string, boolean>>({});
  const [campos, setCampos] = React.useState<FillLinkCampos>({ mat: true, mo: true, comment: true });
  const [useSenha, setUseSenha] = React.useState(false);
  const [senha, setSenha] = React.useState("");
  const [prazo, setPrazo] = React.useState("20/06/2026");
  const copyTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Volta ao passo 1 (com todas as tipologias marcadas) a cada abertura.
  React.useEffect(() => {
    if (open) {
      setLink(null);
      setCopied(false);
      setShowSenha(false);
      setTips(Object.fromEntries(tipologias.map((t) => [t.id, true])));
      setCampos({ mat: true, mo: true, comment: true });
      setUseSenha(false);
      setSenha("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  React.useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    []
  );

  const selectedIds = tipologias.filter((t) => tips[t.id]).map((t) => t.id);
  const canGenerate =
    selectedIds.length > 0 && (campos.mat || campos.mo) && (!useSenha || senha.trim() !== "");
  const linkUrl = link ? `${window.location.origin}/portal/${link.token}` : "";

  const generate = () => {
    createLink.mutate(
      {
        tipologiaIds: selectedIds,
        campos,
        prazo: prazo.trim() === "" ? null : prazo.trim(),
        senha: useSenha ? senha : null,
      },
      { onSuccess: setLink }
    );
  };

  const copy = () => {
    void navigator.clipboard.writeText(linkUrl);
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={link ? "Link gerado com sucesso" : "Gerar link de preenchimento"}
      width={640}
    >
      {!link ? (
        <div className="flex flex-col gap-[22px]">
          {/* Tipologias */}
          <div>
            <p className="mb-2.5 text-[13px] font-bold text-neutral-gray-11">Tipologias a incluir</p>
            <div className="flex flex-col gap-1.5">
              {tipologias.map((t) => {
                const isSel = !!tips[t.id];
                return (
                  <label
                    key={t.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3.5 py-2.5 transition-all",
                      isSel ? "border-primary-7 bg-primary-1" : "border-neutral-gray-4 bg-white"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={(e) => setTips((p) => ({ ...p, [t.id]: e.target.checked }))}
                      className="h-[15px] w-[15px] shrink-0 accent-primary-7"
                    />
                    <div className="flex-1">
                      <span className="text-[13px] font-semibold text-neutral-gray-11">{t.nome}</span>
                      <span className="ml-2 text-[11px] text-neutral-gray-6">{t.unidades} unidades</span>
                    </div>
                    <span
                      className={cn(
                        "text-[11px] font-semibold",
                        isSel ? "text-primary-7" : "text-neutral-gray-5"
                      )}
                    >
                      {itemCount(t)} itens
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Campos */}
          <div>
            <p className="mb-2.5 text-[13px] font-bold text-neutral-gray-11">Campos para preencher</p>
            <div className="flex flex-wrap gap-2">
              {CAMPOS.map((f) => {
                const isSel = campos[f.key];
                return (
                  <label
                    key={f.key}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 transition-all",
                      isSel ? "border-primary-7 bg-primary-1" : "border-neutral-gray-4 bg-white"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={(e) => setCampos((p) => ({ ...p, [f.key]: e.target.checked }))}
                      className="accent-primary-7"
                    />
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        isSel ? "text-primary-7" : "text-neutral-gray-8"
                      )}
                    >
                      {f.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Prazo */}
          <div>
            <p className="mb-2 text-[13px] font-bold text-neutral-gray-11">
              Prazo de retorno{" "}
              <span className="text-xs font-normal text-neutral-gray-6">(opcional)</span>
            </p>
            <input
              type="text"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
              placeholder="DD/MM/AAAA"
              className="h-10 w-40 rounded-lg border border-neutral-gray-5 px-3 text-[13px] outline-none focus:border-primary-7"
            />
          </div>

          {/* Senha */}
          <div
            className={cn(
              "rounded-lg border px-4 py-3.5 transition-all",
              useSenha ? "border-primary-7 bg-primary-1" : "border-neutral-gray-4 bg-neutral-gray-2"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon
                  name="lock"
                  size={15}
                  className={useSenha ? "text-primary-7" : "text-neutral-gray-7"}
                />
                <span
                  className={cn(
                    "text-[13px] font-semibold",
                    useSenha ? "text-primary-7" : "text-neutral-gray-9"
                  )}
                >
                  Proteger com senha
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={useSenha}
                aria-label="Proteger com senha"
                onClick={() => {
                  setUseSenha((p) => !p);
                  setSenha("");
                }}
                className={cn(
                  "relative h-[22px] w-10 shrink-0 rounded-full transition-colors",
                  useSenha ? "bg-primary-7" : "bg-neutral-gray-5"
                )}
              >
                <span
                  className={cn(
                    "absolute top-[3px] h-4 w-4 rounded-full bg-white transition-all",
                    useSenha ? "left-[21px]" : "left-[3px]"
                  )}
                />
              </button>
            </div>
            {useSenha && (
              <div className="mt-3">
                <div className="relative">
                  <input
                    type={showSenha ? "text" : "password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Crie uma senha para este link..."
                    className="h-10 w-full rounded-lg border border-primary-7 bg-white py-0 pl-3 pr-10 text-[13px] outline-none"
                  />
                  <button
                    type="button"
                    aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}
                    onClick={() => setShowSenha((p) => !p)}
                    className="absolute right-2.5 top-1/2 flex -translate-y-1/2 text-neutral-gray-6"
                  >
                    <Icon name={showSenha ? "eye_off" : "eye"} size={16} />
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-primary-7">
                  Compartilhe a senha separadamente com o destinatário.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="bordered" onPress={onClose}>
              Cancelar
            </Button>
            <Button
              icon="link"
              onPress={generate}
              isDisabled={!canGenerate}
              isLoading={createLink.isPending}
            >
              Gerar link →
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3 rounded-lg border border-functional-success/30 bg-functional-success-light px-4 py-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-functional-success">
              <Icon name="check" size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-functional-success">Link criado com sucesso!</p>
              <p className="text-[11px] text-functional-success/80">
                Gerado em {link.criadoEm.replace(" ", " às ")} · válido por 30 dias
              </p>
            </div>
          </div>

          {/* Link box */}
          <div className="rounded-lg bg-neutral-gray-2 px-4 py-3">
            <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-neutral-gray-7">
              Link de preenchimento
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all font-mono text-[13px] text-neutral-gray-11">
                {linkUrl}
              </code>
              <Button variant="bordered" size="sm" icon="copy" onPress={copy}>
                {copied ? "Copiado!" : "Copiar"}
              </Button>
            </div>
          </div>

          {/* Resumo */}
          <div className="rounded-lg bg-neutral-gray-2 px-4 py-3.5">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-neutral-gray-7">
              Resumo
            </p>
            <div className="flex flex-col gap-[7px]">
              {link.tipologiaIds.map((tid) => {
                const t = tipologias.find((x) => x.id === tid);
                return t ? (
                  <div key={tid} className="flex items-center gap-2 text-[13px] text-neutral-gray-9">
                    <Icon name="check" size={13} className="text-primary-7" /> {t.nome}
                  </div>
                ) : null;
              })}
              <div className="flex items-center gap-2 text-[13px] text-neutral-gray-9">
                <Icon name="check" size={13} className="text-primary-7" />
                Campos:{" "}
                {[
                  link.campos.mat && "custo material",
                  link.campos.mo && "custo MO",
                  link.campos.comment && "comentários",
                ]
                  .filter(Boolean)
                  .join(", ")}
              </div>
              {link.prazo && (
                <div className="flex items-center gap-2 text-[13px] text-neutral-gray-9">
                  <Icon name="check" size={13} className="text-primary-7" /> Prazo: {link.prazo}
                </div>
              )}
              {link.senha && (
                <div className="flex items-center gap-2 text-[13px] text-neutral-gray-9">
                  <Icon name="lock" size={13} className="text-primary-7" /> Protegido por senha
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="bordered" onPress={onClose}>
              Fechar
            </Button>
            <Button
              variant="teal"
              icon="link"
              onPress={() => {
                onClose();
                router.push(`/portal/${link.token}`);
              }}
            >
              Visualizar como terceiro →
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
