import type { NextRequest } from "next/server";

import { fail, publicRoute } from "@/lib/api/handler";
import {
  getFillLinkByToken,
  getPortalFills,
  getPortalMaterialIds,
  getProject,
  listCategorias,
  listEnterpriseCosts,
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
        custoRows: [],
        categorias: [],
        fills: {},
      };
    }
    // Mesma lista plana e de-duplicada da aba "Custos base" (uma linha por
    // BaseMaterial no empreendimento), recortada pelo escopo do link.
    const [custoRows, fills, scopedIds, categorias] = await Promise.all([
      listEnterpriseCosts(organizationId, enterpriseId),
      getPortalFills(organizationId, enterpriseId),
      getPortalMaterialIds(organizationId, link.tipologiaIds),
      listCategorias(organizationId),
    ]);
    // Escopo do link: só os BaseMaterials preenchíveis das tipologias liberadas
    // (opções + sub-itens de kit + itens de custo "fixo") — não expõe o resto.
    // Os marcados "sem custo" (ex.: padrão "Não entregue") também saem: não há
    // o que o terceiro cotar, e o envio os ignora (submitPortalFills).
    const visiveis = custoRows.filter((r) => scopedIds.has(r.baseId) && r.custoMat !== 0);
    const visiveisIds = new Set(visiveis.map((r) => String(r.baseId)));
    return {
      protegido: false,
      projectNome: project?.nome ?? "",
      prazo: link.prazo,
      campos: link.campos,
      custoRows: visiveis,
      categorias,
      fills: Object.fromEntries(Object.entries(fills).filter(([id]) => visiveisIds.has(id))),
    };
  });
}
