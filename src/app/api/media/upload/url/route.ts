import type { NextRequest } from "next/server";

import { withAuth } from "@/lib/api/handler";
import { requestUploadUrl } from "@/lib/server/media";
import type { RequestUploadUrlBody } from "@/shared/types/media";

/** Passo 1 de 3 do upload: devolve a URL assinada do Storage. */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as RequestUploadUrlBody;
  // withAuth (não withOrg): MediaFile.UploadedById precisa do userId.
  return withAuth((auth) => requestUploadUrl(auth.organizationId, auth.userId, body));
}
