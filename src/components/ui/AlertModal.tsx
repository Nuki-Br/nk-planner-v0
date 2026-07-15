"use client";

import { Button } from "./Button";
import { Modal } from "./Modal";

interface AlertModalProps {
  open: boolean;
  title: string;
  /** Corpo da confirmação — texto ou JSX (ex.: nome em negrito). */
  body: React.ReactNode;
  /** "error" pinta o confirmar de vermelho (exclusões). */
  variant?: "error" | "default";
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Confirmação de ação destrutiva. Compõe o Modal em vez de reimplementar —
 * o primeiro do repo (não havia precedente de confirmar exclusão em lugar
 * nenhum), então é aqui que o padrão nasce.
 */
export function AlertModal({
  open,
  title,
  body,
  variant = "default",
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  isLoading = false,
  onCancel,
  onConfirm,
}: AlertModalProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      width={440}
      actions={
        <>
          <Button variant="ghost" onPress={onCancel} isDisabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "error" ? "danger" : "teal"}
            onPress={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm-p text-neutral-gray-10">{body}</p>
    </Modal>
  );
}
