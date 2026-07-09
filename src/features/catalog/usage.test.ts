import { describe, expect, it } from "vitest";

import { createSeed } from "@/lib/data/seed";

import { getMaterialUsage, getUsageCounts } from "./usage";

const seed = createSeed();

describe("getMaterialUsage", () => {
  it("lista padrão e upgrades com tipologia/ambiente/componente", () => {
    // piso-001 é padrão de todos os componentes "Piso" do seed
    const usages = getMaterialUsage(seed.tipologias, "piso-001");
    expect(usages.length).toBeGreaterThan(10);
    expect(usages.every((u) => u.fn === "Padrão")).toBe(true);
    expect(usages[0]).toEqual({
      tip: "Planta A — 86m²",
      amb: "Sala/Living",
      comp: "Piso",
      fn: "Padrão",
    });
  });

  it("funciona para kits (upgrades)", () => {
    const usages = getMaterialUsage(seed.tipologias, "kit-piso-barcelona");
    expect(usages).toEqual([
      { tip: "Planta A — 86m²", amb: "Sala/Living", comp: "Piso", fn: "Upgrade" },
      { tip: "Planta C — 142m²", amb: "Sala/Living", comp: "Piso", fn: "Upgrade" },
    ]);
  });

  it("material sem uso retorna vazio", () => {
    expect(getMaterialUsage(seed.tipologias, "met-b-001")).toEqual([]);
  });
});

describe("getUsageCounts", () => {
  it("bate com a contagem individual", () => {
    const counts = getUsageCounts(seed.tipologias);
    expect(counts.get("piso-001")).toBe(getMaterialUsage(seed.tipologias, "piso-001").length);
    expect(counts.get("kit-piso-barcelona")).toBe(2);
    expect(counts.get("met-b-001")).toBeUndefined();
  });
});
