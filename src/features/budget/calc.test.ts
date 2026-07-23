import { describe, expect, it } from "vitest";

import { createSeed } from "@/lib/data/seed";
import { TAX_COLUMNS_DEFAULT } from "@/shared/constants/budget";
import type { Componente, MaterialOption } from "@/shared/types/domain";

import {
  ambTotal,
  ambienteRegistros,
  buildScopeRefs,
  calcAnyRow,
  effMaterial,
  isOptionOwnPending,
  isOptionPending,
  pendingCostItems,
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
    expect(isOptionPending(deps(), salaPisoT1, optPiso004)).toBe(true); // custoMat 0 no catálogo
    expect(isOptionPending(deps({ baseCosts: base }), salaPisoT1, optPiso004)).toBe(false); // custo base cobre

    const optPiso002 = optByCodigo(salaPisoT1, "PP-6060-BI");
    expect(isOptionPending(deps(), salaPisoT1, optPiso002)).toBe(false); // material precificado
  });
});

describe("calcAnyRow", () => {
  it("material → BudgetRowResult (T-M1 do motor)", () => {
    const opt = optByCodigo(salaPisoT1, "PP-6060-BI"); // upgrade piso-002
    const r = calcAnyRow(deps(), salaPisoT1, opt);
    expect(r?.kind).toBe("material");
    if (r?.kind === "material") expect(r.result.total).toBeCloseTo(1670.996, 4);
  });

  it("kit → KitRowResult com pendência de sub-item", () => {
    const opt = optByCodigo(salaPisoT3, "KIT-PB"); // kit Piso Barcelona, kitQtds [36.8, 3, 3.68]
    const r = calcAnyRow(deps(), salaPisoT3, opt);
    expect(r?.kind).toBe("kit");
    if (r?.kind === "kit") {
      // 208*36.8 + 115*3 + 0*3.68 (rt-bcn pendente)
      expect(r.result.debitoTotal).toBeCloseTo(7999.4, 10);
      expect(r.result.subItemPending).toBe(true);
    }
  });
});

describe("pendência de item de custo", () => {
  const hall = t1.ambientes.find((a) => a.nome === "Hall")!;
  const hallPiso = hall.componentes[0]!;
  const rodape = seed.materiais.find((m) => m.codigo === "RDP-466-SL")!;
  /** Zera o custo do rodapé (satélite fixo do Hall) no catálogo. */
  const semRodape = deps({
    materiais: seed.materiais.map((m) =>
      m.id === rodape.id ? { ...m, custoMat: 0, custoMO: 0 } : m
    ),
  });

  it("derruba todas as opções do componente afetado", () => {
    for (const opt of hallPiso.options.filter((o) => !o.isDefault)) {
      expect(isOptionPending(semRodape, hallPiso, opt)).toBe(true);
    }
  });

  it("NÃO acusa a opção em si — o material dela está preenchido", () => {
    for (const opt of hallPiso.options.filter((o) => !o.isDefault)) {
      expect(isOptionOwnPending(semRodape, opt)).toBe(false);
    }
    const upg = hallPiso.options.find((o) => !o.isDefault)!;
    expect(pendingCostItems(semRodape, hallPiso, upg.id).map((c) => c.nome)).toEqual(["Rodapé"]);
  });

  it("não vaza para outros componentes nem outros ambientes", () => {
    // A Sala não tem itens de custo: um rodapé sem preço no Hall não pode
    // marcar as opções dela como pendentes.
    const salaOpt = optByCodigo(salaPisoT1, "PP-6060-BI");
    expect(isOptionPending(semRodape, salaPisoT1, salaOpt)).toBe(false);
    expect(pendingCostItems(semRodape, salaPisoT1, salaOpt.id)).toEqual([]);
  });
});

describe("ambTotal", () => {
  it("soma só os upgrades não pendentes do ambiente (Sala t1)", () => {
    // Sala t1: Piso (piso-002 ok; piso-003/004 e kit pendentes) + Rodapé (rod-002 ok)
    // piso-002 total = 1670.996 ; rod-002 total = 478.296
    expect(ambTotal(deps(), t1.ambientes[0]!)).toBeCloseTo(1670.996 + 478.296, 4);
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

describe("ambienteRegistros", () => {
  function findHall() {
    for (const tip of seed.tipologias) {
      const a = tip.ambientes.find((x) => x.nome === "Hall");
      if (a) return a;
    }
    throw new Error("ambiente Hall não encontrado");
  }

  it("resolve a linha-registro do ambiente (Parede — Pintura látex)", () => {
    const regs = ambienteRegistros(deps(), findHall());
    expect(regs).toHaveLength(1);
    expect(regs[0]!.registro.nome).toBe("Parede — Pintura látex");
    expect(regs[0]!.valUn).toBe(60); // valor unitário digitado
    expect(regs[0]!.line).toBeCloseTo(60 * 24, 6);
    expect(regs[0]!.pending).toBe(false);
  });
});

describe("buildScopeRefs", () => {
  it("expõe refs fixas + colunas à esquerda (não as à direita)", () => {
    const opt = optByCodigo(salaPisoT1, "PP-6060-BI");
    const r = calcAnyRow(deps(), salaPisoT1, opt);
    if (r?.kind !== "material") throw new Error("esperava material");
    const { scope, refs } = buildScopeRefs(TAX_COLUMNS_DEFAULT, r.result, 2);
    expect(scope.custo_troca).toBeCloseTo(984.4, 10);
    expect(scope.valor_unitario).toBeCloseTo(2539.2, 10); // = débito estendido
    expect(scope.credito).toBeCloseTo(1554.8, 10);
    expect(scope.taxa_construtora).toBeCloseTo(78.752, 10);
    expect(scope.contingencia_incc).toBeCloseTo(49.22, 10);
    expect(scope.taxa_incorporadora).toBeUndefined(); // coluna do próprio índice não entra
    expect(refs.map((x) => x.token)).toEqual([
      "custo_troca",
      "valor_unitario",
      "quantitativo",
      "debito",
      "credito",
      "taxa_construtora",
      "contingencia_incc",
    ]);
  });
});
