import type { NextRequest } from "next/server";

import { fail, publicRoute } from "@/lib/api/handler";
import { getFillLinkByToken, submitPortalFills } from "@/lib/server/store";
import type { PortalFill } from "@/shared/types/domain";

// Envio do preenchimento pelo terceiro (PÚBLICA — autorização = posse do
// token; com senha no link, ela acompanha o body).
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const resolved = await getFillLinkByToken(params.token);
  if (!resolved) return fail("Link inválido ou expirado.", 404);

  const { link, organizationId } = resolved;
  const { fills, senha } = (await req.json()) as {
    fills: Record<string, PortalFill>;
    senha?: string;
  };
  if (link.senha !== null && senha !== link.senha) {
    return fail("Senha incorreta.", 401);
  }
  return publicRoute(() => submitPortalFills(organizationId, fills));
}
