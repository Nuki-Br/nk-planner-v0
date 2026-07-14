import { describe, expect, it } from "vitest";

import { getKit, getMaterial, getOptionEntity } from "./entities";
import { createSeed } from "./seed";

const seed = createSeed();
// Ids são atribuídos por contador — buscamos por campos estáveis.
const piso001 = seed.materiais.find((m) => m.codigo === "PO-6060-CR")!; // custoMat 62.5
const kitPB = seed.kits.find((k) => k.codigo === "KIT-PB")!; // Piso Barcelona + Soleira + RT

describe("getMaterial / getKit", () => {
  it("encontra material por id", () => {
    expect(getMaterial(seed.materiais, piso001.id)?.custoMat).toBe(62.5);
  });

  it("encontra kit por id", () => {
    expect(getKit(seed.kits, kitPB.id)?.codigo).toBe("KIT-PB");
  });

  it("id nulo/indefinido/desconhecido retorna undefined", () => {
    expect(getMaterial(seed.materiais, null)).toBeUndefined();
    expect(getMaterial(seed.materiais, undefined)).toBeUndefined();
    expect(getMaterial(seed.materiais, 999999)).toBeUndefined();
    expect(getKit(seed.kits, null)).toBeUndefined();
    expect(getKit(seed.kits, 999999)).toBeUndefined();
  });
});

describe("getOptionEntity", () => {
  it("resolve opção de material com flag isKit: false", () => {
    const e = getOptionEntity(seed.materiais, seed.kits, { baseId: piso001.id, isKit: false });
    expect(e).not.toBeNull();
    expect(e?.isKit).toBe(false);
    if (e && !e.isKit) {
      expect(e.codigo).toBe("PO-6060-CR");
      expect(e.custoMat).toBe(62.5);
    }
  });

  it("resolve opção de kit com flag isKit: true", () => {
    const e = getOptionEntity(seed.materiais, seed.kits, { baseId: kitPB.id, isKit: true });
    expect(e).not.toBeNull();
    expect(e?.isKit).toBe(true);
    if (e?.isKit) {
      expect(e.codigo).toBe("KIT-PB");
      expect(e.itens).toHaveLength(3);
    }
  });

  it("baseId desconhecido → null", () => {
    expect(getOptionEntity(seed.materiais, seed.kits, { baseId: 999999, isKit: false })).toBeNull();
    expect(getOptionEntity(seed.materiais, seed.kits, { baseId: 999999, isKit: true })).toBeNull();
  });
});
