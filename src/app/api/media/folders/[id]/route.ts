import type { NextRequest } from "next/server";

import { toInt, withOrg } from "@/lib/api/handler";
import { deleteMediaFolder, updateMediaFolder } from "@/lib/server/media";
import type { UpdateFolderBody } from "@/shared/types/media";

interface Params {
  params: { id: string };
}

/** Renomear e/ou mover. parentFolderId null = raiz; ausente = não mexer. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const body = (await req.json()) as UpdateFolderBody;
  return withOrg((org) => updateMediaFolder(org, toInt(params.id), body));
}

/** Não-destrutivo: filhos e arquivos sobem um nível antes da exclusão. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  return withOrg((org) => deleteMediaFolder(org, toInt(params.id)));
}
