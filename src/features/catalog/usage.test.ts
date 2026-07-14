import { describe, expect, it } from "vitest";

import { createSeed } from "@/lib/data/seed";

import { getMaterialUsage, getUsageCounts } from "./usage";

const seed = createSeed();
const piso001 = seed.materiais.find((m) => m.codigo === "PO-6060-CR")!; // padrão de todo Piso
const kitPB = seed.kits.find((k) => k.codigo === "KIT-PB")!; // upgrade na Sala compartilhada
const metB001 = seed.materiais.find((m) => m.codigo === "DCK-DH-BR")!; // só compõe kit, nunca é opção

describe("getMaterialUsage", () => {
  it("lista o padrão em todos os componentes Piso", () => {
    const usages = getMaterialUsage(seed.tipologias, piso001.id);
    // piso-001 é o padrão de cada componente "Piso": 5 (t1) + 7 (t2) + 4 (t3) = 16
    expect(usages).toHaveLength(16);
    expect(usages.every((u) => u.fn === "Padrão")).toBe(true);
    expect(usages[0]).toEqual({
      tip: "Planta A — 86m²",
      amb: "Sala/Living",
      comp: "Piso",
      fn: "Padrão",
    });
  });

  it("funciona para kits — a Sala compartilhada aparece nas 3 plantas", () => {
    const usages = getMaterialUsage(seed.tipologias, kitPB.id);
    expect(usages).toEqual([
      { tip: "Planta A — 86m²", amb: "Sala/Living", comp: "Piso", fn: "Upgrade" },
      { tip: "Planta B — 115m²", amb: "Sala/Living", comp: "Piso", fn: "Upgrade" },
      { tip: "Planta C — 142m²", amb: "Sala/Living", comp: "Piso", fn: "Upgrade" },
    ]);
  });

  it("material que só compõe kit (nunca é opção) retorna vazio", () => {
    expect(getMaterialUsage(seed.tipologias, metB001.id)).toEqual([]);
  });
});

describe("getUsageCounts", () => {
  it("bate com a contagem individual", () => {
    const counts = getUsageCounts(seed.tipologias);
    expect(counts.get(piso001.id)).toBe(getMaterialUsage(seed.tipologias, piso001.id).length);
    expect(counts.get(kitPB.id)).toBe(3);
    expect(counts.get(metB001.id)).toBeUndefined();
  });
});
