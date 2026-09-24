import { describe, expect, it } from "vitest";

import { createSeed } from "@/lib/data/seed";
import type { CustosBase, MaterialOption, PublishedPricing } from "@/shared/types/domain";

import {
  baseCostStatus,
  custoBaseOf,
  isBasePending,
  isOptionOwnPending,
  priceLookupFor,
  pricingOf,
  qtdOf,
  rowSideOf,
  rtOf,
  unidadeOf,
  valUnOf,
  type ResolveDeps,
} from "./resolve";

const seed = createSeed();

const deps = (extra?: Partial<ResolveDeps>): ResolveDeps => ({
  materiais: seed.materiais,
  kits: seed.kits,
  custosBase: seed.custosBase,
  pricings: {},
  ...extra,
});

const mat = (codigo: string) => {
  const m = seed.materiais.find((x) => x.codigo === codigo);
  if (!m) throw new Error(`material ${codigo} não encontrado`);
  return m;
};

const t1 = seed.tipologias[0]!;
const t3 = seed.tipologias[2]!;
const salaPisoT1 = t1.ambientes[0]!.componentes[0]!;
const salaPisoT3 = t3.ambientes[0]!.componentes[0]!;

function optByCodigo(codigo: string): MaterialOption {
  const base = mat(codigo);
  const opt = salaPisoT1.options.find((o) => o.baseId === base.id);
  if (!opt) throw new Error(`opção ${codigo} não encontrada`);
  return opt;
}

const piso002 = optByCodigo("PP-6060-BI"); // 98 + 22 = 120
const piso004 = optByCodigo("MC-NAT-CA"); // pendente no seed (custoMat 0)

/** Rascunho com um campo sobrescrito e o resto herdando. */
const pricing = (over: Partial<ReturnType<typeof pricingOf>>) => ({
  valorUnitario: null,
  qtd: null,
  rt: null,
  unidade: null,
  colunas: {},
  ...over,
});

describe("custo base do empreendimento", () => {
  it("soma material + mão de obra; ausente = 0", () => {
    expect(custoBaseOf(seed.custosBase, mat("PP-6060-BI").id)).toBeCloseTo(120, 10);
    expect(custoBaseOf(seed.custosBase, 999999)).toBe(0);
  });

  it("pendência olha o custo de MATERIAL, não o total", () => {
    // Um item com MO preenchida e material vazio segue pendente: falta a
    // cotação do material, que é o que a construtora precisa devolver.
    const soMO: CustosBase = { 1: { baseId: 1, custoMat: null, custoMO: 50, custoQtd: 1, composicao: [] } };
    expect(isBasePending(soMO, 1)).toBe(true);
    expect(isBasePending({}, 1)).toBe(true);
    expect(baseCostStatus(soMO, 1)).toBe("pendente");
  });

  it("'sem custo' (material 0 marcado) não é pendente e vale 0", () => {
    // Ex.: padrão "Não entregue" — zero decidido, não esquecido.
    const semCusto: CustosBase = { 1: { baseId: 1, custoMat: 0, custoMO: 0, custoQtd: 1, composicao: [] } };
    expect(isBasePending(semCusto, 1)).toBe(false);
    expect(custoBaseOf(semCusto, 1)).toBe(0);
    expect(baseCostStatus(semCusto, 1)).toBe("sem_custo");
    expect(baseCostStatus({ 1: { baseId: 1, custoMat: 10, custoMO: 0, custoQtd: 1, composicao: [] } }, 1)).toBe("preenchido");
  });

  it("composição entra no custo base: material × coeficiente + MO + Σ insumos", () => {
    // 100 × 1,2 (20 % de quebra) + 10 de MO + argamassa 1,5 × 8,00 = 142
    const comComposicao: CustosBase = {
      1: {
        baseId: 1,
        custoMat: 100,
        custoMO: 10,
        custoQtd: 1.2,
        composicao: [
          { id: 7, itemId: 3, codigo: "ARG-01", nome: "Argamassa", unidade: "kg", qtd: 1.5, preco: 8, ordem: 0 },
        ],
      },
    };
    expect(custoBaseOf(comComposicao, 1)).toBeCloseTo(142, 10);
    expect(isBasePending(comComposicao, 1)).toBe(false);
    expect(baseCostStatus(comComposicao, 1)).toBe("preenchido");
  });

  it("insumo da composição sem preço neste empreendimento é pendência", () => {
    // O material está cotado, mas a argamassa não: a linha não pode ir para o
    // total com uma parcela faltando — mesmo critério do sub-item de kit.
    const insumoPendente: CustosBase = {
      1: {
        baseId: 1,
        custoMat: 100,
        custoMO: 0,
        custoQtd: 1,
        composicao: [
          { id: 7, itemId: 3, codigo: null, nome: "Argamassa", unidade: "kg", qtd: 1.5, preco: null, ordem: 0 },
        ],
      },
    };
    expect(isBasePending(insumoPendente, 1)).toBe(true);
    expect(baseCostStatus(insumoPendente, 1)).toBe("pendente");
    expect(custoBaseOf(insumoPendente, 1)).toBe(100); // insumo pendente conta 0
  });
});

describe("cadeia override → herança", () => {
  it("sem rascunho, tudo herda", () => {
    const d = deps();
    expect(valUnOf(d, piso002)).toBeCloseTo(120, 10);
    expect(qtdOf(d, salaPisoT1, piso002.id)).toBe(salaPisoT1.qtd);
    expect(rtOf(d, salaPisoT1, piso002.id)).toBe(salaPisoT1.rt);
    expect(unidadeOf(d, salaPisoT1, piso002.id)).toBe(salaPisoT1.unidade);
  });

  it("cada campo é independente: sobrescrever qtd não congela a unidade", () => {
    const d = deps({ pricings: { [piso002.id]: pricing({ qtd: 42 }) } });
    expect(qtdOf(d, salaPisoT1, piso002.id)).toBe(42);
    expect(unidadeOf(d, salaPisoT1, piso002.id)).toBe(salaPisoT1.unidade);
    expect(valUnOf(d, piso002)).toBeCloseTo(120, 10);
  });

  it("override vale nas DUAS tipologias que compartilham o ambiente", () => {
    // A Sala é o mesmo Room em t1 e t3, com quantidades diferentes por planta.
    // O preço é um só por aplicação, então o override vence nas duas — é a
    // decisão de produto que motivou o refactor.
    expect(qtdOf(deps(), salaPisoT1, piso002.id)).not.toBe(
      qtdOf(deps(), salaPisoT3, piso002.id)
    );
    const d = deps({ pricings: { [piso002.id]: pricing({ qtd: 7 }) } });
    expect(qtdOf(d, salaPisoT1, piso002.id)).toBe(7);
    expect(qtdOf(d, salaPisoT3, piso002.id)).toBe(7);
  });

  it("valor unitário sobrescrito ignora o custo base e resolve a pendência", () => {
    expect(isOptionOwnPending(deps(), piso004)).toBe(true);
    const d = deps({ pricings: { [piso004.id]: pricing({ valorUnitario: 400 }) } });
    expect(valUnOf(d, piso004)).toBe(400);
    expect(isOptionOwnPending(d, piso004)).toBe(false);
  });

  it("override zerado é pendência: R$ 0,00 não é preço", () => {
    const d = deps({ pricings: { [piso002.id]: pricing({ valorUnitario: 0 }) } });
    expect(isOptionOwnPending(d, piso002)).toBe(true);
  });
});

describe("rowSideOf", () => {
  it("entrega ao motor os valores já efetivos", () => {
    const d = deps({ pricings: { [piso002.id]: pricing({ valorUnitario: 250, qtd: 10, rt: 5 }) } });
    expect(rowSideOf(d, salaPisoT1, piso002)).toEqual({
      valUn: 250,
      qtd: 10,
      rt: 5,
      pending: false,
    });
  });
});

describe("priceLookupFor", () => {
  it("cobre só os sub-itens dos kits ofertados — opções avulsas ficam de fora", () => {
    // Sala t3 oferta o kit Piso Barcelona (3 sub-itens) ao lado de pisos avulsos.
    const lookup = priceLookupFor(deps(), salaPisoT3);
    const kitPB = seed.kits.find((k) => k.codigo === "KIT-PB")!;
    for (const it of kitPB.itens) expect(lookup.has(it.materialId)).toBe(true);
    expect(lookup.get(mat("PB-9090-AC").id)?.valUn).toBeCloseTo(180 + 28, 10);
    // A opção avulsa resolve pelo rowSideOf (com override), não pelo lookup.
    expect(lookup.has(mat("PP-6060-BI").id)).toBe(false);
    // componente sem kit (Cozinha · Piso) → lookup vazio
    expect(priceLookupFor(deps(), t1.ambientes[1]!.componentes[0]!).size).toBe(0);
  });

  it("sub-item de kit sem custo base entra como pendente", () => {
    const kitComp = salaPisoT3;
    const lookup = priceLookupFor(deps(), kitComp);
    const rtBcn = mat("RT-9090-AC"); // Reserva Técnica Barcelona, sem custo no seed
    expect(lookup.get(rtBcn.id)?.pending).toBe(true);
  });
});

describe("publicado × rascunho", () => {
  it("mexer no custo base NÃO move o preço publicado", () => {
    // A garantia central do split: o publicado é um snapshot resolvido, não uma
    // expressão que recalcula. Aqui isso é estrutural — PublishedPricing não
    // referencia custosBase nem pricings.
    const publicado: PublishedPricing = {
      preco: 1670.99,
      valorUnitario: 120,
      qtd: 18.4,
      rt: 15,
      unidade: "m²",
      colunas: {},
      publicadoEm: "23/07/2026 10:00",
      versaoLabel: "v1",
    };
    const opt: MaterialOption = { ...piso002, publicado };

    const antes = valUnOf(deps(), opt);
    const depois = valUnOf(
      deps({ custosBase: { ...seed.custosBase, [opt.baseId]: { baseId: opt.baseId, custoMat: 999, custoMO: 0, custoQtd: 1, composicao: [] } } }),
      opt
    );
    expect(antes).not.toBe(depois); // o rascunho acompanha o custo base…
    expect(opt.publicado?.preco).toBe(1670.99); // …e o publicado não.
  });
});
