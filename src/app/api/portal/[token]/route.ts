import type { NextRequest } from "next/server";

import { fail, publicRoute } from "@/lib/api/handler";
import {
  getActiveProjectId,
  getFillLinkByToken,
  getPortalFills,
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

  const { link, organizationId } = resolved;
  const senha = req.nextUrl.searchParams.get("senha");
  if (link.senha !== null && senha !== null && senha !== link.senha) {
    return fail("Senha incorreta.", 401);
  }

  const protegido = link.senha !== null && senha === null;
  return publicRoute(async (): Promise<PortalData> => {
    const activeId = await getActiveProjectId(organizationId);
    const project = activeId ? await getProject(organizationId, activeId) : null;
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
    // Escopo do link: só as tipologias liberadas e os materiais que elas
    // referenciam (padrão + upgrades) — não expõe o catálogo inteiro da org.
    const scopedTipologias = tipologias.filter((t) => link.tipologiaIds.includes(t.id));
    const scopedIds = new Set<string>();
    for (const t of scopedTipologias) {
      for (const amb of t.ambientes) {
        for (const c of amb.componentes) {
          if (c.padrao) scopedIds.add(c.padrao);
          for (const u of c.upgrades) scopedIds.add(u);
        }
      }
    }
    return {
      protegido: false,
      projectNome: project?.nome ?? "",
      prazo: link.prazo,
      campos: link.campos,
      tipologias: scopedTipologias,
      materiais: materiais.filter((m) => scopedIds.has(m.id)),
      fills: Object.fromEntries(Object.entries(fills).filter(([id]) => scopedIds.has(id))),
    };
  });
}
