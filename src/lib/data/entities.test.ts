import { describe, expect, it } from "vitest";

import { getEntity, getKit, getMaterial, isKitId } from "./entities";
import { createSeed } from "./seed";

const seed = createSeed();

describe("isKitId", () => {
  it("detecta kits pelo prefixo do id", () => {
    expect(isKitId("kit-metais-bronze")).toBe(true);
    expect(isKitId("kit-piso-barcelona")).toBe(true);
    expect(isKitId("piso-001")).toBe(false);
    expect(isKitId("met-b-001")).toBe(false);
  });
});

describe("getMaterial / getKit", () => {
  it("encontra material por id", () => {
    expect(getMaterial(seed.materiais, "piso-001")?.custoMat).toBe(62.5);
  });

  it("id nulo/desconhecido retorna undefined", () => {
    expect(getMaterial(seed.materiais, null)).toBeUndefined();
    expect(getMaterial(seed.materiais, "nao-existe")).toBeUndefined();
    expect(getKit(seed.kits, "nao-existe")).toBeUndefined();
  });
});

describe("getEntity", () => {
  it("resolve kit com flag isKit: true", () => {
    const e = getEntity(seed.materiais, seed.kits, "kit-piso-barcelona");
    expect(e).not.toBeNull();
    expect(e?.isKit).toBe(true);
    if (e?.isKit) expect(e.tipo).toBe("kit");
  });

  it("resolve material com flag isKit: false", () => {
    const e = getEntity(seed.materiais, seed.kits, "piso-001");
    expect(e).not.toBeNull();
    expect(e?.isKit).toBe(false);
    if (e && !e.isKit) expect(e.custoMat).toBe(62.5);
  });

  it("id desconhecido → null", () => {
    expect(getEntity(seed.materiais, seed.kits, "kit-fantasma")).toBeNull();
    expect(getEntity(seed.materiais, seed.kits, "xyz")).toBeNull();
  });
});
