"use client";

import React from "react";
import { useRouter } from "next/navigation";

import {
  Button,
  Card,
  Icon,
  Input,
  LoadingState,
  PageHeader,
  StatCard,
  Textarea,
} from "@/components/ui";
import { ACTIVE_PROJECT_ID } from "@/shared/constants/project";
import { useCreateFillLink } from "@/lib/hooks/useFillLinks";
import { useProject, useUpdateProject } from "@/lib/hooks/useProjects";
import { useTipologias } from "@/lib/hooks/useTipologias";
import { useSelection } from "@/lib/store/selection";
import type { FillLink, Tipologia } from "@/shared/types/domain";

/** Itens preenchíveis (padrão + upgrades por componente). */
function itemCount(tip: Tipologia): number {
  return tip.ambientes.reduce(
    (a, amb) => a + amb.componentes.reduce((c, comp) => c + comp.upgrades.length + 1, 0),
    0
  );
}

function todayBR(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// Tela de envio para a construtora (protótipo: SendBuilderScreen). Gera o
// FillLink no store, marca o projeto como "em_preenchimento" e mostra o link
// para copiar / abrir o portal / seguir para a revisão.
export function SendBuilderScreen() {
  const router = useRouter();
  const activeProjectId = useSelection((s) => s.activeProjectId);
  const projectId = activeProjectId ?? ACTIVE_PROJECT_ID;
  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: tipologias = [] } = useTipologias();
  const createLink = useCreateFillLink();
  const updateProject = useUpdateProject();

  const [emails, setEmails] = React.useState("");
  const [prazo, setPrazo] = React.useState("16/06/2026");
  const [msg, setMsg] = React.useState("");
  const [link, setLink] = React.useState<FillLink | null>(null);
  const [linkCopied, setLinkCopied] = React.useState(false);
  const [draftSaved, setDraftSaved] = React.useState(false);
  const initialized = React.useRef(false);
  const copyTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Preenche os padrões quando o projeto carrega (uma única vez).
  React.useEffect(() => {
    if (!project || initialized.current) return;
    initialized.current = true;
    setEmails(project.emailConstrutora ?? "");
    setMsg(
      `Prezados, segue o link para preenchimento dos custos de materiais e mão de obra do empreendimento ${project.nome}.\n\nPor favor, preencher até a data indicada. Qualquer dúvida estou à disposição.`
    );
  }, [project]);
  React.useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
      if (draftTimer.current) clearTimeout(draftTimer.current);
    },
    []
  );

  const totalItems = tipologias.reduce((total, tip) => total + itemCount(tip), 0);
  const uniqueMaterials = React.useMemo(() => {
    const ids = new Set<string>();
    for (const tip of tipologias) {
      for (const amb of tip.ambientes) {
        for (const comp of amb.componentes) {
          if (comp.padrao) ids.add(comp.padrao);
          for (const u of comp.upgrades) ids.add(u);
        }
      }
    }
    return ids.size;
  }, [tipologias]);

  const linkUrl = link ? `${window.location.origin}/portal/${link.token}` : "";

  const saveDraft = () => {
    updateProject.mutate(
      { id: projectId, patch: { emailConstrutora: emails, prazo: prazo || null } },
      {
        onSuccess: () => {
          setDraftSaved(true);
          if (draftTimer.current) clearTimeout(draftTimer.current);
          draftTimer.current = setTimeout(() => setDraftSaved(false), 2500);
        },
      }
    );
  };

  const send = () => {
    createLink.mutate(
      {
        tipologiaIds: tipologias.map((t) => t.id),
        campos: { mat: true, mo: true, comment: true },
        prazo: prazo.trim() === "" ? null : prazo.trim(),
        senha: null,
      },
      {
        onSuccess: (created) => {
          setLink(created);
          updateProject.mutate({
            id: projectId,
            patch: {
              status: "em_preenchimento",
              enviadoEm: todayBR(),
              prazo: prazo.trim() === "" ? null : prazo.trim(),
              emailConstrutora: emails,
            },
          });
        },
      }
    );
  };

  const copy = () => {
    void navigator.clipboard.writeText(linkUrl);
    setLinkCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setLinkCopied(false), 2000);
  };

  // ── Estado enviado ──
  if (link) {
    return (
      <div className="mx-auto max-w-[800px]">
        <div className="px-6 py-12 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-functional-success-light">
            <Icon name="check" size={32} className="text-functional-success" />
          </div>
          <h2 className="mb-2 text-[22px] font-bold text-neutral-gray-11">
            Link enviado para a {project?.construtora ?? "construtora"}!
          </h2>
          <p className="mb-8 text-sm text-neutral-gray-7">
            A construtora foi notificada por e-mail.
            <br />
            Prazo de retorno:{" "}
            <strong className="text-neutral-gray-11">{link.prazo ?? "—"}</strong>
          </p>
          <Card className="mx-auto mb-6 max-w-[480px] text-left">
            <p className="mb-2 text-xs text-neutral-gray-7">Link de preenchimento</p>
            <div className="flex items-center gap-2 rounded-lg bg-neutral-gray-2 px-3 py-2.5">
              <code className="flex-1 break-all text-xs text-neutral-gray-10">{linkUrl}</code>
              <Button variant="bordered" size="sm" icon="copy" onPress={copy}>
                {linkCopied ? "Copiado!" : "Copiar"}
              </Button>
            </div>
          </Card>
          <div className="flex justify-center gap-3">
            <Button variant="bordered" onPress={() => setLink(null)}>
              ← Voltar
            </Button>
            <Button variant="teal" icon="link" onPress={() => router.push(`/portal/${link.token}`)}>
              Ver portal da construtora
            </Button>
            <Button onPress={() => router.push("/revisao-custos")}>
              Ir para revisão de custos →
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (projectLoading) return <LoadingState label="Carregando…" />;

  return (
    <div className="mx-auto max-w-[800px]">
      <PageHeader
        breadcrumb={[
          { label: "Empreendimentos", href: "/dashboard" },
          { label: project?.nome ?? "Projeto" },
          { label: "Envio para construtora" },
        ]}
        title="Enviar para a construtora"
        subtitle={`Gere o link de preenchimento e notifique a ${project?.construtora ?? "construtora"}`}
        action={
          <Button variant="bordered" onPress={() => router.push("/catalogo")}>
            ← Catálogo de materiais
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-3 gap-4">
        <StatCard label="Tipologias configuradas" value={tipologias.length} />
        <StatCard label="Materiais únicos" value={uniqueMaterials} />
        <StatCard label="Itens para preencher" value={totalItems} accent />
      </div>

      <Card className="mb-5">
        <h3 className="mb-3 text-sm font-bold text-neutral-gray-11">Resumo por tipologia</h3>
        {tipologias.map((tip) => (
          <div
            key={tip.id}
            className="flex items-center justify-between border-b border-neutral-gray-4 py-2.5"
          >
            <div>
              <span className="text-[13px] font-semibold text-neutral-gray-11">{tip.nome}</span>
              <span className="ml-2 text-[11px] text-neutral-gray-7">
                {tip.ambientes.length} ambientes
              </span>
            </div>
            <span className="text-[13px] font-semibold text-primary-7">{itemCount(tip)} itens</span>
          </div>
        ))}
      </Card>

      <Card>
        <h3 className="mb-4 text-sm font-bold text-neutral-gray-11">Configuração do envio</h3>
        <div className="grid gap-3">
          <Input
            label="E-mail(s) da construtora"
            value={emails}
            onValueChange={setEmails}
          />
          <Input
            label="Prazo de retorno"
            value={prazo}
            onValueChange={setPrazo}
            placeholder="DD/MM/AAAA"
          />
          <Textarea
            label="Mensagem para a construtora (opcional)"
            value={msg}
            onValueChange={setMsg}
            minRows={4}
          />
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          {draftSaved && (
            <span className="flex items-center gap-1 text-xs text-functional-success">
              <Icon name="check" size={13} /> Rascunho salvo
            </span>
          )}
          <Button variant="bordered" onPress={saveDraft} isLoading={updateProject.isPending}>
            Salvar rascunho
          </Button>
          <Button icon="send" onPress={send} isLoading={createLink.isPending}>
            Enviar link para a construtora
          </Button>
        </div>
      </Card>
    </div>
  );
}
