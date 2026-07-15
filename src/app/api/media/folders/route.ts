import type { NextRequest } from "next/server";

import { withOrg } from "@/lib/api/handler";
import { createMediaFolder, listMediaFolders, listMediaFolderTree } from "@/lib/server/media";
import type {
  CreateFolderBody,
  FolderTreeNodeDto,
  MediaFolderDto,
} from "@/shared/types/media";

function optionalInt(raw: string | null, field: string): number | undefined {
  if (raw === null || raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n)) throw new Error(`Parâmetro inválido: ${field}.`);
  return n;
}

function parseMode(raw: string | null): "flat" | "tree" {
  if (raw === null || raw === "" || raw === "flat") return "flat";
  if (raw === "tree") return "tree";
  throw new Error("Parâmetro inválido: mode.");
}

/** GET ?mode=flat|tree&parentFolderId= — flat lista um nível; tree vem aninhada. */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  // Tudo dentro do callback: é ele que roda no try/catch do run().
  return withOrg<MediaFolderDto[] | FolderTreeNodeDto[]>((org) => {
    const mode = parseMode(sp.get("mode"));
    const parentFolderId = optionalInt(sp.get("parentFolderId"), "parentFolderId");
    return mode === "tree"
      ? listMediaFolderTree(org, parentFolderId)
      : listMediaFolders(org, parentFolderId);
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as CreateFolderBody;
  return withOrg((org) => createMediaFolder(org, body));
}
