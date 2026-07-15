"use client";

import { useEffect, useState } from "react";

import { Button, Input, Modal } from "@/components/ui";

interface NamePromptModalProps {
  isOpen: boolean;
  title: string;
  label: string;
  initialValue?: string;
  confirmText?: string;
  isLoading?: boolean;
  onConfirm: (name: string) => void;
  onClose: () => void;
}

/** Prompt de nome — compartilhado por criar pasta e renomear pasta/arquivo. */
export function NamePromptModal({
  isOpen,
  title,
  label,
  initialValue = "",
  confirmText = "Salvar",
  isLoading,
  onConfirm,
  onClose,
}: NamePromptModalProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (isOpen) setValue(initialValue);
  }, [isOpen, initialValue]);

  const trimmed = value.trim();
  const canSubmit = trimmed.length > 0;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={title}
      width={440}
      actions={
        <>
          <Button variant="ghost" onPress={onClose}>
            Cancelar
          </Button>
          <Button
            variant="teal"
            isLoading={isLoading}
            isDisabled={!canSubmit}
            onPress={() => onConfirm(trimmed)}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <Input
        autoFocus
        label={label}
        value={value}
        onValueChange={setValue}
        onKeyDown={(e) => {
          if (e.key === "Enter" && canSubmit && !isLoading) onConfirm(trimmed);
        }}
      />
    </Modal>
  );
}
