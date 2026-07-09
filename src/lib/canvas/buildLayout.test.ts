import { describe, expect, it } from "vitest";

import { createSeed } from "@/lib/data/seed";
import type { Tipologia } from "@/shared/types/domain";

import { buildLayout, CV, PLANE_W } from "./buildLayout";

const seed = createSeed();
const t1 = seed.tipologias.find((t) => t.id === "t1")!;
const none = new Set<string>();

describe("buildLayout — contagens e posições (seed t1)", () => {
  const layout = buildLayout(t1, none, seed.kits);

  it("conta nós por coluna", () => {
    expect(layout.ambNodes).toHaveLength(5);
    expect(layout.compNodes).toHaveLength(11);
    // opções = padrão + upgrades de cada componente
    expect(layout.optNodes).toHaveLength(26);
    expect(layout.subNodes).toHaveLength(0);
    expect(layout.placeholders).toHaveLength(0);
  });

  it("primeira opção centra em pad + rowH3/2", () => {
    expect(layout.optNodes[0]?.cy).toBe(CV.pad + CV.rowH3 / 2); // 89
    expect(layout.optNodes[0]?.label).toBe("padrão");
    expect(layout.optNodes[1]?.label).toBe("opção 01");
  });

  it("cy do componente é a média das suas opções", () => {
    // c1-1-1 tem 4 opções em 89, 171, 253, 335
    const c111 = layout.compNodes.find((n) => n.comp.id === "c1-1-1")!;
    expect(c111.cy).toBe((89 + 171 + 253 + 335) / 4); // 212
    expect(c111.empty).toBe(false);
  });

  it("cy do ambiente é a média dos componentes", () => {
    const a11 = layout.ambNodes.find((n) => n.amb.id === "a1-1")!;
    const comps = layout.compNodes.filter((n) => n.ambId === "a1-1");
    const media = comps.reduce((a, c) => a + c.cy, 0) / comps.length;
    expect(a11.cy).toBe(media);
  });

  it("arestas: sólidas amb→comp e comp→opção; endpoints nas bordas das colunas", () => {
    const solid = layout.edges.filter((e) => e.kind === "solid");
    const dashed = layout.edges.filter((e) => e.kind === "dashed");
    expect(solid).toHaveLength(11 + 26);
    expect(dashed).toHaveLength(0);
    expect(solid[0]?.x1).toBe(CV.x1 + CV.w1);
    expect(solid[0]?.x2).toBe(CV.x2);
  });

  it("altura e largura do plano", () => {
    expect(layout.height).toBeGreaterThan(0);
    expect(layout.addAmbY).toBe(layout.height - CV.pad - 60 + 20);
    expect(PLANE_W).toBe(CV.x4 + CV.w4 + CV.pad); // 1128
  });
});

describe("buildLayout — expansão de kit", () => {
  it("expandir kit gera sub-itens, muda o cy da opção e cresce a altura em 100", () => {
    const collapsed = buildLayout(t1, none, seed.kits);
    const expanded = buildLayout(t1, new Set(["c1-5-4-kit-metais-bronze"]), seed.kits);

    expect(expanded.subNodes).toHaveLength(4); // kit-metais-bronze tem 4 itens
    expect(expanded.subNodes[0]?.optKey).toBe("c1-5-4-kit-metais-bronze");

    const optC = collapsed.optNodes.find((o) => o.key === "c1-5-4-kit-metais-bronze")!;
    const optE = expanded.optNodes.find((o) => o.key === "c1-5-4-kit-metais-bronze")!;
    expect(optC.isOpen).toBe(false);
    expect(optE.isOpen).toBe(true);
    // cy = média do 1º e último sub-item
    const subs = expanded.subNodes.map((s) => s.cy);
    expect(optE.cy).toBe(((subs[0] ?? 0) + (subs[subs.length - 1] ?? 0)) / 2);

    // bloco do kit: 4*(34+10)-10+16 = 182 vs 66+16 = 82 → +100
    expect(expanded.height - collapsed.height).toBe(100);

    // arestas tracejadas opção→sub-item
    const dashed = expanded.edges.filter((e) => e.kind === "dashed");
    expect(dashed).toHaveLength(4);
    expect(dashed[0]?.x1).toBe(CV.x3 + CV.w3);
    expect(dashed[0]?.x2).toBe(CV.x4);
  });
});

describe("buildLayout — casos vazios", () => {
  it("ambiente sem componentes gera placeholder e aresta tracejada", () => {
    const tip: Tipologia = {
      id: "tx",
      nome: "Teste",
      metragem: 50,
      descricao: "",
      unidades: 1,
      status: "incompleta",
      ambientes: [{ id: "ax-1", nome: "Sala", componentes: [] }],
    };
    const layout = buildLayout(tip, none, seed.kits);
    expect(layout.placeholders).toHaveLength(1);
    expect(layout.placeholders[0]?.cy).toBe(CV.pad + CV.rowH3 / 2);
    expect(layout.compNodes).toHaveLength(0);
    expect(layout.ambNodes[0]?.cy).toBe(CV.pad + CV.rowH3 / 2);
    expect(layout.edges).toEqual([
      { kind: "dashed", x1: CV.x1 + CV.w1, y1: 89, x2: CV.x2, y2: 89 },
    ]);
  });

  it("componente sem padrão e sem upgrades vira nó empty (Nicho da t3)", () => {
    const t3 = seed.tipologias.find((t) => t.id === "t3")!;
    const layout = buildLayout(t3, none, seed.kits);
    const nicho = layout.compNodes.find((n) => n.comp.id === "c3-3-2")!;
    expect(nicho.empty).toBe(true);
  });

  it("tipologia vazia: addAmbY = pad + 20", () => {
    const tip: Tipologia = {
      id: "ty",
      nome: "Vazia",
      metragem: 0,
      descricao: "",
      unidades: 0,
      status: "incompleta",
      ambientes: [],
    };
    const layout = buildLayout(tip, none, seed.kits);
    expect(layout.ambNodes).toHaveLength(0);
    expect(layout.addAmbY).toBe(CV.pad + 20);
    expect(layout.height).toBe(CV.pad + 60 + CV.pad);
  });
});
