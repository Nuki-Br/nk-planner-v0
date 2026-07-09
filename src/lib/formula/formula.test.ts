import { describe, expect, it } from "vitest";

import { evalCell, evalFormula, FormulaError, normName } from "./index";

function errMsg(fn: () => number): string {
  try {
    fn();
  } catch (e: unknown) {
    if (e instanceof FormulaError) return e.msg;
    throw e;
  }
  throw new Error("esperava FormulaError, mas a fórmula avaliou sem erro");
}

describe("normName", () => {
  it("normaliza nomes de coluna em tokens de referência", () => {
    expect(normName("Taxa Construtora")).toBe("taxa_construtora");
    expect(normName("Contingência INCC")).toBe("contingencia_incc");
    expect(normName("Déb./Créd.")).toBe("deb_cred");
    expect(normName("Valor unitário")).toBe("valor_unitario");
  });

  it("vazio/null viram string vazia", () => {
    expect(normName("")).toBe("");
    expect(normName(null)).toBe("");
    expect(normName(undefined)).toBe("");
  });
});

describe("evalFormula", () => {
  it("respeita precedência de operadores", () => {
    expect(evalFormula("2 + 3 * 4", {})).toBe(14);
    expect(evalFormula("(2+3)*4", {})).toBe(20);
  });

  it("aceita vírgula decimal", () => {
    expect(evalFormula("0,25", {})).toBe(0.25);
    expect(evalFormula("1,5 * 2", {})).toBe(3);
  });

  it("pós-fixo % divide por 100 (sugar)", () => {
    expect(evalFormula("10%", {})).toBeCloseTo(0.1, 10);
    expect(evalFormula("-5%", {})).toBeCloseTo(-0.05, 10);
    expect(evalFormula("200 * 8%", {})).toBeCloseTo(16, 10);
  });

  it("resolve identificadores pelo escopo", () => {
    expect(evalFormula("custo_troca * 8%", { custo_troca: 35.5 })).toBeCloseTo(2.84, 10);
    expect(
      evalFormula("custo_troca + valor_unitario", { custo_troca: 1, valor_unitario: 2 })
    ).toBe(3);
  });

  it("identificador com acento é normalizado antes do lookup", () => {
    expect(evalFormula("Contingência_INCC", { contingencia_incc: 7 })).toBe(7);
  });

  it("erros com mensagens PT-BR verbatim", () => {
    expect(errMsg(() => evalFormula("1/0", {}))).toBe("divisão por zero");
    expect(errMsg(() => evalFormula("", {}))).toBe("fórmula vazia");
    expect(errMsg(() => evalFormula("2+", {}))).toBe("expressão incompleta");
    expect(errMsg(() => evalFormula("(2", {}))).toBe("parêntese não fechado");
    expect(errMsg(() => evalFormula("2 3", {}))).toBe("sintaxe inválida");
    expect(errMsg(() => evalFormula("#", {}))).toBe('caractere inválido "#"');
    expect(errMsg(() => evalFormula("foo+1", {}))).toBe('coluna "foo" não encontrada');
  });

  it("erro de referência usa o texto cru digitado, não o normalizado", () => {
    expect(errMsg(() => evalFormula("Módulo + 1", {}))).toBe(
      'coluna "Módulo" não encontrada'
    );
  });
});

describe("evalCell", () => {
  it("célula vazia → 0 sem erro", () => {
    expect(evalCell("", {})).toEqual({ value: 0, error: null });
    expect(evalCell(null, {})).toEqual({ value: 0, error: null });
    expect(evalCell(undefined, {})).toEqual({ value: 0, error: null });
  });

  it("número puro com vírgula e %", () => {
    expect(evalCell("12,5", {})).toEqual({ value: 12.5, error: null });
    expect(evalCell("12,5%", {}).value).toBeCloseTo(0.125, 10);
    expect(evalCell("10", {})).toEqual({ value: 10, error: null });
  });

  it("não-numérico → erro 'valor inválido'", () => {
    expect(evalCell("abc", {})).toEqual({ value: 0, error: "valor inválido" });
  });

  it("fórmula com '=' avalia contra o escopo", () => {
    expect(evalCell("=custo_troca * 8%", { custo_troca: 35.5 }).value).toBeCloseTo(2.84, 10);
  });

  it("nunca lança: erro de fórmula vira {0, mensagem}", () => {
    expect(evalCell("=1/0", {})).toEqual({ value: 0, error: "divisão por zero" });
    expect(evalCell("=nada", {})).toEqual({
      value: 0,
      error: 'coluna "nada" não encontrada',
    });
  });
});
