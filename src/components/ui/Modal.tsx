"use client";

import {
  Modal as HeroModal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  /** Largura máxima em px (o protótipo usa 520 por padrão; kits usam 640). */
  width?: number;
  /** Botões do rodapé (alinhados à direita). */
  actions?: React.ReactNode;
}

/** Modal Nuki: header com título + fechar, corpo e rodapé de ações. */
export function Modal({ open, onClose, title, children, width = 520, actions }: ModalProps) {
  return (
    <HeroModal
      isOpen={open}
      onClose={onClose}
      scrollBehavior="inside"
      classNames={{
        base: "rounded-nk-2xl bg-white",
        header: "border-b border-neutral-gray-3 px-6 py-5",
        closeButton: "right-4 top-4 text-neutral-gray-7",
      }}
    >
      <ModalContent style={{ maxWidth: width }}>
        <ModalHeader className="text-medium font-bold text-neutral-gray-11">
          {title}
        </ModalHeader>
        <ModalBody className="px-6 py-6">{children}</ModalBody>
        {actions && (
          <ModalFooter className="justify-end gap-2 px-6 pb-5 pt-3">
            {actions}
          </ModalFooter>
        )}
      </ModalContent>
    </HeroModal>
  );
}
