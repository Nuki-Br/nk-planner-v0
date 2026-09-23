import { describe, expect, it } from "vitest";

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
  type PriceLookup,
  type PricedEntity,
  type RowSide,
} from "./index";

const seed = createSeed();
const cols = TAX_COLUMNS_DEFAULT;

function mat(codigo: string): Material {
  const m = seed.materiais.find((x) => x.codigo === codigo);
  if (!m) throw new Error(`material ${codigo} não encontrado`);
  return m;
}

/** Custo base do material no empreendimento do seed (material + mão de obra). */
function custo(m: Material): number {
  const c = seed.custosBase[m.id];
  return c ? (c.custoMat ?? 0) + c.custoMO : 0;
}

/**
 * Lado do cálculo montado a partir de um material do seed — no app quem faz
 * isso é features/budget/resolve.ts; aqui o motor recebe pronto, que é o
 * contrato dele.
 */
function side(m: Material | undefined, qtd: number, rt = 0): RowSide | null {
  if (!m) return null;
  const c = seed.custosBase[m.id];
  return { valUn: custo(m), qtd, rt, pending: !c || c.custoMat === null };
}

/** PricedEntity a partir de um material do seed (custo do empreendimento). */
function priced(m: Material, valUn = custo(m)): PricedEntity {
  return { nome: m.nome, valUn, pending: valUn <= 0 };
}

/** Preços dos sub-itens de um kit, keyed por BaseMaterial. */
function kitPrices(kit: Kit, overrides: Record<number, number> = {}): PriceLookup {
  const out = new Map<number, PricedEntity>();
  for (const it of kit.itens) {
    const m = seed.materiais.find((x) => x.id === it.materialId)!;
    out.set(it.materialId, priced(m, overrides[it.materialId] ?? custo(m)));
  }
  return out;
}

function kitByNome(nome: string): Kit {
  const k = seed.kits.find((x) => x.nome === nome);
  if (!k) throw new Error(`kit ${nome} não encontrado`);
  return k;
}

/** Lado padrão (crédito) do componente, resolvido pela opção default. */
function padraoSide(c: Componente, qtd = c.qtd): RowSide | null {
  const def = c.options.find((o) => o.id === c.padrao);
  const m = seed.materiais.find((x) => x.id === def?.baseId);
  return side(m, qtd);
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

/** Componente sem satélites — o caso comum. Quantidade agora vive no RowSide. */
const plain = (): CompCalcInput => ({ custoComponentes: [] });

/** Preços dos satélites "fixo" de um componente do seed. */
function satsOf(comp: Componente, override?: PriceLookup): PriceLookup {
  if (override) return override;
  const out = new Map<number, PricedEntity>();
  for (const cc of comp.custoComponentes) {
    if (cc.tipo !== "fixo" || cc.baseId == null) continue;
    const m = seed.materiais.find((x) => x.id === cc.baseId);
    if (m) out.set(cc.baseId, priced(m));
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
    const r = mustCalc(calcBudgetRow(side(piso002, 18.4, 15)!, side(piso001, 18.4), plain(), new Map(), cols, null, null));
    expect(r.qtdComRT).toBeCloseTo(21.16, 10); // 18.4 * 1.15
    expect(r.valUnUpg).toBe(120);
    expect(r.valUnPad).toBe(84.5);
    expect(r.debitoTotal).toBeCloseTo(2539.2, 10); // 120 * 21.16 (com RT)
    expect(r.creditoTotal).toBeCloseTo(1554.8, 10); // 84.5 * 18.40 (SEM RT)
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
    const semRT = mustCalc(calcBudgetRow(side(piso002, 18.4, 0)!, side(piso001, 18.4), plain(), new Map(), cols, null, null));
    const comRT = mustCalc(calcBudgetRow(side(piso002, 18.4, 15)!, side(piso001, 18.4), plain(), new Map(), cols, null, null));
    expect(semRT.creditoTotal).toBeCloseTo(comRT.creditoTotal, 10); // crédito não muda com a RT
    expect(comRT.debitoTotal).toBeGreaterThan(semRT.debitoTotal); // débito muda
  });

  // T-M1c — empreendimento sem débito/crédito: o crédito zera, então o
  // "Custo total" (custoDeTroca) passa a ser o próprio débito estendido.
  it("T-M1c: sem débito/crédito, custoDeTroca = debitoTotal e crédito = 0", () => {
    const comDC = mustCalc(calcBudgetRow(side(piso002, 18.4, 15)!, side(piso001, 18.4), plain(), new Map(), cols, null, null));
    const semDC = mustCalc(
      calcBudgetRow(side(piso002, 18.4, 15)!, side(piso001, 18.4), plain(), new Map(), cols, null, null, {}, false)
    );
    expect(semDC.debitoTotal).toBeCloseTo(comDC.debitoTotal, 10); // débito não muda
    expect(semDC.creditoTotal).toBe(0);
    expect(semDC.custoDeTroca).toBeCloseTo(semDC.debitoTotal, 10); // = débito
    // colunas livres que usam custo_troca acompanham o novo valor
    expect(col(semDC, 1).value).toBeCloseTo(semDC.debitoTotal * 0.08, 10); // custo_troca * 8%
    expect(semDC.total).toBeCloseTo(semDC.custoDeTroca + semDC.sumFree, 10);
  });

  // T-M2 — não existe mais coluna calculada: um subtotal é uma coluna comum com
  // fórmula explícita, e por isso ENTRA no sumFree (as antigas rowTotal não).
  it("T-M2: subtotal é uma coluna comum e entra no sumFree", () => {
    const colsComp: BudgetColumn[] = [
      cols[0]!,
      cols[1]!,
      {
        id: 101,
        nome: "Subtotal",
        expr: "=taxa_construtora + contingencia_incc",
        visivel: true,
      },
    ];
    const r = mustCalc(calcBudgetRow(side(piso002, 18.4, 15)!, side(piso001, 18.4), plain(), new Map(), colsComp, null, null));
    expect(col(r, 101).value).toBeCloseTo(127.972, 10); // 78.752 + 49.22
    expect(r.sumFree).toBeCloseTo(78.752 + 49.22 + 127.972, 10);
  });

  // T-M3 — referência a coluna anterior por nome normalizado
  it("T-M3: colunas referenciam colunas anteriores pelo nome normalizado", () => {
    const colsRef: BudgetColumn[] = [
      cols[0]!, // Taxa Construtora → 78.752
      { id: 201, nome: "Dobro", expr: "=taxa_construtora * 2", visivel: true },
      { id: 202, nome: "Subtotal", expr: "=taxa_construtora + dobro", visivel: true },
      { id: 203, nome: "Mais um", expr: "=subtotal + 1", visivel: true },
    ];
    const r = mustCalc(calcBudgetRow(side(piso002, 18.4, 15)!, side(piso001, 18.4), plain(), new Map(), colsRef, null, null));
    expect(col(r, 201).value).toBeCloseTo(157.504, 10); // 78.752 * 2
    expect(col(r, 202).value).toBeCloseTo(236.256, 10); // 78.752 + 157.504
    expect(col(r, 203).value).toBeCloseTo(237.256, 10); // subtotal + 1
  });

  // T-M4 — override por célula (keyed por String(col.id))
  it("T-M4: override por célula é um valor PLANO da linha, não por unidade", () => {
    const r = mustCalc(
      calcBudgetRow(side(piso002, 18.4, 15)!, side(piso001, 18.4), plain(), new Map(), cols, null, null, { [String(cols[0]!.id)]: "10" })
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
      { id: 301, nome: "Quebrada", expr: "=inexistente * 2", visivel: true },
      { id: 302, nome: "Dependente", expr: "=quebrada + 1", visivel: true },
    ];
    const r = mustCalc(calcBudgetRow(side(piso002, 18.4, 15)!, side(piso001, 18.4), plain(), new Map(), colsErr, null, null));
    expect(col(r, 301).error).toBe('coluna "inexistente" não encontrada');
    expect(col(r, 301).value).toBe(0);
    expect(col(r, 302).value).toBe(1); // quebrada = 0 no escopo
    expect(r.sumFree).toBe(1); // célula com erro não soma
    expect(r.total).toBeCloseTo(985.4, 10); // custo_troca + 1
  });

  // T-M6 — sem material padrão → null (não há crédito a calcular)
  it("T-M6: retorna null sem material padrão", () => {
    const nicho = findComp((c) => c.nome === "Nicho");
    expect(nicho.padrao).toBeNull();
    expect(padraoSide(nicho)).toBeNull();
    expect(calcBudgetRow(side(piso002, 1)!, padraoSide(nicho), nicho, new Map(), cols, null, null)).toBeNull();
  });

  // T-M7 — upgrade mais barato que o padrão: o crédito abate no máximo o débito
  it("T-M7: custo de troca e preço travam em zero (nunca negativos)", () => {
    // Invertido: "upgrade" piso-001 (84.5) sobre "padrão" piso-002 (120).
    const r = mustCalc(calcBudgetRow(side(piso001, 18.4)!, side(piso002, 18.4), plain(), new Map(), cols, null, null));
    expect(r.debitoTotal).toBeCloseTo(1554.8, 10);
    expect(r.creditoTotal).toBeCloseTo(2208, 10);
    expect(r.custoDeTroca).toBe(0); // seria −653,20
    expect(col(r, 1).value).toBe(0); // custo_troca * 8% acompanha a trava
    expect(r.total).toBeGreaterThanOrEqual(0);

    // Coluna livre que não parte de custo_troca não fura a trava final.
    const colsNeg: BudgetColumn[] = [{ id: 401, nome: "Dif", expr: "=debito - credito", visivel: true }];
    const n = mustCalc(calcBudgetRow(side(piso001, 18.4)!, side(piso002, 18.4), plain(), new Map(), colsNeg, null, null));
    expect(col(n, 401).value).toBeCloseTo(-653.2, 10);
    expect(n.total).toBe(0);
  });

  // T-M8 — padrão "sem custo" (ex.: "Não entregue"): crédito zero, upgrade cheio
  it("T-M8: padrão sem custo credita zero e o upgrade sai pelo débito", () => {
    const naoEntregue: RowSide = { valUn: 0, qtd: 18.4, rt: 0, pending: false };
    const r = mustCalc(calcBudgetRow(side(piso002, 18.4, 15)!, naoEntregue, plain(), new Map(), cols, null, null));
    expect(r.creditoTotal).toBe(0);
    expect(r.custoDeTroca).toBeCloseTo(r.debitoTotal, 10);
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
    const r = calcKitRow(bronze, metaisComp, { qtd: metaisComp.qtd, rt: metaisComp.rt }, padraoSide(metaisComp), kitPrices(bronze), cols, null, null);
    expect(r.debitoTotal).toBe(1240); // 170*2 + 520*1 + 280*1 + 100*1
    expect(r.qtdComRT).toBe(1);
    expect(r.creditoTotal).toBe(850); // met-001 (850) * 1
    expect(r.custoDeTroca).toBe(390); // 1240 - 850
    expect(col(r, 1).value).toBeCloseTo(31.2, 10); // custo_troca * 8%
    expect(col(r, 2).value).toBeCloseTo(19.5, 10); // custo_troca * 5%
    expect(col(r, 3).value).toBeCloseTo(272.8, 10); // valor_unitario (=kitMaterialTotal) * 22%
    expect(r.sumFree).toBeCloseTo(323.5, 10);
    expect(r.total).toBeCloseTo(713.5, 10); // custoDeTroca + sumFree (sem multiplicar por qtdComRT)
    expect(r.subItemPending).toBe(false);
  });

  // T-K2 — kit NÃO multiplica por qtdComRT (extensão já está nos sub-itens)
  it("T-K2: total do kit não é multiplicado por qtdComRT", () => {
    const r = calcKitRow(barcelona, salaPisoT1, { qtd: salaPisoT1.qtd, rt: salaPisoT1.rt }, padraoSide(salaPisoT1), kitPrices(barcelona), cols, null, null);
    // piso-bcn 208 * 18.40 + sol-bcn 115 * 2 + rt-bcn (pendente, 0) * 1.84
    expect(r.debitoTotal).toBeCloseTo(4057.2, 10);
    expect(r.qtdComRT).toBeCloseTo(21.16, 10);
    expect(r.creditoTotal).toBeCloseTo(1554.8, 10); // 84.5 * 18.40 (SEM RT)
    expect(r.custoDeTroca).toBeCloseTo(2502.4, 10);
    expect(r.sumFree).toBeCloseTo(1217.896, 4);
    expect(r.total).toBeCloseTo(3720.296, 4); // custoDeTroca + sumFree
    expect(r.subItemPending).toBe(true); // rt-bcn tem custoMat 0
    // prova da semântica: o total NÃO é (custoDeTroca + sumFree) * qtdComRT
    expect(r.total).not.toBeCloseTo((r.custoDeTroca + r.sumFree) * r.qtdComRT, 0);
  });

  // T-P1 — pendência é derivada do custo (custoMat <= 0), não mais de um Set
  it("T-P1: sub-item sem custo base marca a linha como pendente", () => {
    const r = calcKitRow(barcelona, salaPisoT1, { qtd: salaPisoT1.qtd, rt: salaPisoT1.rt }, padraoSide(salaPisoT1), kitPrices(barcelona), cols, null, null);
    const rtBcn = r.subItems.find((s) => s.item.nome === "Reserva Técnica Porcelanato Barcelona");
    expect(rtBcn?.valUn).toBe(0);
    expect(rtBcn?.pending).toBe(true);
    expect(r.subItemPending).toBe(true);

    // kit todo precificado → sem pendência; zerar um sub-item reintroduz a pendência
    expect(
      calcKitRow(bronze, metaisComp, { qtd: metaisComp.qtd, rt: metaisComp.rt }, padraoSide(metaisComp), kitPrices(bronze), cols, null, null)
        .subItemPending
    ).toBe(false);
    // Zerar o custo BASE de um sub-item reintroduz a pendência: o kit não tem
    // custo próprio, quem tem é o material filho.
    const primeiro = bronze.itens[0]!;
    const rz = calcKitRow(
      bronze,
      metaisComp,
      { qtd: metaisComp.qtd, rt: metaisComp.rt },
      padraoSide(metaisComp),
      kitPrices(bronze, { [primeiro.materialId]: 0 }),
      cols,
      null,
      null
    );
    expect(rz.subItems[0]?.pending).toBe(true);
    expect(rz.subItemPending).toBe(true);
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
        side(seed.materiais.find((m) => m.id === baseId), hall.qtd, hall.rt)!,
        padraoSide(hall),
        hall,
        mats,
        cols,
        null,
        null
      )
    );
  const bcn = calc(mat("MS-BCN-120").id);

  // H51 = SUM(G51 + G52 + $G$57) − $H$41
  it("reproduz o custo de troca da planilha", () => {
    expect(bcn.qtdComRT).toBeCloseTo(3.375, 10); // 2,25 × 1,50
    expect(bcn.debitoTotal).toBeCloseTo(1998.915, 6); // 1106,217 + 327,768 + 564,93
    expect(bcn.creditoTotal).toBeCloseTo(826.2175, 6); // H41 = SUM(G41:G44)
    expect(bcn.custoDeTroca).toBeCloseTo(1172.6975, 6);
    expect(col(bcn, 1).value).toBeCloseTo(93.8158, 6); // 8% (o projeto usa 8%, a planilha 10%)
    expect(bcn.total).toBeCloseTo(bcn.custoDeTroca + bcn.sumFree, 10);
    // não re-multiplica
    expect(bcn.total).not.toBeCloseTo((bcn.custoDeTroca + bcn.sumFree) * bcn.qtdComRT, 0);
  });

  // debitoItem é G51 (só o item); debitoTotal é H51, que soma os satélites e é o
  // que a coluna "Déb./Créd." exibe na linha-pai.
  it("débito do item é qtd × valor unitário; total soma os satélites", () => {
    expect(bcn.debitoItem).toBeCloseTo(1106.217, 6); // 327,768 × 3,375
    expect(bcn.debitoItem).toBeCloseTo(bcn.valUnUpg * bcn.qtdComRT, 6);
    // o total é o item + soleira (327,768) + rodapé (564,93)
    expect(bcn.debitoTotal).toBeCloseTo(bcn.debitoItem + 327.768 + 564.93, 6);
    expect(bcn.debitoTotal).toBeGreaterThan(bcn.debitoItem);
  });

  it("crédito do item é qtd líquida × valor unitário, sem os satélites", () => {
    expect(bcn.creditoItem).toBeCloseTo(355.1175, 6); // 157,83 × 2,25
    expect(bcn.creditoTotal).toBeCloseTo(826.2175, 6); // + 283 + 188,10
  });

  it("o crédito do grupo soma os satélites do lado padrão", () => {
    // 157,83×2,25 (piso, SEM RT) + 56,60×5 (rodapé RS) + 94,05×2 (soleiras)
    expect(bcn.creditoTotal).toBeCloseTo(157.83 * 2.25 + 56.6 * 5 + 94.05 * 2, 6);
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
    semCusto.set(rodape.id, priced(rodape, 0));
    for (const opt of upgrades) {
      expect(calc(opt.baseId, semCusto).satellitePending).toBe(true);
    }
    // com custo, nenhuma pendência
    for (const opt of upgrades) expect(calc(opt.baseId).satellitePending).toBe(false);
  });
});

// Escopo do item de custo: avulso (materialOptionId) só entra na sua opção;
// materialOptionId null vale para todas.
describe("escopo do item de custo (avulso vs todas as opções)", () => {
  const RODAPE_BASE = 999999; // baseId de fabricação, sem custo → fixo pendente
  const item = (
    materialOptionId: number | null,
    tipo: "espelho" | "fixo",
    lado: "padrao" | "upgrade" = "upgrade"
  ): Componente["custoComponentes"][number] => ({
    id: 1,
    nome: tipo === "fixo" ? "RodapéAvulso" : "SoleiraAvulsa",
    tipo,
    baseId: tipo === "fixo" ? RODAPE_BASE : null,
    materialOptionId,
    unidade: "und",
    lado,
    qtd: 2,
    ordem: 0,
  });
  const comp = (cc: Componente["custoComponentes"][number]): CompCalcInput => ({
    custoComponentes: [cc],
  });
  const OPT_A = 500;
  const OPT_B = 700;

  it("espelho avulso entra só na opção presa", () => {
    // preso a OPT_A: aparece quando a linha é OPT_A…
    const naOpcao = mustCalc(
      calcBudgetRow(side(piso002, 10)!, side(piso001, 10), comp(item(OPT_A, "espelho")), new Map(), cols, OPT_A, null)
    );
    expect(naOpcao.satellites).toHaveLength(1);
    // espelho: valUn = valUnUpg (120), qtd 2 → 240
    expect(naOpcao.satellites[0]!.valUn).toBeCloseTo(naOpcao.valUnUpg, 10);
    expect(naOpcao.satellites[0]!.line).toBeCloseTo(naOpcao.valUnUpg * 2, 10);
    // …e some numa outra opção
    const outraOpcao = mustCalc(
      calcBudgetRow(side(piso002, 10)!, side(piso001, 10), comp(item(OPT_A, "espelho")), new Map(), cols, OPT_B, null)
    );
    expect(outraOpcao.satellites).toHaveLength(0);
  });

  it("materialOptionId null entra em qualquer opção", () => {
    for (const optId of [OPT_A, OPT_B]) {
      const r = mustCalc(
        calcBudgetRow(side(piso002, 10)!, side(piso001, 10), comp(item(null, "espelho")), new Map(), cols, optId, null)
      );
      expect(r.satellites).toHaveLength(1);
    }
  });

  it("fixo avulso pendente derruba SÓ a sua opção", () => {
    const cc = item(OPT_A, "fixo"); // sem custo em satelliteMats → pendente
    // na opção presa: presente e pendente
    const naOpcao = mustCalc(
      calcBudgetRow(side(piso002, 10)!, side(piso001, 10), comp(cc), new Map(), cols, OPT_A, null)
    );
    expect(naOpcao.satellitePending).toBe(true);
    // em outra opção: nem aparece → não derruba a linha
    const outraOpcao = mustCalc(
      calcBudgetRow(side(piso002, 10)!, side(piso001, 10), comp(cc), new Map(), cols, OPT_B, null)
    );
    expect(outraOpcao.satellites).toHaveLength(0);
    expect(outraOpcao.satellitePending).toBe(false);
  });
});

describe("columnsAffectedByExtendedConvention", () => {
  const c = (id: number, expr: string): BudgetColumn => ({
    id,
    nome: `c${id}`,
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

  it("ignora colunas vazias", () => {
    const cols = [c(1, ""), c(2, "   "), c(3, "")];
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
