import type { NextRequest } from "next/server";

import { fail, publicRoute } from "@/lib/api/handler";
import {
  getFillLinkByToken,
  getPortalFills,
  getPortalMaterialIds,
  getProject,
  listMateriais,
  listTipologias,
} from "@/lib/server/store";
import type { PortalData } from "@/shared/types/api";

// Rota PÚBLICA do portal do terceiro: resolve token → escopo no servidor.
// Com senha no link, o payload só sai com ?senha= correta (o gate da tela
// repete o GET com a senha digitada); senha errada → 401.
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const resolved = await getFillLinkByToken(params.token);
  if (!resolved) return publicRoute(() => Promise.resolve(null));

  const { link, organizationId, enterpriseId } = resolved;
  const senha = req.nextUrl.searchParams.get("senha");
  if (link.senha !== null && senha !== null && senha !== link.senha) {
    return fail("Senha incorreta.", 401);
  }

  const protegido = link.senha !== null && senha === null;
  return publicRoute(async (): Promise<PortalData> => {
    // O empreendimento é o do PRÓPRIO link, não o âncora da org.
    const project = await getProject(organizationId, enterpriseId);
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
    const [tipologias, materiais, fills, scopedIds] = await Promise.all([
      listTipologias(organizationId, enterpriseId),
      listMateriais(organizationId),
      getPortalFills(organizationId, enterpriseId),
      getPortalMaterialIds(organizationId, link.tipologiaIds),
    ]);
    // Escopo do link: só as tipologias liberadas e os BaseMaterials preenchíveis
    // que elas referenciam (opções + sub-itens de kit) — não expõe o catálogo inteiro.
    const scopedTipologias = tipologias.filter((t) => link.tipologiaIds.includes(t.id));
    return {
      protegido: false,
      projectNome: project?.nome ?? "",
      prazo: link.prazo,
      campos: link.campos,
      tipologias: scopedTipologias,
      materiais: materiais.filter((m) => scopedIds.has(m.id)),
      fills: Object.fromEntries(Object.entries(fills).filter(([id]) => scopedIds.has(Number(id)))),
    };
  });
}
