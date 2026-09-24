import { describe, expect, it } from "vitest";

import { looksTabular, parseNumberCell, parseTsv } from "./compositionPaste";

// Linhas da planilha de composição da construtora (BIOOS): Cód · Nome ·
// Unidade · Qtd · Valor, coladas direto do Excel (tab entre colunas).
const BIOOS =
  "6495\tArgamassa colante ACIII cinza\tKG\t8\t1,64\n" +
  "6520\tRejunte flexível\tKG\t0,07\t10,05\n" +
  "6540\tEspaçador plástico 2 mm\tUN\t8\t0,63";

describe("parseTsv — contexto de material (comQtd)", () => {
  it("lê Cód, Nome, Unidade, Qtd e Valor de uma linha do Excel", () => {
    const [row] = parseTsv("6495\tArgamassa colante ACIII cinza\tKG\t8\t1,64", { comQtd: true });
    expect(row).toEqual({
      codigo: "6495",
      nome: "Argamassa colante ACIII cinza",
      unidade: "kg",
      qtd: 8,
      preco: 1.64,
    });
  });

  it("lê várias linhas, com \\r\\n e vírgula decimal", () => {
    const rows = parseTsv(BIOOS.replace(/\n/g, "\r\n"), { comQtd: true });
    expect(rows).toHaveLength(3);
    expect(rows[1]).toEqual({
      codigo: "6520",
      nome: "Rejunte flexível",
      unidade: "kg",
      qtd: 0.07,
      preco: 10.05,
    });
    expect(rows[2]?.unidade).toBe("und");
  });

  it("aceita linha sem a coluna Cód quando a primeira célula não parece código", () => {
    const [row] = parseTsv("Rejunte flexível\tKG\t0,07\t10,05", { comQtd: true });
    expect(row).toEqual({
      codigo: "",
      nome: "Rejunte flexível",
      unidade: "kg",
      qtd: 0.07,
      preco: 10.05,
    });
  });

  it("aceita ; como separador quando não há tab", () => {
    const [row] = parseTsv("6495;Argamassa colante ACIII cinza;KG;8;1,64", { comQtd: true });
    expect(row?.codigo).toBe("6495");
    expect(row?.nome).toBe("Argamassa colante ACIII cinza");
    expect(row?.qtd).toBe(8);
    expect(row?.preco).toBe(1.64);
  });

  it('entende "R$ 10,05" e milhar "1.234,56" no valor', () => {
    const rows = parseTsv("1\tRejunte\tKG\t1\tR$ 10,05\n2\tPorcelanato\tM2\t1\tR$ 1.234,56", {
      comQtd: true,
    });
    expect(rows[0]?.preco).toBe(10.05);
    expect(rows[1]?.preco).toBe(1234.56);
    expect(rows[1]?.unidade).toBe("m²");
  });

  it("ignora linhas vazias e linhas sem nome", () => {
    const rows = parseTsv("\n6495\tArgamassa\tKG\t8\t1,64\n\n   \n7000\t\tKG\t1\t2\n", {
      comQtd: true,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.codigo).toBe("6495");
  });

  it("deixa Valor pendente e Qtd nulos quando as colunas faltam ou não têm número", () => {
    const [row] = parseTsv("6495\tArgamassa\tKG\t\t—", { comQtd: true });
    expect(row?.qtd).toBeNull();
    expect(row?.preco).toBeNull();
    const [curta] = parseTsv("6495\tArgamassa", { comQtd: true });
    expect(curta?.unidade).toBeNull();
    expect(curta?.preco).toBeNull();
  });
});

describe("parseTsv — aba Itens de custo (sem Qtd)", () => {
  it("lê a 4ª coluna como Valor", () => {
    const [row] = parseTsv("6495\tArgamassa colante ACIII cinza\tKG\t1,64", { comQtd: false });
    expect(row).toEqual({
      codigo: "6495",
      nome: "Argamassa colante ACIII cinza",
      unidade: "kg",
      qtd: null,
      preco: 1.64,
    });
  });

  it("aceita linha sem Cód: Nome, Unidade, Valor", () => {
    const [row] = parseTsv("Frete de entrega\tVB\t350", { comQtd: false });
    expect(row).toEqual({
      codigo: "",
      nome: "Frete de entrega",
      unidade: "vb",
      qtd: null,
      preco: 350,
    });
  });
});

describe("parseNumberCell / looksTabular", () => {
  it("parseNumberCell", () => {
    expect(parseNumberCell("8")).toBe(8);
    expect(parseNumberCell("1,64")).toBe(1.64);
    expect(parseNumberCell("R$ 1,64")).toBe(1.64);
    expect(parseNumberCell("0.07")).toBe(0.07);
    expect(parseNumberCell("")).toBeNull();
    expect(parseNumberCell("n/a")).toBeNull();
    expect(parseNumberCell(undefined)).toBeNull();
  });

  it("looksTabular", () => {
    expect(looksTabular("Argamassa")).toBe(false);
    expect(looksTabular("6495\tArgamassa")).toBe(true);
    expect(looksTabular("Argamassa\nRejunte")).toBe(true);
    expect(looksTabular("Argamassa\n")).toBe(false);
  });
});
