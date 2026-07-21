"use client";

import { Button, EmptyState, Modal, StatusBadge } from "@/components/ui";
import { useTipologias } from "@/lib/hooks/useTipologias";
import { cn } from "@/lib/utils";
import { useActiveProjectId } from "@/lib/hooks/useActiveProject";
import type { Material } from "@/shared/types/domain";

import { getMaterialUsage } from "../usage";

interface UsageModalProps {
  open: boolean;
  onClose: () => void;
  material: Material | null;
}

/** Modal "Onde este material é usado": Tipologia/Ambiente/Componente/Função. */
export function UsageModal({ open, onClose, material }: UsageModalProps) {
  const projectId = useActiveProjectId();
  const { data: tipologias = [] } = useTipologias(projectId);
  const usages = material ? getMaterialUsage(tipologias, material.id) : [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Onde este material é usado"
      width={620}
      actions={
        <Button variant="bordered" onPress={onClose}>
          Fechar
        </Button>
      }
    >
      {material && (
        <div>
          <div className="mb-5 flex items-center justify-between rounded-lg bg-neutral-gray-2 px-4 py-3">
            <div>
              <p className="text-[13px] font-bold text-neutral-gray-11">{material.nome}</p>
              <p className="mt-0.5 text-[11px] text-neutral-gray-7">
                {material.codigo} · {material.fabricante}
              </p>
            </div>
            {usages.length > 0 && (
              <StatusBadge
                status="preenchido"
                label={`${usages.length} uso${usages.length !== 1 ? "s" : ""}`}
              />
            )}
          </div>
          {usages.length === 0 ? (
            <EmptyState
              icon="box"
              title="Material não associado"
              subtitle="Este material não está em nenhuma tipologia ainda"
            />
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-neutral-gray-4">
                  {["Tipologia", "Ambiente", "Componente", "Função"].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-neutral-gray-7"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usages.map((u, i) => (
                  <tr key={i} className="border-b border-neutral-gray-4 last:border-b-0">
                    <td className="px-3 py-[9px] text-xs text-neutral-gray-9">{u.tip}</td>
                    <td className="px-3 py-[9px] text-xs text-neutral-gray-9">{u.amb}</td>
                    <td className="px-3 py-[9px] text-xs text-neutral-gray-9">{u.comp}</td>
                    <td className="px-3 py-[9px]">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                          u.fn === "Padrão"
                            ? "bg-primary-1 text-primary-7"
                            : "bg-tint-amber-bg text-tint-amber-fg"
                        )}
                      >
                        {u.fn}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </Modal>
  );
}
