import type { NextRequest } from "next/server";

import { toInt, withOrg } from "@/lib/api/handler";
import { deleteMediaFile, updateMediaFile } from "@/lib/server/media";
import type { UpdateFileBody } from "@/shared/types/media";

// Sem GET: o contrato da API de customização tem GET /files/:id, mas nenhuma
// tela busca um arquivo avulso (as listagens já trazem o DTO). Portar a rota
// só somaria superfície não exercitada — o admin também nunca a chama.

interface Params {
  params: { id: string };
}

/** Renomear e/ou mover. folderId null = raiz; ausente = não mexer. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const body = (await req.json()) as UpdateFileBody;
  return withOrg((org) => updateMediaFile(org, toInt(params.id), body));
}

/** Soft delete + remoção do binário + baixa na cota. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  return withOrg((org) => deleteMediaFile(org, toInt(params.id)));
}
