"use client";

import React from "react";

import { Button, Input, Modal, Switch } from "@/components/ui";
import { useCreateProject, useUpdateProject } from "@/lib/hooks/useProjects";
import { useTorres, useUnitGroups, useUpdateTorres } from "@/lib/hooks/useUnitGroups";
import type { Project } from "@/shared/types/domain";

import { TowersEditor, type TowerDraft } from "./TowersEditor";

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-sm font-bold text-neutral-gray-11">{children}</h3>
      {sub && <p className="mt-0.5 text-xs text-neutral-gray-7">{sub}</p>}
    </div>
  );
}

interface EmpreendimentoModalProps {
  open: boolean;
  onClose: () => void;
  /** null = criar; Project = editar. */
  project: Project | null;
  onCreated?: (project: Project) => void;
}

/**
 * Criar/editar empreendimento (substitui a tela /config-base, que só sabia
 * editar o empreendimento âncora e por isso não servia para "Novo").
 */
export function EmpreendimentoModal({
  open,
  onClose,
  project,
  onCreated,
}: EmpreendimentoModalProps) {
  const isEdit = project !== null;

  const { data: torres, isLoading: torresLoading } = useTorres(isEdit ? project.id : null);
  const { data: unitGroups = [] } = useUnitGroups(isEdit ? project.id : null);
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const updateTorres = useUpdateTorres();

  const [nome, setNome] = React.useState("");
  const [usaDebitoCredito, setUsaDebitoCredito] = React.useState(true);
  const [towers, setTowers] = React.useState<TowerDraft[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  // Semeado por [open, project], NÃO pelas guardas "semeia uma vez" da tela
  // antiga: um modal reabre com props diferentes na MESMA montagem, e a guarda
  // travaria os valores do primeiro empreendimento aberto.
  React.useEffect(() => {
    if (!open) return;
    setNome(project?.nome ?? "");
    setUsaDebitoCredito(project?.usaDebitoCredito !== false);
    setTowers([]);
    setError(null);
  }, [open, project]);

  // As torres chegam depois (query própria) — só no modo edição.
  React.useEffect(() => {
    if (!open || !isEdit || !torres) return;
    setTowers(torres.map((t) => ({ id: t.id, nome: t.nome })));
  }, [open, isEdit, torres]);

  const groupCountByTorre = (torreNome: string) =>
    unitGroups.filter((g) => g.torre === torreNome).length;

  const saving = createProject.isPending || updateProject.isPending || updateTorres.isPending;

  const handleSubmit = async () => {
    setError(null);
    try {
      if (project === null) {
        const created = await createProject.mutateAsync({
          nome,
          torres: towers.map((t) => t.nome),
          usaDebitoCredito,
        });
        onCreated?.(created);
      } else {
        const [, savedTorres] = await Promise.all([
          updateProject.mutateAsync({
            id: project.id,
            patch: { nome, usaDebitoCredito },
          }),
          updateTorres.mutateAsync({ projectId: project.id, items: towers }),
        ]);
        // Ressincroniza com os ids reais: torres novas ganham id no servidor —
        // sem isso, salvar de novo recriaria (e apagaria) as mesmas torres,
        // levando junto o vínculo dos grupos de unidades.
        setTowers(savedTorres.map((t) => ({ id: t.id, nome: t.nome })));
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar empreendimento" : "Novo empreendimento"}
      width={560}
      actions={
        <>
          {error && <span className="mr-auto text-xs text-functional-error">{error}</span>}
          <Button variant="bordered" onPress={onClose}>
            Cancelar
          </Button>
          <Button
            onPress={() => void handleSubmit()}
            // Travado enquanto as torres carregam: updateTorres reconcilia a
            // lista COMPLETA, então salvar com o draft ainda vazio apagaria
            // todas as torres do empreendimento.
            isDisabled={nome.trim() === "" || torresLoading}
            isLoading={saving}
          >
            {isEdit ? "Salvar alterações" : "Criar empreendimento"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div>
          <SectionTitle>Dados do empreendimento</SectionTitle>
          <Input
            label="Nome do empreendimento"
            value={nome}
            onValueChange={setNome}
            placeholder="Ex: Parque Ibirapuera Residências"
          />
          <div className="mt-4 flex items-start justify-between gap-4 rounded-lg border border-neutral-gray-4 bg-neutral-gray-2 px-3.5 py-3">
            <div>
              <div className="text-sm font-semibold text-neutral-gray-11">
                Usar débito/crédito
              </div>
              <p className="mt-0.5 text-xs text-neutral-gray-7">
                Quando desligado, a aba &ldquo;Preço final&rdquo; esconde a coluna Déb./Créd. e o
                &ldquo;Custo troca&rdquo; vira &ldquo;Custo total&rdquo; (sem abater o crédito do padrão).
              </p>
            </div>
            <Switch
              isSelected={usaDebitoCredito}
              onValueChange={setUsaDebitoCredito}
              aria-label="Usar débito/crédito"
            />
          </div>
        </div>
        <div className="border-t border-neutral-gray-4 pt-4">
          <SectionTitle sub="Adicione as torres/blocos — os grupos de unidades referenciam estas torres">
            Torres
          </SectionTitle>
          <TowersEditor
            towers={towers}
            onChange={setTowers}
            groupCountByTorre={groupCountByTorre}
          />
        </div>
      </div>
    </Modal>
  );
}
