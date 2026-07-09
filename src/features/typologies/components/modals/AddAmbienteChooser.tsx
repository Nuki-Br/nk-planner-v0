"use client";

import { Button, Icon, Modal, type IconName } from "@/components/ui";

import { SHARED } from "../../shared";

interface AddAmbienteChooserProps {
  open: boolean;
  onClose: () => void;
  onCreateNew: () => void;
  onLink: () => void;
}

function Option({
  icon,
  iconColor,
  iconBg,
  title,
  desc,
  onClick,
}: {
  icon: IconName;
  iconColor: string;
  iconBg: string;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3.5 rounded-lg border border-neutral-gray-4 bg-white p-4 text-left transition-colors hover:border-neutral-gray-6 hover:bg-neutral-gray-2"
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{ background: iconBg, color: iconColor }}
      >
        <Icon name={icon} size={20} />
      </span>
      <span className="flex flex-col gap-[3px]">
        <span className="text-sm font-bold text-neutral-gray-11">{title}</span>
        <span className="text-xs leading-relaxed text-neutral-gray-7">{desc}</span>
      </span>
    </button>
  );
}

/** Chooser: criar ambiente do zero vs. vincular de outra tipologia. */
export function AddAmbienteChooser({ open, onClose, onCreateNew, onLink }: AddAmbienteChooserProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Adicionar ambiente"
      width={480}
      actions={
        <Button variant="bordered" onPress={onClose}>
          Cancelar
        </Button>
      }
    >
      <p className="mb-3.5 text-[13px] text-neutral-gray-7">
        Como deseja adicionar o ambiente a esta tipologia?
      </p>
      <div className="flex flex-col gap-2.5">
        <Option
          icon="plus"
          iconColor="#047676"
          iconBg="#E6FAFA"
          title="Criar novo ambiente"
          desc="Defina um ambiente do zero — ícone, imagem base e local na planta."
          onClick={onCreateNew}
        />
        <Option
          icon="share"
          iconColor={SHARED.icon}
          iconBg={SHARED.bg}
          title="Vincular de outra tipologia"
          desc="Reaproveite um ambiente já existente em outra planta. Os componentes ficam sincronizados entre as plantas vinculadas."
          onClick={onLink}
        />
      </div>
    </Modal>
  );
}
