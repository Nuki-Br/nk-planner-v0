import { describe, expect, it } from "vitest";

import { getMaterial as findMaterial } from "@/lib/data/entities";
import { createSeed } from "@/lib/data/seed";
import { TAX_COLUMNS_DEFAULT } from "@/shared/constants/budget";
import type { BudgetColumn, Componente, Kit } from "@/shared/types/domain";

import {
  calcBudgetRow,
  calcKitRow,
  kitSubItemKey,
  upgradeKey,
  type BudgetRowResult,
  type ColResult,
  type GetMaterial,
} from "./index";

const seed = createSeed();
const resolve: GetMaterial = (id) => findMaterial(seed.materiais, id);
const cols = TAX_COLUMNS_DEFAULT;

function findComp(tipId: string, compId: string): Componente {
  for (const tip of seed.tipologias) {
    if (tip.id !== tipId) continue;
    for (const amb of tip.ambientes) {
      const comp = amb.componentes.find((c) => c.id === compId);
      if (comp) return comp;
    }
  }
  throw new Error(`componente ${compId} não encontrado em ${tipId}`);
}

function findKit(id: string): Kit {
  const kit = seed.kits.find((k) => k.id === id);
  if (!kit) throw new Error(`kit ${id} não encontrado`);
  return kit;
}

function col(r: { colResults: Record<string, ColResult> }, id: string): ColResult {
  const c = r.colResults[id];
  if (!c) throw new Error(`coluna ${id} sem resultado`);
  return c;
}

function mustCalc(r: BudgetRowResult | null): BudgetRowResult {
  if (!r) throw new Error("esperava resultado de cálculo, veio null");
  return r;
}

describe("calcBudgetRow (material)", () => {
  // T-M1 — c1-1-1 (qtd 18.40, rt 15, padrão piso-001) com upgrade piso-002
  it("T-M1: linha com colunas padrão do projeto", () => {
    const r = mustCalc(
      calcBudgetRow(resolve, resolve("piso-002"), "piso-001", 18.4, 15, cols)
    );
    expect(r.qtdComRT).toBeCloseTo(21.16, 10);
    expect(r.valUnUpg).toBe(120);
    expect(r.valUnPad).toBe(84.5);
    expect(r.custoDeTroca).toBe(35.5);
    expect(col(r, "tc1").value).toBeCloseTo(2.84, 10); // =custo_troca * 8%
    expect(col(r, "tc2").value).toBeCloseTo(1.775, 10); // =custo_troca * 5%
    expect(col(r, "tc3").value).toBeCloseTo(26.4, 10); // =valor_unitario * 22%
    expect(r.sumFree).toBeCloseTo(31.015, 10);
    expect(r.totalUnit).toBeCloseTo(66.515, 10);
    expect(r.total).toBeCloseTo(1407.4574, 4);
  });

  // T-M2 — rowTotal/rowAvg somam/média APENAS das free à esquerda
  it("T-M2: rowTotal e rowAvg consideram só as colunas free à esquerda", () => {
    const colsComComputadas: BudgetColumn[] = [
      cols[0]!,
      cols[1]!,
      { id: "st", nome: "Subtotal", kind: "rowTotal", expr: "", visivel: true },
      cols[2]!,
      { id: "md", nome: "Média", kind: "rowAvg", expr: "", visivel: true },
    ];
    const r = mustCalc(
      calcBudgetRow(resolve, resolve("piso-002"), "piso-001", 18.4, 15, colsComComputadas)
    );
    expect(col(r, "st").value).toBeCloseTo(4.615, 10); // 2.84 + 1.775 (tc3 à direita NÃO entra)
    expect(col(r, "st").computed).toBe(true);
    expect(col(r, "md").value).toBeCloseTo(31.015 / 3, 10); // média das 3 free
    // computadas não entram no sumFree
    expect(r.sumFree).toBeCloseTo(31.015, 10);
  });

  // T-M3 — referência a coluna anterior por nome (inclusive computada)
  it("T-M3: colunas referenciam colunas anteriores pelo nome normalizado", () => {
    const colsRef: BudgetColumn[] = [
      cols[0]!,
      { id: "x2", nome: "Dobro", kind: "free", expr: "=taxa_construtora * 2", visivel: true },
      { id: "st", nome: "Subtotal", kind: "rowTotal", expr: "", visivel: true },
      { id: "mais1", nome: "Mais um", kind: "free", expr: "=subtotal + 1", visivel: true },
    ];
    const r = mustCalc(
      calcBudgetRow(resolve, resolve("piso-002"), "piso-001", 18.4, 15, colsRef)
    );
    expect(col(r, "x2").value).toBeCloseTo(5.68, 10); // 2.84 * 2
    expect(col(r, "st").value).toBeCloseTo(8.52, 10); // 2.84 + 5.68
    expect(col(r, "mais1").value).toBeCloseTo(9.52, 10); // subtotal (computada) + 1
  });

  // T-M4 — override por célula
  it("T-M4: override por célula substitui a expressão padrão da coluna", () => {
    const r = mustCalc(
      calcBudgetRow(resolve, resolve("piso-002"), "piso-001", 18.4, 15, cols, { tc1: "10" })
    );
    expect(col(r, "tc1").value).toBe(10);
    expect(col(r, "tc1").overridden).toBe(true);
    expect(col(r, "tc2").overridden).toBe(false);
    expect(r.sumFree).toBeCloseTo(10 + 1.775 + 26.4, 10);
  });

  // T-M5 — referência desconhecida
  it("T-M5: referência desconhecida vira erro na célula e 0 no escopo", () => {
    const colsErr: BudgetColumn[] = [
      { id: "bad", nome: "Quebrada", kind: "free", expr: "=inexistente * 2", visivel: true },
      { id: "dep", nome: "Dependente", kind: "free", expr: "=quebrada + 1", visivel: true },
    ];
    const r = mustCalc(
      calcBudgetRow(resolve, resolve("piso-002"), "piso-001", 18.4, 15, colsErr)
    );
    expect(col(r, "bad").error).toBe('coluna "inexistente" não encontrada');
    expect(col(r, "bad").value).toBe(0);
    expect(col(r, "dep").value).toBe(1); // quebrada = 0 no escopo
    expect(r.sumFree).toBe(1); // célula com erro não soma
  });

  // T-M6 — sem padrão (c3-3-2 Nicho) → null
  it("T-M6: retorna null sem material padrão ou sem upgrade", () => {
    const nicho = findComp("t3", "c3-3-2");
    expect(nicho.padrao).toBeNull();
    expect(
      calcBudgetRow(resolve, resolve("piso-002"), nicho.padrao, nicho.qtd, nicho.rt, cols)
    ).toBeNull();
    expect(calcBudgetRow(resolve, undefined, "piso-001", 1, 0, cols)).toBeNull();
  });
});

describe("calcKitRow (kit)", () => {
  // T-K1 — kit-metais-bronze em c1-5-4 (padrão met-001, qtd 1, rt 0)
  it("T-K1: agrega sub-itens e credita o padrão", () => {
    const r = calcKitRow(resolve, findKit("kit-metais-bronze"), findComp("t1", "c1-5-4"), cols);
    expect(r.kitMaterialTotal).toBe(1240); // 170*2 + 520 + 280 + 100
    expect(r.qtdComRT).toBe(1);
    expect(r.padCredit).toBe(850);
    expect(r.custoDeTroca).toBe(390);
    expect(col(r, "tc1").value).toBeCloseTo(31.2, 10);
    expect(col(r, "tc2").value).toBeCloseTo(19.5, 10);
    expect(col(r, "tc3").value).toBeCloseTo(272.8, 10); // valor_unitario = kitMaterialTotal
    expect(r.sumFree).toBeCloseTo(323.5, 10);
    expect(r.total).toBeCloseTo(713.5, 10);
    expect(r.anyPending).toBe(false);
  });

  // T-K2 — kit NÃO multiplica por qtdComRT (extensão já está nos sub-itens)
  it("T-K2: total do kit não é multiplicado por qtdComRT", () => {
    const comp = findComp("t1", "c1-1-1"); // qtd 18.40, rt 15, padrão piso-001
    const r = calcKitRow(resolve, findKit("kit-piso-barcelona"), comp, cols);
    expect(r.kitMaterialTotal).toBeCloseTo(4388.4, 10); // 208*18.40 + 115*2 + 180*1.84
    expect(r.qtdComRT).toBeCloseTo(21.16, 10);
    expect(r.padCredit).toBeCloseTo(1788.02, 10); // 84.5 * 21.16
    expect(r.custoDeTroca).toBeCloseTo(2600.38, 10);
    expect(r.sumFree).toBeCloseTo(1303.4974, 4);
    expect(r.total).toBeCloseTo(3903.8774, 4);
    // prova da semântica: o total NÃO é (custoDeTroca + sumFree) * qtdComRT
    expect(r.total).not.toBeCloseTo((r.custoDeTroca + r.sumFree) * r.qtdComRT, 0);
  });

  // T-P1 — pendência por chave do Set e por custo zerado
  it("T-P1: sub-item pendente pela chave do Set ou por custoMat <= 0", () => {
    const pending = new Set(seed.pendingItems);
    const r = calcKitRow(
      resolve,
      findKit("kit-piso-barcelona"),
      findComp("t3", "c3-1-1"),
      cols,
      {},
      pending
    );
    const rtBcn = r.subItems.find((s) => s.mat.id === "rt-bcn");
    expect(rtBcn?.pending).toBe(true); // chave c3-1-1-kit-piso-barcelona-rt-bcn no Set
    expect(r.anyPending).toBe(true);

    // custoMat <= 0 marca pendente mesmo sem chave no Set
    const semCusto = (id: string) =>
      id === "met-b-001" ? { ...seed.materiais.find((m) => m.id === id)!, custoMat: 0 } : resolve(id);
    const r2 = calcKitRow(semCusto, findKit("kit-metais-bronze"), findComp("t1", "c1-5-4"), cols);
    expect(r2.subItems.find((s) => s.mat.id === "met-b-001")?.pending).toBe(true);
    expect(r2.anyPending).toBe(true);
  });
});

describe("pendência é contrato do chamador (T-P2)", () => {
  it("chaves em pendingItems excluem a linha da soma (como as telas fazem)", () => {
    const comp = findComp("t3", "c3-1-1"); // upgrades piso-002/003/004 (+ kit)
    const pending = new Set(seed.pendingItems);
    const upgrades = ["piso-002", "piso-003", "piso-004"];
    const totals = new Map(
      upgrades.map((id) => [
        id,
        calcBudgetRow(resolve, resolve(id), comp.padrao, comp.qtd, comp.rt, cols)?.total ?? 0,
      ])
    );
    const somaTotal = [...totals.values()].reduce((a, b) => a + b, 0);
    const somaSemPendentes = upgrades
      .filter((id) => !pending.has(upgradeKey(comp.id, id)))
      .reduce((a, id) => a + (totals.get(id) ?? 0), 0);

    expect(pending.has(upgradeKey(comp.id, "piso-004"))).toBe(true);
    expect(somaSemPendentes).toBeCloseTo(
      (totals.get("piso-002") ?? 0) + (totals.get("piso-003") ?? 0),
      10
    );
    expect(somaSemPendentes).toBeLessThan(somaTotal);
  });
});

describe("helpers de chave", () => {
  it("formatos idênticos aos do protótipo", () => {
    expect(upgradeKey("c3-1-1", "piso-004")).toBe("c3-1-1-piso-004");
    expect(kitSubItemKey("c3-1-1", "kit-piso-barcelona", "rt-bcn")).toBe(
      "c3-1-1-kit-piso-barcelona-rt-bcn"
    );
  });
});
