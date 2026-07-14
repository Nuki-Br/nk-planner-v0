import { describe, expect, it } from "vitest";

import { getMaterial } from "@/lib/data/entities";
import { createSeed } from "@/lib/data/seed";
import { TAX_COLUMNS_DEFAULT } from "@/shared/constants/budget";
import type { BudgetColumn, Componente, Kit, Material } from "@/shared/types/domain";

import {
  calcBudgetRow,
  calcKitRow,
  rowKey,
  type BudgetRowResult,
  type ColResult,
} from "./index";

const seed = createSeed();
const cols = TAX_COLUMNS_DEFAULT;

function mat(codigo: string): Material {
  const m = seed.materiais.find((x) => x.codigo === codigo);
  if (!m) throw new Error(`material ${codigo} não encontrado`);
  return m;
}

function kitByNome(nome: string): Kit {
  const k = seed.kits.find((x) => x.nome === nome);
  if (!k) throw new Error(`kit ${nome} não encontrado`);
  return k;
}

/** Material padrão (crédito) do componente, resolvido pela opção default. */
function padraoMat(c: Componente): Material | undefined {
  const def = c.options.find((o) => o.id === c.padrao);
  return getMaterial(seed.materiais, def?.baseId);
}

function findComp(predicate: (c: Componente, ambNome: string, tipNome: string) => boolean): Componente {
  for (const tip of seed.tipologias) {
    for (const amb of tip.ambientes) {
      const c = amb.componentes.find((x) => predicate(x, amb.nome, tip.nome));
      if (c) return c;
    }
  }
  throw new Error("componente não encontrado");
}

function col(r: { colResults: Record<string, ColResult> }, id: string | number): ColResult {
  const c = r.colResults[String(id)];
  if (!c) throw new Error(`coluna ${id} sem resultado`);
  return c;
}

function mustCalc(r: BudgetRowResult | null): BudgetRowResult {
  if (!r) throw new Error("esperava resultado de cálculo, veio null");
  return r;
}

const piso001 = mat("PO-6060-CR"); // padrão: 62.5 + 22 = 84.5
const piso002 = mat("PP-6060-BI"); // upgrade: 98 + 22 = 120

describe("calcBudgetRow (material)", () => {
  // T-M1 — Sala/Living Piso: qtd 18.40, rt 15, padrão piso-001, upgrade piso-002
  it("T-M1: linha com colunas padrão do projeto", () => {
    const r = mustCalc(calcBudgetRow(piso002, piso001, 18.4, 15, cols));
    expect(r.qtdComRT).toBeCloseTo(21.16, 10); // 18.4 * 1.15
    expect(r.valUnUpg).toBe(120);
    expect(r.valUnPad).toBe(84.5);
    expect(r.custoDeTroca).toBe(35.5);
    expect(col(r, 1).value).toBeCloseTo(2.84, 10); // custo_troca * 8%
    expect(col(r, 2).value).toBeCloseTo(1.775, 10); // custo_troca * 5%
    expect(col(r, 3).value).toBeCloseTo(26.4, 10); // valor_unitario * 22%
    expect(r.sumFree).toBeCloseTo(31.015, 10);
    expect(r.totalUnit).toBeCloseTo(66.515, 10);
    expect(r.total).toBeCloseTo(1407.4574, 4); // 66.515 * 21.16
  });

  // T-M2 — rowTotal/rowAvg somam/mediam APENAS as free à esquerda
  it("T-M2: rowTotal e rowAvg consideram só as colunas free à esquerda", () => {
    const colsComp: BudgetColumn[] = [
      cols[0]!,
      cols[1]!,
      { id: 101, nome: "Subtotal", kind: "rowTotal", expr: "", visivel: true },
      cols[2]!,
      { id: 102, nome: "Média", kind: "rowAvg", expr: "", visivel: true },
    ];
    const r = mustCalc(calcBudgetRow(piso002, piso001, 18.4, 15, colsComp));
    expect(col(r, 101).value).toBeCloseTo(4.615, 10); // 2.84 + 1.775 (tc3 à direita fora)
    expect(col(r, 101).computed).toBe(true);
    expect(col(r, 102).value).toBeCloseTo(31.015 / 3, 10); // média das 3 free
    expect(r.sumFree).toBeCloseTo(31.015, 10); // computadas não somam
  });

  // T-M3 — referência a coluna anterior por nome normalizado (inclusive computada)
  it("T-M3: colunas referenciam colunas anteriores pelo nome normalizado", () => {
    const colsRef: BudgetColumn[] = [
      cols[0]!, // Taxa Construtora → 2.84
      { id: 201, nome: "Dobro", kind: "free", expr: "=taxa_construtora * 2", visivel: true },
      { id: 202, nome: "Subtotal", kind: "rowTotal", expr: "", visivel: true },
      { id: 203, nome: "Mais um", kind: "free", expr: "=subtotal + 1", visivel: true },
    ];
    const r = mustCalc(calcBudgetRow(piso002, piso001, 18.4, 15, colsRef));
    expect(col(r, 201).value).toBeCloseTo(5.68, 10); // 2.84 * 2
    expect(col(r, 202).value).toBeCloseTo(8.52, 10); // 2.84 + 5.68
    expect(col(r, 203).value).toBeCloseTo(9.52, 10); // subtotal (computada) + 1
  });

  // T-M4 — override por célula (keyed por String(col.id))
  it("T-M4: override por célula substitui a expressão padrão da coluna", () => {
    const r = mustCalc(
      calcBudgetRow(piso002, piso001, 18.4, 15, cols, { [String(cols[0]!.id)]: "10" })
    );
    expect(col(r, 1).value).toBe(10);
    expect(col(r, 1).overridden).toBe(true);
    expect(col(r, 2).overridden).toBe(false);
    expect(r.sumFree).toBeCloseTo(10 + 1.775 + 26.4, 10);
  });

  // T-M5 — referência desconhecida
  it("T-M5: referência desconhecida vira erro na célula e 0 no escopo", () => {
    const colsErr: BudgetColumn[] = [
      { id: 301, nome: "Quebrada", kind: "free", expr: "=inexistente * 2", visivel: true },
      { id: 302, nome: "Dependente", kind: "free", expr: "=quebrada + 1", visivel: true },
    ];
    const r = mustCalc(calcBudgetRow(piso002, piso001, 18.4, 15, colsErr));
    expect(col(r, 301).error).toBe('coluna "inexistente" não encontrada');
    expect(col(r, 301).value).toBe(0);
    expect(col(r, 302).value).toBe(1); // quebrada = 0 no escopo
    expect(r.sumFree).toBe(1); // célula com erro não soma
  });

  // T-M6 — sem material padrão ou sem upgrade → null
  it("T-M6: retorna null sem material padrão ou sem upgrade", () => {
    const nicho = findComp((c) => c.nome === "Nicho");
    expect(nicho.padrao).toBeNull();
    expect(padraoMat(nicho)).toBeUndefined();
    expect(calcBudgetRow(piso002, padraoMat(nicho), nicho.qtd, nicho.rt, cols)).toBeNull();
    expect(calcBudgetRow(undefined, piso001, 1, 0, cols)).toBeNull();
  });
});

describe("calcKitRow (kit)", () => {
  const bronze = kitByNome("Metais Bronze"); // 4 itens, padrão met-001
  const barcelona = kitByNome("Piso Barcelona + Soleira + RT"); // 3 itens; rt-bcn pendente

  // Metais em Banheiro Social da t1: padrão met-001, qtd 1, rt 0, kitQtds [2,1,1,1]
  const metaisComp = seed.tipologias[0]!.ambientes[4]!.componentes.find((c) => c.nome === "Metais")!;
  // Piso da Sala/Living na t1: qtd 18.40, rt 15, kitQtds [18.4, 2, 1.84]
  const salaPisoT1 = seed.tipologias[0]!.ambientes[0]!.componentes[0]!;

  // T-K1 — agrega sub-itens e credita o padrão
  it("T-K1: agrega sub-itens e credita o padrão", () => {
    const r = calcKitRow(bronze, metaisComp, padraoMat(metaisComp), cols);
    expect(r.kitMaterialTotal).toBe(1240); // 170*2 + 520*1 + 280*1 + 100*1
    expect(r.qtdComRT).toBe(1);
    expect(r.padCredit).toBe(850); // met-001 (850) * 1
    expect(r.custoDeTroca).toBe(390); // 1240 - 850
    expect(col(r, 1).value).toBeCloseTo(31.2, 10); // custo_troca * 8%
    expect(col(r, 2).value).toBeCloseTo(19.5, 10); // custo_troca * 5%
    expect(col(r, 3).value).toBeCloseTo(272.8, 10); // valor_unitario (=kitMaterialTotal) * 22%
    expect(r.sumFree).toBeCloseTo(323.5, 10);
    expect(r.total).toBeCloseTo(713.5, 10); // custoDeTroca + sumFree (sem multiplicar por qtdComRT)
    expect(r.anyPending).toBe(false);
  });

  // T-K2 — kit NÃO multiplica por qtdComRT (extensão já está nos sub-itens)
  it("T-K2: total do kit não é multiplicado por qtdComRT", () => {
    const r = calcKitRow(barcelona, salaPisoT1, padraoMat(salaPisoT1), cols);
    // piso-bcn 208 * 18.40 + sol-bcn 115 * 2 + rt-bcn (pendente, 0) * 1.84
    expect(r.kitMaterialTotal).toBeCloseTo(4057.2, 10);
    expect(r.qtdComRT).toBeCloseTo(21.16, 10);
    expect(r.padCredit).toBeCloseTo(1788.02, 10); // 84.5 * 21.16
    expect(r.custoDeTroca).toBeCloseTo(2269.18, 10);
    expect(r.sumFree).toBeCloseTo(1187.5774, 4);
    expect(r.total).toBeCloseTo(3456.7574, 4); // custoDeTroca + sumFree
    expect(r.anyPending).toBe(true); // rt-bcn tem custoMat 0
    // prova da semântica: o total NÃO é (custoDeTroca + sumFree) * qtdComRT
    expect(r.total).not.toBeCloseTo((r.custoDeTroca + r.sumFree) * r.qtdComRT, 0);
  });

  // T-P1 — pendência é derivada do custo (custoMat <= 0), não mais de um Set
  it("T-P1: sub-item com custoMat <= 0 marca a linha como pendente", () => {
    const r = calcKitRow(barcelona, salaPisoT1, padraoMat(salaPisoT1), cols);
    const rtBcn = r.subItems.find((s) => s.item.nome === "Reserva Técnica Porcelanato Barcelona");
    expect(rtBcn?.item.custoMat).toBe(0);
    expect(rtBcn?.pending).toBe(true);
    expect(r.anyPending).toBe(true);

    // kit todo precificado → sem pendência; zerar um sub-item reintroduz a pendência
    expect(calcKitRow(bronze, metaisComp, padraoMat(metaisComp), cols).anyPending).toBe(false);
    const bronzeZerado: Kit = {
      ...bronze,
      itens: bronze.itens.map((it, i) => (i === 0 ? { ...it, custoMat: 0 } : it)),
    };
    const rz = calcKitRow(bronzeZerado, metaisComp, padraoMat(metaisComp), cols);
    expect(rz.subItems[0]?.pending).toBe(true);
    expect(rz.anyPending).toBe(true);
  });
});

describe("rowKey", () => {
  it("é o id da opção como string", () => {
    expect(rowKey(42)).toBe("42");
    const opt = seed.tipologias[0]!.ambientes[0]!.componentes[0]!.options[1]!;
    expect(rowKey(opt.id)).toBe(String(opt.id));
  });
});
