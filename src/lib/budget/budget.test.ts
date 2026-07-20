import { describe, expect, it } from "vitest";

import { getMaterial } from "@/lib/data/entities";
import { createSeed } from "@/lib/data/seed";
import { TAX_COLUMNS_DEFAULT } from "@/shared/constants/budget";
import type { BudgetColumn, Componente, Kit, Material } from "@/shared/types/domain";

import {
  calcBudgetRow,
  calcKitRow,
  columnsAffectedByExtendedConvention,
  rowKey,
  type BudgetRowResult,
  type ColResult,
  type CompCalcInput,
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

/** Componente sem satélites — o caso comum. */
const plain = (qtd: number, rt: number): CompCalcInput => ({
  qtd,
  rt,
  custoComponentes: [],
  custoQtds: {},
});

/** Materiais dos satélites "fixo" de um componente do seed. */
function satsOf(comp: Componente, override?: Map<number, Material>): Map<number, Material> {
  if (override) return override;
  const out = new Map<number, Material>();
  for (const cc of comp.custoComponentes) {
    if (cc.tipo !== "fixo" || cc.baseId == null) continue;
    const m = seed.materiais.find((x) => x.id === cc.baseId);
    if (m) out.set(cc.baseId, m);
  }
  return out;
}

function sat(r: BudgetRowResult, nome: string) {
  const s = r.satellites.find((x) => x.item.nome === nome);
  if (!s) throw new Error(`satélite ${nome} não encontrado`);
  return s;
}

describe("calcBudgetRow (material)", () => {
  // T-M1 — Sala/Living Piso: qtd 18.40, rt 15, padrão piso-001, upgrade piso-002
  it("T-M1: linha com colunas padrão do projeto (convenção estendida)", () => {
    const r = mustCalc(calcBudgetRow(piso002, piso001, plain(18.4, 15), new Map(), cols));
    expect(r.qtdComRT).toBeCloseTo(21.16, 10); // 18.4 * 1.15
    expect(r.valUnUpg).toBe(120);
    expect(r.valUnPad).toBe(84.5);
    expect(r.debitoExt).toBeCloseTo(2539.2, 10); // 120 * 21.16 (com RT)
    expect(r.creditoExt).toBeCloseTo(1554.8, 10); // 84.5 * 18.40 (SEM RT)
    expect(r.custoDeTroca).toBeCloseTo(984.4, 10); // 2539.2 - 1554.8
    expect(col(r, 1).value).toBeCloseTo(78.752, 10); // custo_troca * 8%
    expect(col(r, 2).value).toBeCloseTo(49.22, 10); // custo_troca * 5%
    expect(col(r, 3).value).toBeCloseTo(558.624, 10); // valor_unitario (=débito) * 22%
    expect(r.sumFree).toBeCloseTo(686.596, 10);
    expect(r.total).toBeCloseTo(1670.996, 4); // custo_troca + sumFree
    // prova da semântica: o total NÃO é re-multiplicado por qtdComRT
    expect(r.total).not.toBeCloseTo((r.custoDeTroca + r.sumFree) * r.qtdComRT, 0);
  });

  // T-M1b — a reserva técnica é perda do UPGRADE: só o débito a carrega
  it("T-M1b: crédito usa a quantidade líquida, débito usa a quantidade com RT", () => {
    const semRT = mustCalc(calcBudgetRow(piso002, piso001, plain(18.4, 0), new Map(), cols));
    const comRT = mustCalc(calcBudgetRow(piso002, piso001, plain(18.4, 15), new Map(), cols));
    expect(semRT.creditoExt).toBeCloseTo(comRT.creditoExt, 10); // crédito não muda com a RT
    expect(comRT.debitoExt).toBeGreaterThan(semRT.debitoExt); // débito muda
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
    const r = mustCalc(calcBudgetRow(piso002, piso001, plain(18.4, 15), new Map(), colsComp));
    expect(col(r, 101).value).toBeCloseTo(127.972, 10); // 78.752 + 49.22 (tc3 à direita fora)
    expect(col(r, 101).computed).toBe(true);
    expect(col(r, 102).value).toBeCloseTo(686.596 / 3, 10); // média das 3 free
    expect(r.sumFree).toBeCloseTo(686.596, 10); // computadas não somam
  });

  // T-M3 — referência a coluna anterior por nome normalizado (inclusive computada)
  it("T-M3: colunas referenciam colunas anteriores pelo nome normalizado", () => {
    const colsRef: BudgetColumn[] = [
      cols[0]!, // Taxa Construtora → 2.84
      { id: 201, nome: "Dobro", kind: "free", expr: "=taxa_construtora * 2", visivel: true },
      { id: 202, nome: "Subtotal", kind: "rowTotal", expr: "", visivel: true },
      { id: 203, nome: "Mais um", kind: "free", expr: "=subtotal + 1", visivel: true },
    ];
    const r = mustCalc(calcBudgetRow(piso002, piso001, plain(18.4, 15), new Map(), colsRef));
    expect(col(r, 201).value).toBeCloseTo(157.504, 10); // 78.752 * 2
    expect(col(r, 202).value).toBeCloseTo(236.256, 10); // 78.752 + 157.504
    expect(col(r, 203).value).toBeCloseTo(237.256, 10); // subtotal (computada) + 1
  });

  // T-M4 — override por célula (keyed por String(col.id))
  it("T-M4: override por célula é um valor PLANO da linha, não por unidade", () => {
    const r = mustCalc(
      calcBudgetRow(piso002, piso001, plain(18.4, 15), new Map(), cols, { [String(cols[0]!.id)]: "10" })
    );
    expect(col(r, 1).value).toBe(10);
    expect(col(r, 1).overridden).toBe(true);
    expect(col(r, 2).overridden).toBe(false);
    expect(r.sumFree).toBeCloseTo(10 + 49.22 + 558.624, 10);
    // R$ 10 entram no total como R$ 10 — antes viravam 10 * 21.16 = R$ 211,60
    expect(r.total).toBeCloseTo(984.4 + 617.844, 4);
  });

  // T-M5 — referência desconhecida
  it("T-M5: referência desconhecida vira erro na célula e 0 no escopo", () => {
    const colsErr: BudgetColumn[] = [
      { id: 301, nome: "Quebrada", kind: "free", expr: "=inexistente * 2", visivel: true },
      { id: 302, nome: "Dependente", kind: "free", expr: "=quebrada + 1", visivel: true },
    ];
    const r = mustCalc(calcBudgetRow(piso002, piso001, plain(18.4, 15), new Map(), colsErr));
    expect(col(r, 301).error).toBe('coluna "inexistente" não encontrada');
    expect(col(r, 301).value).toBe(0);
    expect(col(r, 302).value).toBe(1); // quebrada = 0 no escopo
    expect(r.sumFree).toBe(1); // célula com erro não soma
    expect(r.total).toBeCloseTo(985.4, 10); // custo_troca + 1
  });

  // T-M6 — sem material padrão ou sem upgrade → null
  it("T-M6: retorna null sem material padrão ou sem upgrade", () => {
    const nicho = findComp((c) => c.nome === "Nicho");
    expect(nicho.padrao).toBeNull();
    expect(padraoMat(nicho)).toBeUndefined();
    expect(calcBudgetRow(piso002, padraoMat(nicho), nicho, new Map(), cols)).toBeNull();
    expect(calcBudgetRow(undefined, piso001, plain(1, 0), new Map(), cols)).toBeNull();
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
    const r = calcKitRow(bronze, metaisComp, padraoMat(metaisComp), new Map(), cols);
    expect(r.debitoExt).toBe(1240); // 170*2 + 520*1 + 280*1 + 100*1
    expect(r.qtdComRT).toBe(1);
    expect(r.creditoExt).toBe(850); // met-001 (850) * 1
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
    const r = calcKitRow(barcelona, salaPisoT1, padraoMat(salaPisoT1), new Map(), cols);
    // piso-bcn 208 * 18.40 + sol-bcn 115 * 2 + rt-bcn (pendente, 0) * 1.84
    expect(r.debitoExt).toBeCloseTo(4057.2, 10);
    expect(r.qtdComRT).toBeCloseTo(21.16, 10);
    expect(r.creditoExt).toBeCloseTo(1554.8, 10); // 84.5 * 18.40 (SEM RT)
    expect(r.custoDeTroca).toBeCloseTo(2502.4, 10);
    expect(r.sumFree).toBeCloseTo(1217.896, 4);
    expect(r.total).toBeCloseTo(3720.296, 4); // custoDeTroca + sumFree
    expect(r.anyPending).toBe(true); // rt-bcn tem custoMat 0
    // prova da semântica: o total NÃO é (custoDeTroca + sumFree) * qtdComRT
    expect(r.total).not.toBeCloseTo((r.custoDeTroca + r.sumFree) * r.qtdComRT, 0);
  });

  // T-P1 — pendência é derivada do custo (custoMat <= 0), não mais de um Set
  it("T-P1: sub-item com custoMat <= 0 marca a linha como pendente", () => {
    const r = calcKitRow(barcelona, salaPisoT1, padraoMat(salaPisoT1), new Map(), cols);
    const rtBcn = r.subItems.find((s) => s.item.nome === "Reserva Técnica Porcelanato Barcelona");
    expect(rtBcn?.item.custoMat).toBe(0);
    expect(rtBcn?.pending).toBe(true);
    expect(r.anyPending).toBe(true);

    // kit todo precificado → sem pendência; zerar um sub-item reintroduz a pendência
    expect(calcKitRow(bronze, metaisComp, padraoMat(metaisComp), new Map(), cols).anyPending).toBe(false);
    const bronzeZerado: Kit = {
      ...bronze,
      itens: bronze.itens.map((it, i) => (i === 0 ? { ...it, custoMat: 0 } : it)),
    };
    const rz = calcKitRow(bronzeZerado, metaisComp, padraoMat(metaisComp), new Map(), cols);
    expect(rz.subItems[0]?.pending).toBe(true);
    expect(rz.anyPending).toBe(true);
  });
});

// Fixture do Hall — planilha do cliente (Maison Diogo 166m², linhas 41-57).
// PISO é UMA escolha para o cliente; no custo carrega Soleira (espelho),
// Rodapé (fixo) e, no lado padrão, Rodapé Munari RS + 2 Soleiras de granito.
describe("componentes de custo (Hall)", () => {
  const hall = findComp((c, amb) => amb === "Hall" && c.nome === "Piso");
  const sats = satsOf(hall);
  const upgrades = hall.options.filter((o) => !o.isDefault);
  const calc = (baseId: number, mats = sats) =>
    mustCalc(
      calcBudgetRow(
        seed.materiais.find((m) => m.id === baseId),
        padraoMat(hall),
        hall,
        mats,
        cols
      )
    );
  const bcn = calc(mat("MS-BCN-120").id);

  // H51 = SUM(G51 + G52 + $G$57) − $H$41
  it("reproduz o custo de troca da planilha", () => {
    expect(bcn.qtdComRT).toBeCloseTo(3.375, 10); // 2,25 × 1,50
    expect(bcn.debitoExt).toBeCloseTo(1998.915, 6); // 1106,217 + 327,768 + 564,93
    expect(bcn.creditoExt).toBeCloseTo(826.2175, 6); // H41 = SUM(G41:G44)
    expect(bcn.custoDeTroca).toBeCloseTo(1172.6975, 6);
    expect(col(bcn, 1).value).toBeCloseTo(93.8158, 6); // 8% (o projeto usa 8%, a planilha 10%)
    expect(bcn.total).toBeCloseTo(bcn.custoDeTroca + bcn.sumFree, 10);
    // não re-multiplica
    expect(bcn.total).not.toBeCloseTo((bcn.custoDeTroca + bcn.sumFree) * bcn.qtdComRT, 0);
  });

  it("o crédito do grupo soma os satélites do lado padrão", () => {
    // 157,83×2,25 (piso, SEM RT) + 56,60×5 (rodapé RS) + 94,05×2 (soleiras)
    expect(bcn.creditoExt).toBeCloseTo(157.83 * 2.25 + 56.6 * 5 + 94.05 * 2, 6);
    expect(sat(bcn, "Rodapé Munari RS").line).toBeCloseTo(283, 6);
    expect(sat(bcn, "Soleiras Granito").line).toBeCloseTo(188.1, 6);
  });

  it("espelho acompanha a opção; fixo é o mesmo em todas", () => {
    for (const opt of upgrades) {
      const r = calc(opt.baseId);
      // soleira: mesmo valor unitário da opção escolhida, 1 und
      expect(sat(r, "Soleira").valUn).toBeCloseTo(r.valUnUpg, 10);
      expect(sat(r, "Soleira").line).toBeCloseTo(r.valUnUpg, 10);
      // rodapé: a referência absoluta $G$57 — idêntico em toda opção
      expect(sat(r, "Rodapé").line).toBeCloseTo(564.93, 6);
    }
    // e as opções realmente têm valores unitários diferentes
    const vals = upgrades.map((o) => calc(o.baseId).valUnUpg);
    expect(new Set(vals).size).toBe(upgrades.length);
  });

  it("satélite fixo sem custo torna TODAS as opções pendentes", () => {
    const rodape = mat("RDP-466-SL");
    const semCusto = new Map(sats);
    semCusto.set(rodape.id, { ...rodape, custoMat: 0, custoMO: 0 });
    for (const opt of upgrades) {
      expect(calc(opt.baseId, semCusto).anyPending).toBe(true);
    }
    // com custo, nenhuma pendência
    for (const opt of upgrades) expect(calc(opt.baseId).anyPending).toBe(false);
  });
});

describe("columnsAffectedByExtendedConvention", () => {
  const c = (id: number, expr: string, kind: BudgetColumn["kind"] = "free"): BudgetColumn => ({
    id,
    nome: `c${id}`,
    kind,
    expr,
    visivel: true,
  });

  it("não sinaliza colunas homogêneas de grau 1 (o fator distribui)", () => {
    const cols = [c(1, "=custo_troca * 8%"), c(2, "=taxa_construtora * 2"), c(3, "=custo_troca/4")];
    expect(columnsAffectedByExtendedConvention(cols)).toEqual([]);
  });

  it("sinaliza literal aditivo — antes valia por unidade, agora vale pela linha", () => {
    const cols = [c(1, "150"), c(2, "=custo_troca * 8% + 50"), c(3, "=custo_troca * 8%")];
    expect(columnsAffectedByExtendedConvention(cols).map((x) => x.id)).toEqual([1, 2]);
  });

  it("ignora colunas calculadas e vazias", () => {
    const cols = [c(1, "", "rowTotal"), c(2, "150", "rowAvg"), c(3, "")];
    expect(columnsAffectedByExtendedConvention(cols)).toEqual([]);
  });
});

describe("rowKey", () => {
  it("é o id da opção como string", () => {
    expect(rowKey(42)).toBe("42");
    const opt = seed.tipologias[0]!.ambientes[0]!.componentes[0]!.options[1]!;
    expect(rowKey(opt.id)).toBe(String(opt.id));
  });
});
