import { describe, expect, it } from "vitest";

import { createSeed } from "@/lib/data/seed";
import { TAX_COLUMNS_DEFAULT } from "@/shared/constants/budget";
import type { Componente, MaterialOption } from "@/shared/types/domain";

import {
  ambTotal,
  buildScopeRefs,
  calcAnyRow,
  isOptionOwnPending,
  isOptionPending,
  isRowPending,
  padroesPendentes,
  qtdOf,
  unidadeOf,
  valUnOf,
  type BudgetDeps,
} from "./calc";

const seed = createSeed();
const deps = (extra?: Partial<BudgetDeps>): BudgetDeps => ({
  materiais: seed.materiais,
  kits: seed.kits,
  cols: TAX_COLUMNS_DEFAULT,
  custosBase: seed.custosBase,
  pricings: {},
  ...extra,
});

/** Custo base do empreendimento com um material sobrescrito. */
const comCusto = (baseId: number, custoMat: number | null, custoMO: number) => ({
  ...seed.custosBase,
  [baseId]: { baseId, custoMat, custoMO, custoQtd: 1, composicao: [] },
});

/** Custo base com uma composição de um insumo (preço null = insumo pendente). */
const comComposicao = (baseId: number, custoMat: number, preco: number | null) => ({
  ...seed.custosBase,
  [baseId]: {
    baseId,
    custoMat,
    custoMO: 0,
    custoQtd: 1,
    composicao: [
      { id: 1, itemId: 1, codigo: null, nome: "Argamassa", unidade: "kg" as const, qtd: 8, preco, ordem: 0 },
    ],
  },
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

describe("custo base do empreendimento", () => {
  it("preencher o custo tira a pendência da opção", () => {
    const optPiso004 = optByCodigo(salaPisoT1, "MC-NAT-CA");
    expect(isOptionPending(deps(), optPiso004)).toBe(true); // sem custo no projeto
    expect(isOptionPending(deps({ custosBase: comCusto(piso004.id, 310, 50) }), optPiso004)).toBe(false);

    const optPiso002 = optByCodigo(salaPisoT1, "PP-6060-BI");
    expect(isOptionPending(deps(), optPiso002)).toBe(false); // já precificado
  });

  it("insumo da composição sem preço deixa a opção pendente, mesmo com material cotado", () => {
    const optPiso002 = optByCodigo(salaPisoT1, "PP-6060-BI");
    expect(isOptionPending(deps({ custosBase: comComposicao(optPiso002.baseId, 98, null) }), optPiso002)).toBe(true);
    // com o insumo precificado, a composição entra no valor unitário
    const d = deps({ custosBase: comComposicao(optPiso002.baseId, 98, 1.5) });
    expect(isOptionPending(d, optPiso002)).toBe(false);
    expect(valUnOf(d, optPiso002)).toBeCloseTo(98 + 8 * 1.5, 10);
  });

  it("valor unitário efetivo é material + mão de obra do empreendimento", () => {
    const opt = optByCodigo(salaPisoT1, "PP-6060-BI"); // 98,00 + 22,00
    expect(valUnOf(deps(), opt)).toBeCloseTo(120, 10);
  });
});

describe("override de precificação (MaterialPricing)", () => {
  const optPiso002 = optByCodigo(salaPisoT1, "PP-6060-BI");

  it("valor unitário sobrescrito vence o custo base e resolve a pendência", () => {
    const optPiso004 = optByCodigo(salaPisoT1, "MC-NAT-CA"); // pendente no seed
    const d = deps({ pricings: { [optPiso004.id]: { valorUnitario: 400, qtd: null, rt: null, unidade: null, colunas: {} } } });
    expect(valUnOf(d, optPiso004)).toBe(400);
    // Um preço digitado direto na tabela é preço: não faz sentido a linha
    // continuar "aguardando custo" depois disso.
    expect(isOptionOwnPending(d, optPiso004)).toBe(false);
  });

  it("override de qtd/unidade vale nas DUAS tipologias que compartilham o ambiente", () => {
    // A Sala é o MESMO Room em t1 e t3 (compartilhado), com qtds diferentes por
    // planta. O override é da aplicação, então vence nas duas.
    expect(qtdOf(deps(), salaPisoT1, optPiso002.id)).not.toBe(qtdOf(deps(), salaPisoT3, optPiso002.id));
    const d = deps({ pricings: { [optPiso002.id]: { valorUnitario: null, qtd: 99, rt: null, unidade: "ml", colunas: {} } } });
    expect(qtdOf(d, salaPisoT1, optPiso002.id)).toBe(99);
    expect(qtdOf(d, salaPisoT3, optPiso002.id)).toBe(99);
    expect(unidadeOf(d, salaPisoT1, optPiso002.id)).toBe("ml");
  });

  it("campo null herda: zerar o override devolve a qtd da planta", () => {
    const d = deps({ pricings: { [optPiso002.id]: { valorUnitario: 500, qtd: null, rt: null, unidade: null, colunas: {} } } });
    expect(qtdOf(d, salaPisoT1, optPiso002.id)).toBe(salaPisoT1.qtd);
    expect(unidadeOf(d, salaPisoT1, optPiso002.id)).toBe(salaPisoT1.unidade);
  });

  it("override de qtd muda o total da linha", () => {
    const semOvr = calcAnyRow(deps(), salaPisoT1, optPiso002);
    const dobro = calcAnyRow(
      deps({ pricings: { [optPiso002.id]: { valorUnitario: null, qtd: salaPisoT1.qtd * 2, rt: null, unidade: null, colunas: {} } } }),
      salaPisoT1,
      optPiso002
    );
    if (semOvr?.kind !== "material" || dobro?.kind !== "material") throw new Error("esperava material");
    expect(dobro.result.debitoItem).toBeCloseTo(semOvr.result.debitoItem * 2, 6);
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
      // (208*36.8 + 115*3 + 0*3.68) × 1,15 de RT (rt-bcn pendente)
      expect(r.result.debitoTotal).toBeCloseTo(7999.4 * 1.15, 10);
      expect(r.result.custoPendente).toBe(true);
      expect(r.result.pending).toBe(true);
    }
  });

  it("kit sem quantidade de sub-item nesta planta fica pendente e fora do total", () => {
    // Sala T2 oferta o mesmo kit sem quantitativos gravados: o porcelanato (m²)
    // herda a área; a soleira (und) não tem de onde herdar.
    const salaPisoT2 = seed.tipologias[1]!.ambientes[0]!.componentes[0]!;
    const r = calcAnyRow(deps(), salaPisoT2, optByCodigo(salaPisoT2, "KIT-PB"));
    if (r?.kind !== "kit") throw new Error("esperava kit");
    expect(r.result.subItems[0]).toMatchObject({ qtd: 28.4, herdada: true });
    expect(r.result.subItems[1]?.qtd).toBeNull();
    expect(r.result.qtdPendente).toBe(true);
    expect(isRowPending(deps(), salaPisoT2, optByCodigo(salaPisoT2, "KIT-PB"), r)).toBe(true);
  });

  it("kit como PADRÃO credita os upgrades de material (antes deixava a linha sem preço)", () => {
    const kitOpt = optByCodigo(salaPisoT1, "KIT-PB");
    // Kit todo precificado: dá custo à "reserva técnica" que o seed deixa pendente.
    const rtBcn = seed.materiais.find((m) => m.codigo === "RT-9090-AC")!;
    const d = deps({ custosBase: comCusto(rtBcn.id, 50, 0) });
    const comp = { ...salaPisoT1, padrao: kitOpt.id };
    const r = calcAnyRow(d, comp, optByCodigo(salaPisoT1, "PP-6060-BI"));
    if (r?.kind !== "material") throw new Error("esperava material");
    // crédito = 208*18,4 + 115*2 + 50*1,84 (qtd líquida, sem RT)
    expect(r.result.creditoTotal).toBeCloseTo(208 * 18.4 + 115 * 2 + 50 * 1.84, 10);
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
    const preenchido = ambTotal(deps({ custosBase: comCusto(piso004.id, 310, 50) }), amb);
    expect(preenchido).toBeGreaterThan(semPendentes);
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

describe("padroesPendentes (aviso antes de publicar)", () => {
  // Sala/Living Piso da T1: padrão piso-001 + upgrades — o caso típico.
  const pad = salaPisoT1.options.find((o) => o.isDefault)!;
  const listados = (d: BudgetDeps) => padroesPendentes(d, seed.tipologias).map((p) => p.compId);

  it("lista o componente cujo padrão está pendente", () => {
    const d = deps({ custosBase: comCusto(pad.baseId, null, 0) });
    expect(listados(d)).toContain(salaPisoT1.id);
  });

  it("padrão marcado 'sem custo' não é aviso — é decisão", () => {
    const d = deps({ custosBase: comCusto(pad.baseId, 0, 0) });
    expect(listados(d)).not.toContain(salaPisoT1.id);
  });

  it("kit padrão com sub-item sem quantidade é aviso (credita a menos)", () => {
    const kitOpt = optByCodigo(salaPisoT1, "KIT-PB");
    const rtBcn = seed.materiais.find((m) => m.codigo === "RT-9090-AC")!;
    const custos = comCusto(rtBcn.id, 50, 0);
    const semQtd = (kitQtds: Record<number, number>) =>
      padroesPendentes(deps({ custosBase: custos }), [
        {
          ...t1,
          ambientes: [
            { ...t1.ambientes[0]!, componentes: [{ ...salaPisoT1, padrao: kitOpt.id, kitQtds }] },
          ],
        },
      ]).map((p) => p.compId);
    expect(semQtd(salaPisoT1.kitQtds)).toEqual([]);
    expect(semQtd({})).toEqual([salaPisoT1.id]); // soleira (und) sem de onde herdar
  });

  it("sem débito/crédito não avisa (não há crédito a perder)", () => {
    const d = deps({ custosBase: comCusto(pad.baseId, null, 0), usaDebitoCredito: false });
    expect(listados(d)).toEqual([]);
  });
});
