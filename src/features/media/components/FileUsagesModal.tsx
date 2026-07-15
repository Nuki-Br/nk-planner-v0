"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchFileUsages } from "@/lib/api/media";
import { Modal, Spinner } from "@/components/ui";
import { queryKeys } from "@/lib/hooks/queryKeys";
import type { FileUsageItemDto, MediaFileListItemDto } from "@/shared/types/media";

function UsageSection({ title, items }: { title: string; items: FileUsageItemDto[] }) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs-p font-bold uppercase text-neutral-gray-8">{title}</p>
      {items.map((item) => (
        <div
          key={`${title}-${item.id}`}
          className="flex items-center justify-between rounded-lg bg-neutral-gray-2 px-3 py-2"
        >
          <span className="truncate text-sm-p text-neutral-gray-11">{item.name}</span>
          <span className="ml-2 shrink-0 text-xs-p text-neutral-gray-8">
            {item.enterpriseName}
          </span>
        </div>
      ))}
    </div>
  );
}

/** "Onde é usado?" — plantas, ambientes e materiais que apontam para o arquivo. */
export function FileUsagesModal({
  file,
  onClose,
}: {
  file: MediaFileListItemDto | null;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.mediaFileUsages(file?.id ?? 0),
    queryFn: () => fetchFileUsages(file?.id ?? 0),
    enabled: !!file,
    refetchOnWindowFocus: false,
  });

  const total =
    (data?.blueprints.length ?? 0) +
    (data?.rooms.length ?? 0) +
    (data?.materials.asPreview.length ?? 0) +
    (data?.materials.asRender.length ?? 0);

  return (
    <Modal
      open={!!file}
      onClose={onClose}
      width={512}
      title={
        <div className="flex flex-col gap-0">
          <span>Onde é usado?</span>
          {file && (
            <span className="text-xs-p font-normal text-neutral-gray-8">
              {file.displayName}
            </span>
          )}
        </div>
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : total === 0 ? (
        <p className="py-6 text-center text-sm-p text-neutral-gray-8">
          Este arquivo ainda não está vinculado a nenhum item.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <UsageSection title="Plantas" items={data?.blueprints ?? []} />
          <UsageSection title="Ambientes" items={data?.rooms ?? []} />
          <UsageSection title="Materiais" items={data?.materials.asPreview ?? []} />
          {/* asRender vem sempre [] no planner — a seção nunca renderiza. */}
          <UsageSection title="Materiais (render)" items={data?.materials.asRender ?? []} />
        </div>
      )}
    </Modal>
  );
}
