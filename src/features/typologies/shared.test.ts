import { describe, expect, it } from "vitest";

import { contarUnidades } from "./shared";

describe("contarUnidades", () => {
  it("soma as unidades distintas dos grupos, por torre", () => {
    expect(
      contarUnidades([
        { torre: "Torre A", unidades: ["101", "102"] },
        { torre: "Torre A", unidades: ["102 ", "103"] }, // 102 repetida (com espaço) conta uma vez
        { torre: "Torre B", unidades: ["101"] }, // mesmo número, outra torre: outra unidade
      ])
    ).toBe(4);
  });

  it("sem grupos, zero", () => {
    expect(contarUnidades([])).toBe(0);
  });
});
