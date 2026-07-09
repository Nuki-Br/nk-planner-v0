import { describe, expect, it } from "vitest";

import { createSeed } from "@/lib/data/seed";
import { TAX_COLUMNS_DEFAULT } from "@/shared/constants/budget";

import {
  ambTotal,
  buildScopeRefs,
  calcAnyRow,
  effMaterial,
  isBasePending,
  type BudgetDeps,
} from "./calc";

const seed = createSeed();
const deps = (extra?: Partial<BudgetDeps>): BudgetDeps => ({
  materiais: seed.materiais,
  kits: seed.kits,
  cols: TAX_COLUMNS_DEFAULT,
  overrides: {},
  baseCosts: {},
  pendingSet: new Set(seed.pendingItems),
  ...extra,
});

const t1 = seed.tipologias.find((t) => t.id === "t1")!;
const t3 = seed.tipologias.find((t) => t.id === "t3")!;

describe("effMaterial / isBasePending", () => {
  it("custo base preenchido sobrepõe o catálogo e tira a pendência", () => {
    const mat = seed.materiais.find((m) => m.id === "piso-004")!;
    const base = { "piso-004": { mat: "310", mo: "50" } };
    const eff = effMaterial(base, "piso-004", mat);
    expect(eff.custoMat).toBe(310);
    expect(eff.custoMO).toBe(50);
    const pend = new Set(["c3-1-1-piso-004"]);
    expect(isBasePending(pend, {}, "c3-1-1-piso-004", "piso-004")).toBe(true);
    expect(isBasePending(pend, base, "c3-1-1-piso-004", "piso-004")).toBe(false);
  });
});

describe("calcAnyRow", () => {
  it("material → BudgetRowResult (T-M1 do motor)", () => {
    const comp = t1.ambientes[0]!.componentes[0]!; // c1-1-1
    const r = calcAnyRow(deps(), comp, "piso-002", "c1-1-1-piso-002");
    expect(r?.kind).toBe("material");
    if (r?.kind === "material") expect(r.result.total).toBeCloseTo(1407.4574, 4);
  });

  it("kit → KitRowResult com pendência de sub-item", () => {
    const comp = t3.ambientes[0]!.componentes[0]!; // c3-1-1 com kit-piso-barcelona
    const r = calcAnyRow(deps(), comp, "kit-piso-barcelona", "c3-1-1-kit-piso-barcelona");
    expect(r?.kind).toBe("kit");
    if (r?.kind === "kit") expect(r.result.anyPending).toBe(true);
  });
});

describe("ambTotal", () => {
  it("soma os upgrades não pendentes do ambiente", () => {
    const amb = t1.ambientes[0]!; // Sala/Living: c1-1-1 (3 upgrades) + c1-1-2 (1 upgrade)
    expect(ambTotal(deps(), amb)).toBeGreaterThan(0);
  });

  it("linha pendente fica fora do total e volta ao preencher custo base", () => {
    const amb = t3.ambientes[0]!; // c3-1-1: piso-002/003/004 + kit (004 e sub do kit pendentes)
    const semPendentes = ambTotal(deps(), amb);
    const comCusto = ambTotal(
      deps({ baseCosts: { "piso-004": { mat: "310", mo: "50" } } }),
      amb
    );
    expect(comCusto).toBeGreaterThan(semPendentes); // piso-004 entrou no total
  });
});

describe("buildScopeRefs", () => {
  it("expõe refs fixas + colunas à esquerda (não as à direita)", () => {
    const comp = t1.ambientes[0]!.componentes[0]!;
    const r = calcAnyRow(deps(), comp, "piso-002", "c1-1-1-piso-002");
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
