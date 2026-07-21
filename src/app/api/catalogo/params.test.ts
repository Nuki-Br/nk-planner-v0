import { describe, expect, it } from "vitest";

import {
  MAX_EXCLUDE_IDS,
  optionalInt,
  parseCategoriaId,
  parseIdList,
  parseTipo,
} from "./params";

describe("parseCategoriaId", () => {
  // A distinção entre os três estados é o ponto: confundir "ausente" com
  // "sem categoria" filtraria CategoryId: null e esvaziaria a lista inteira.
  it("ausente ou vazio = sem filtro (undefined)", () => {
    expect(parseCategoriaId(null)).toBeUndefined();
    expect(parseCategoriaId("")).toBeUndefined();
  });

  it('"none" = só o que não tem categoria (null)', () => {
    expect(parseCategoriaId("none")).toBeNull();
  });

  it("número = aquela categoria", () => {
    expect(parseCategoriaId("7")).toBe(7);
  });

  it("valor não-inteiro é erro, não um filtro silencioso", () => {
    expect(() => parseCategoriaId("abc")).toThrow("categoriaId");
    expect(() => parseCategoriaId("1.5")).toThrow("categoriaId");
  });
});

describe("parseTipo", () => {
  it("aceita os tipos conhecidos", () => {
    expect(parseTipo("single")).toBe("single");
    expect(parseTipo("kit")).toBe("kit");
  });

  it("ausente ou desconhecido cai em all", () => {
    expect(parseTipo(null)).toBe("all");
    expect(parseTipo("")).toBe("all");
    expect(parseTipo("qualquer")).toBe("all");
  });
});

describe("optionalInt", () => {
  it("ausente ou vazio = undefined (usa o default do store)", () => {
    expect(optionalInt(null, "page")).toBeUndefined();
    expect(optionalInt("", "page")).toBeUndefined();
  });

  it("inteiro é convertido", () => {
    expect(optionalInt("3", "page")).toBe(3);
  });

  it("não-inteiro nomeia o campo no erro", () => {
    expect(() => optionalInt("abc", "page")).toThrow("page");
    expect(() => optionalInt("2.5", "limit")).toThrow("limit");
  });
});

describe("parseIdList", () => {
  it("ausente ou vazio = lista vazia (sem cláusula notIn)", () => {
    expect(parseIdList(null)).toEqual([]);
    expect(parseIdList("")).toEqual([]);
  });

  it("separa por vírgula", () => {
    expect(parseIdList("1,2,3")).toEqual([1, 2, 3]);
  });

  it("descarta entradas não-inteiras em vez de virar NaN no where", () => {
    expect(parseIdList("1,abc,3")).toEqual([1, 3]);
  });

  it("corta no teto para não estourar a URL", () => {
    const muitos = Array.from({ length: MAX_EXCLUDE_IDS + 50 }, (_, i) => i + 1).join(",");
    expect(parseIdList(muitos)).toHaveLength(MAX_EXCLUDE_IDS);
  });
});
