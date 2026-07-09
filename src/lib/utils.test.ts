import { describe, expect, it } from "vitest";

import { cn, fmtBRL, fmtNum, parseBR } from "./utils";

describe("fmtBRL", () => {
  it("formata com R$, milhar com ponto e decimal com vírgula", () => {
    expect(fmtBRL(1234.5)).toBe("R$ 1.234,50");
  });

  it("sempre exibe 2 casas decimais", () => {
    expect(fmtBRL(10)).toBe("R$ 10,00");
    expect(fmtBRL(0.125)).toBe("R$ 0,13");
  });

  it("null/undefined viram travessão", () => {
    expect(fmtBRL(null)).toBe("—");
    expect(fmtBRL(undefined)).toBe("—");
  });

  it("formata valores negativos", () => {
    expect(fmtBRL(-42.1)).toBe("R$ -42,10");
  });
});

describe("fmtNum", () => {
  it("usa 2 casas decimais por padrão", () => {
    expect(fmtNum(1234.5)).toBe("1.234,50");
  });

  it("respeita o número de casas pedido", () => {
    expect(fmtNum(0.1234, 3)).toBe("0,123");
    expect(fmtNum(7, 0)).toBe("7");
  });

  it("null/undefined viram travessão", () => {
    expect(fmtNum(null)).toBe("—");
    expect(fmtNum(undefined)).toBe("—");
  });
});

describe("parseBR", () => {
  it("converte vírgula decimal", () => {
    expect(parseBR("1,5")).toBe(1.5);
    expect(parseBR("0,25")).toBe(0.25);
  });

  it("aceita ponto decimal e inteiros", () => {
    expect(parseBR("2.5")).toBe(2.5);
    expect(parseBR("10")).toBe(10);
  });

  it("entrada não-numérica ou vazia vira 0 (contrato do protótipo)", () => {
    expect(parseBR("abc")).toBe(0);
    expect(parseBR("")).toBe(0);
  });

  it("números passam direto; NaN vira 0", () => {
    expect(parseBR(3.75)).toBe(3.75);
    expect(parseBR(Number.NaN)).toBe(0);
  });
});

describe("cn", () => {
  it("mescla classes resolvendo conflitos Tailwind", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});
