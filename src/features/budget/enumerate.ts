// Enumeração única dos materiais que precisam de custo preenchido, para que a
// Revisão de custos, o Portal do terceiro e a Publicação não divirjam.
//
// Além das OPÇÕES de upgrade (o que já existia), inclui os materiais dos
// componentes de custo "fixo": sem preço neles o custo de troca de TODAS as
// opções do componente fica pendente, então o terceiro precisa vê-los.
import type { Ambiente, Tipologia } from "@/shared/types/domain";

export interface CostRowRef {
  /** rowKey(optionId) para opção; `cc-<costItemId>` para componente de custo. */
  key: string;
  baseId: number;
  compNome: string;
  /** Só a opção tem linha Material — e portanto thread de comentário. */
  optionId: number | null;
  origem: "opcao" | "componente-custo";
  /** true quando a opção é o material padrão (default) do componente. */
  isDefault: boolean;
}

/**
 * Materiais a precificar num ambiente, sem duplicar: um material que já aparece
 * como opção não é listado de novo por ser satélite fixo do mesmo ambiente.
 *
 * A de-dup é POR AMBIENTE, mantendo o comportamento atual — o mesmo material em
 * dois ambientes aparece duas vezes, e ambos escrevem o mesmo baseCosts[baseId].
 */
export function enumerateCostRefs(amb: Ambiente): CostRowRef[] {
  const refs: CostRowRef[] = [];
  const seen = new Set<number>();

  for (const comp of amb.componentes) {
    for (const opt of comp.options) {
      // Kits não têm material único a precificar aqui; o material padrão (default)
      // entra igual às opções de upgrade — ele também precisa de custo.
      if (opt.isKit) continue;
      seen.add(opt.baseId);
      refs.push({
        key: String(opt.id),
        baseId: opt.baseId,
        compNome: comp.nome,
        optionId: opt.id,
        origem: "opcao",
        isDefault: opt.isDefault,
      });
    }
  }

  for (const comp of amb.componentes) {
    for (const cc of comp.custoComponentes ?? []) {
      // "espelho" não tem material próprio: o preço vem da opção escolhida.
      if (cc.tipo !== "fixo" || cc.baseId == null) continue;
      if (seen.has(cc.baseId)) continue;
      seen.add(cc.baseId);
      refs.push({
        key: `cc-${cc.id}`,
        baseId: cc.baseId,
        compNome: `${comp.nome} · ${cc.nome}`,
        optionId: null,
        origem: "componente-custo",
        isDefault: false,
      });
    }
  }

  return refs;
}

/** Todo BaseMaterial que precisa de custo numa tipologia (portal do terceiro). */
export function enumerateBaseIds(tip: Tipologia): Set<number> {
  const ids = new Set<number>();
  for (const amb of tip.ambientes) {
    for (const ref of enumerateCostRefs(amb)) ids.add(ref.baseId);
  }
  return ids;
}
