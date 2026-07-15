import type { NextRequest } from "next/server";

import { toInt, withOrg } from "@/lib/api/handler";
import { confirmUpload } from "@/lib/server/media";
import type { ConfirmUploadBody } from "@/shared/types/media";

interface Params {
  params: { id: string };
}

/** Passo 3 de 3: prova que o binário chegou, ativa e contabiliza a cota. */
export async function POST(req: NextRequest, { params }: Params) {
  const body = (await req.json()) as ConfirmUploadBody;
  return withOrg((org) => confirmUpload(org, toInt(params.id), body));
}
