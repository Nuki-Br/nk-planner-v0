import { describe, expect, it } from "vitest";

import { createSeed } from "@/lib/data/seed";
import { TAX_COLUMNS_DEFAULT } from "@/shared/constants/budget";
import type { Componente, MaterialOption } from "@/shared/types/domain";

import {
  ambTotal,
  buildScopeRefs,
  calcAnyRow,
  effMaterial,
  isOptionPending,
  type BudgetDeps,
} from "./calc";

const seed = createSeed();
const deps = (extra?: Partial<BudgetDeps>): BudgetDeps => ({
  materiais: seed.materiais,
  kits: seed.kits,
  cols: TAX_COLUMNS_DEFAULT,
  overrides: {},
  baseCosts: {},
  ...extra,
});

const t1 = seed.tipologias[0]!;
const t3 = seed.tipologias[2]!;
const salaPisoT1 = t1.ambientes[0]!.componentes[0]!;
const salaPisoT3 = t3.ambientes[0]!.componentes[0]!;

const piso004 = seed.materiais.find((m) => m.codigo === "MC-NAT-CA")!; // pendente (custoMat 0)

/** Opção de um componente pelo código do BaseMaterial (material ou kit) referenciado. */
function optByCodigo(comp: Componente, codigo: string): MaterialOption {
  const base =
    seed.materiais.find((m) => m.codigo === codigo) ?? seed.kits.find((k) => k.codigo === codigo);
  const opt = comp.options.find((o) => o.baseId === base?.id);
  if (!opt) throw new Error(`opção ${codigo} não encontrada`);
  return opt;
}

describe("effMaterial / isOptionPending", () => {
  it("custo base preenchido sobrepõe o catálogo e tira a pendência", () => {
    const base = { [piso004.id]: { mat: "310", mo: "50" } };
    const eff = effMaterial(base, piso004);
    expect(eff.custoMat).toBe(310);
    expect(eff.custoMO).toBe(50);

    const optPiso004 = optByCodigo(salaPisoT1, "MC-NAT-CA");
    expect(isOptionPending(deps(), optPiso004)).toBe(true); // custoMat 0 no catálogo
    expect(isOptionPending(deps({ baseCosts: base }), optPiso004)).toBe(false); // custo base cobre

    const optPiso002 = optByCodigo(salaPisoT1, "PP-6060-BI");
    expect(isOptionPending(deps(), optPiso002)).toBe(false); // material precificado
  });
});

describe("calcAnyRow", () => {
  it("material → BudgetRowResult (T-M1 do motor)", () => {
    const opt = optByCodigo(salaPisoT1, "PP-6060-BI"); // upgrade piso-002
    const r = calcAnyRow(deps(), salaPisoT1, opt);
    expect(r?.kind).toBe("material");
    if (r?.kind === "material") expect(r.result.total).toBeCloseTo(1407.4574, 4);
  });

  it("kit → KitRowResult com pendência de sub-item", () => {
    const opt = optByCodigo(salaPisoT3, "KIT-PB"); // kit Piso Barcelona, kitQtds [36.8, 3, 3.68]
    const r = calcAnyRow(deps(), salaPisoT3, opt);
    expect(r?.kind).toBe("kit");
    if (r?.kind === "kit") {
      // 208*36.8 + 115*3 + 0*3.68 (rt-bcn pendente)
      expect(r.result.kitMaterialTotal).toBeCloseTo(7999.4, 10);
      expect(r.result.anyPending).toBe(true);
    }
  });
});

describe("ambTotal", () => {
  it("soma só os upgrades não pendentes do ambiente (Sala t1)", () => {
    // Sala t1: Piso (piso-002 ok; piso-003/004 e kit pendentes) + Rodapé (rod-002 ok)
    // piso-002 total = 1407.4574 ; rod-002 total = 449.82
    expect(ambTotal(deps(), t1.ambientes[0]!)).toBeCloseTo(1407.4574 + 449.82, 4);
  });

  it("linha pendente fica fora do total e volta ao preencher custo base", () => {
    const amb = t3.ambientes[0]!; // Sala t3: piso-004 pendente entra ao ganhar custo base
    const semPendentes = ambTotal(deps(), amb);
    const comCusto = ambTotal(
      deps({ baseCosts: { [piso004.id]: { mat: "310", mo: "50" } } }),
      amb
    );
    expect(comCusto).toBeGreaterThan(semPendentes);
  });
});

describe("buildScopeRefs", () => {
  it("expõe refs fixas + colunas à esquerda (não as à direita)", () => {
    const opt = optByCodigo(salaPisoT1, "PP-6060-BI");
    const r = calcAnyRow(deps(), salaPisoT1, opt);
    if (r?.kind !== "material") throw new Error("esperava material");
    const { scope, refs } = buildScopeRefs(TAX_COLUMNS_DEFAULT, r.result, 2);
    expect(scope.custo_troca).toBe(35.5);
    expect(scope.taxa_construtora).toBeCloseTo(2.84, 10);
    expect(scope.contingencia_incc).toBeCloseTo(1.775, 10);
    expect(scope.taxa_incorporadora).toBeUndefined(); // coluna do próprio índice não entra
    expect(refs.map((x) => x.token)).toEqual([
      "custo_troca",
      "valor_unitario",
      "quantitativo",
      "taxa_construtora",
      "contingencia_incc",
    ]);
  });
});
