import { describe, expect, it } from "vitest";

import { createSeed } from "@/lib/data/seed";

import {
  applyPaste,
  fmtInput,
  initialDraft,
  metragemChanges,
  metragemGroups,
  parseQtd,
  parseRt,
} from "./metragens";

const seed = createSeed();
const tip = seed.tipologias[0]!;
const groups = metragemGroups(tip);
const rows = groups.flatMap((g) => g.rows);

describe("metragemGroups", () => {
  it("um grupo por ambiente, uma linha por componente, na ordem da planta", () => {
    expect(groups.map((g) => g.nome)).toEqual(tip.ambientes.map((a) => a.nome));
    expect(rows).toHaveLength(tip.ambientes.reduce((a, amb) => a + amb.componentes.length, 0));
    const primeiro = tip.ambientes[0]!.componentes[0]!;
    expect(rows[0]).toMatchObject({ componenteId: primeiro.id, qtd: primeiro.qtd, rt: primeiro.rt });
  });
});

describe("parse", () => {
  it("aceita vírgula, ponto de milhar e texto em volta", () => {
    expect(parseQtd("18,4")).toBe(18.4);
    expect(parseQtd("1.234,56")).toBe(1234.56);
    expect(parseQtd(" 12 ")).toBe(12);
    expect(parseQtd("0")).toBe(0);
  });
  it("quantidade vazia ou negativa é inválida; RT vazia vale 0", () => {
    expect(parseQtd("")).toBeNull();
    expect(parseQtd("abc")).toBeNull();
    expect(parseQtd("-3")).toBeNull();
    expect(parseRt("")).toBe(0);
    expect(parseRt("-1")).toBeNull();
  });
  it("fmtInput volta a string BR sem milhar", () => {
    expect(fmtInput(18.4)).toBe("18,4");
    expect(fmtInput(1234.5)).toBe("1234,5");
  });
});

describe("metragemChanges", () => {
  it("rascunho inicial não tem alteração", () => {
    expect(metragemChanges(groups, initialDraft(groups))).toEqual({ itens: [], invalidas: 0 });
  });

  it("só as linhas alteradas vão, com os dois valores", () => {
    const r = rows[0]!;
    const draft = { ...initialDraft(groups), [r.key]: { qtd: "99,5", rt: fmtInput(r.rt) } };
    expect(metragemChanges(groups, draft).itens).toEqual([
      { ambienteId: r.ambienteId, componenteId: r.componenteId, qtd: 99.5, rt: r.rt },
    ]);
  });

  it("mesmo valor escrito de outro jeito não conta como alteração", () => {
    const r = rows[0]!;
    const draft = { ...initialDraft(groups), [r.key]: { qtd: `${fmtInput(r.qtd)} `, rt: "" } };
    const esperado = r.rt === 0 ? [] : [expect.objectContaining({ rt: 0 })];
    expect(metragemChanges(groups, draft).itens).toEqual(esperado);
  });

  it("valor inválido conta e não é enviado", () => {
    const r = rows[1]!;
    const draft = { ...initialDraft(groups), [r.key]: { qtd: "", rt: "0" } };
    expect(metragemChanges(groups, draft)).toEqual({ itens: [], invalidas: 1 });
  });
});

describe("applyPaste", () => {
  const base = initialDraft(groups);

  it("texto de uma célula só não é tratado (colar normal do input)", () => {
    expect(applyPaste(rows, base, rows[0]!.key, "qtd", "12,5")).toBeNull();
  });

  it("uma coluna desce pelas linhas, atravessando ambientes", () => {
    const res = applyPaste(rows, base, rows[0]!.key, "qtd", "10\n20\n30\n");
    expect(res?.linhas).toBe(3);
    expect(rows.slice(0, 3).map((r) => res?.draft[r.key]?.qtd)).toEqual(["10", "20", "30"]);
    // RT intacta
    expect(res?.draft[rows[0]!.key]?.rt).toBe(base[rows[0]!.key]?.rt);
  });

  it("duas colunas a partir da Qtd preenchem Qtd e RT; a partir da RT só a RT", () => {
    const res = applyPaste(rows, base, rows[0]!.key, "qtd", "10\t5\n20\t8");
    expect(res?.draft[rows[1]!.key]).toEqual({ qtd: "20", rt: "8" });
    const soRt = applyPaste(rows, base, rows[0]!.key, "rt", "7\t99\n9");
    expect(soRt?.draft[rows[0]!.key]).toEqual({ qtd: base[rows[0]!.key]?.qtd, rt: "7" });
  });

  it("linha vazia pula a linha e o que passa do fim é ignorado", () => {
    const ultima = rows[rows.length - 1]!;
    const penultima = rows[rows.length - 2]!;
    const res = applyPaste(rows, base, penultima.key, "qtd", "1\n\n3\n4");
    expect(res?.linhas).toBe(1);
    expect(res?.draft[penultima.key]?.qtd).toBe("1");
    expect(res?.draft[ultima.key]?.qtd).toBe(base[ultima.key]?.qtd);
  });
});
