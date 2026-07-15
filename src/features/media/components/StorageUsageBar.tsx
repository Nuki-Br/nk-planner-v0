"use client";

import { Icon } from "@/components/ui";
import { humanFileSize } from "@/shared/utils/media";

import { useStorageUsage } from "../hooks/useMediaFolders";

/** Chip de uso de armazenamento da organização. */
export function StorageUsageBar() {
  const { data: usage, isLoading } = useStorageUsage();

  return (
    <div className="mr-16 flex items-center gap-2 rounded-nk-xl bg-primary-1 px-3 py-2">
      <Icon name="storage" size={18} className="text-primary-7" />
      <div className="flex flex-col leading-tight">
        <span className="text-xs-p font-bold text-primary-8">
          {isLoading || !usage ? "—" : humanFileSize(usage.usedBytes)}
        </span>
        <span className="text-xs-p text-neutral-gray-8">
          {usage ? `${usage.fileCount} arquivo(s)` : "Uso de armazenamento"}
        </span>
      </div>
    </div>
  );
}
