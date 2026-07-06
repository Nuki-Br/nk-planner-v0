import { describe, expect, it } from "vitest";

import { addUnitTokens } from "./unitTokens";

describe("addUnitTokens", () => {
  it("tokeniza por espaço/vírgula/ponto-e-vírgula e ordena numericamente", () => {
    expect(addUnitTokens([], "101, 111;121 131")).toEqual(["101", "111", "121", "131"]);
    expect(addUnitTokens(["111"], "101 1701")).toEqual(["101", "111", "1701"]);
  });

  it("deduplica e ignora entrada vazia", () => {
    expect(addUnitTokens(["101"], "101, 101")).toEqual(["101"]);
    expect(addUnitTokens(["101"], "  ,; ")).toEqual(["101"]);
  });

  it("tokens não numéricos vão para o início e desempatam por localeCompare", () => {
    // Espaço também separa tokens (contrato do protótipo): "PH B" vira 2 chips.
    expect(addUnitTokens([], "1702 PH-B PH-A 1701")).toEqual([
      "PH-A",
      "PH-B",
      "1701",
      "1702",
    ]);
  });
});
