import type { NextRequest } from "next/server";

import { fail, publicRoute } from "@/lib/api/handler";
import {
  getFillLinkByToken,
  getPortalFills,
  getProject,
  listMateriais,
  listTipologias,
} from "@/lib/server/store";
import { ACTIVE_PROJECT_ID } from "@/shared/constants/project";
import type { PortalData } from "@/shared/types/api";

// Rota PÚBLICA do portal do terceiro: resolve token → escopo no servidor.
// Com senha no link, o payload só sai com ?senha= correta (o gate da tela
// repete o GET com a senha digitada); senha errada → 401.
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const resolved = await getFillLinkByToken(params.token);
  if (!resolved) return publicRoute(() => Promise.resolve(null));

  const { link, organizationId } = resolved;
  const senha = req.nextUrl.searchParams.get("senha");
  if (link.senha !== null && senha !== null && senha !== link.senha) {
    return fail("Senha incorreta.", 401);
  }

  const protegido = link.senha !== null && senha === null;
  return publicRoute(async (): Promise<PortalData> => {
    const project = await getProject(organizationId, ACTIVE_PROJECT_ID);
    if (protegido) {
      return {
        protegido: true,
        projectNome: project?.nome ?? "",
        prazo: link.prazo,
        campos: link.campos,
        tipologias: [],
        materiais: [],
        fills: {},
      };
    }
    const [tipologias, materiais, fills] = await Promise.all([
      listTipologias(organizationId),
      listMateriais(organizationId),
      getPortalFills(organizationId),
    ]);
    return {
      protegido: false,
      projectNome: project?.nome ?? "",
      prazo: link.prazo,
      campos: link.campos,
      tipologias: tipologias.filter((t) => link.tipologiaIds.includes(t.id)),
      materiais,
      fills,
    };
  });
}
