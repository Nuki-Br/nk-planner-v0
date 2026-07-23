import { describe, expect, it } from "vitest";

import { createSeed } from "@/lib/data/seed";
import type { Tipologia } from "@/shared/types/domain";

import { buildLayout, CV, PLANE_W } from "./buildLayout";

const seed = createSeed();
const t1 = seed.tipologias[0]!;
const t3 = seed.tipologias[2]!;
const none = new Set<string>();

/** Conta componentes e opções percorrendo a tipologia (nada de números fixos). */
function walk(tip: Tipologia): { comps: number; opts: number } {
  let comps = 0;
  let opts = 0;
  for (const amb of tip.ambientes) {
    for (const c of amb.componentes) {
      comps++;
      opts += c.options.length;
    }
  }
  return { comps, opts };
}

describe("buildLayout — contagens e posições (seed t1)", () => {
  const layout = buildLayout(t1, none, seed.kits);
  const { comps, opts } = walk(t1);

  it("conta nós por coluna", () => {
    expect(layout.ambNodes).toHaveLength(6);
    expect(layout.compNodes).toHaveLength(comps); // 1 por componente
    expect(layout.optNodes).toHaveLength(opts); // 1 por opção (padrão + upgrades)
    expect(layout.subNodes).toHaveLength(0); // nada expandido
    expect(layout.placeholders).toHaveLength(0); // t1 não tem ambiente vazio
  });

  it("primeira opção centra em pad + rowH3/2 e é a padrão", () => {
    expect(layout.optNodes[0]?.cy).toBe(CV.pad + CV.rowH3 / 2); // 89
    expect(layout.optNodes[0]?.label).toBe("padrão");
    expect(layout.optNodes[0]?.isPadrao).toBe(true);
    expect(layout.optNodes[1]?.label).toBe("opção 01");
  });

  it("cy do componente é a média das suas opções", () => {
    const salaPiso = t1.ambientes[0]!.componentes[0]!;
    const optCys = layout.optNodes.filter((n) => n.comp.id === salaPiso.id).map((n) => n.cy);
    const media = optCys.reduce((a, b) => a + b, 0) / optCys.length;
    const cn = layout.compNodes.find((n) => n.comp.id === salaPiso.id)!;
    expect(cn.cy).toBe(media);
    expect(cn.empty).toBe(false);
  });

  it("cy do ambiente é a média dos seus componentes", () => {
    const sala = t1.ambientes[0]!;
    const an = layout.ambNodes.find((n) => n.amb.id === sala.id)!;
    const comps2 = layout.compNodes.filter((n) => n.ambId === sala.blueprintRoomId);
    const media = comps2.reduce((a, c) => a + c.cy, 0) / comps2.length;
    expect(an.cy).toBe(media);
  });

  it("arestas: sólidas amb→comp e comp→opção; endpoints nas bordas das colunas", () => {
    const solid = layout.edges.filter((e) => e.kind === "solid");
    const dashed = layout.edges.filter((e) => e.kind === "dashed");
    expect(solid).toHaveLength(comps + opts);
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
  // Metais (Banheiro Social) tem uma opção-kit: "Metais Bronze" (4 itens).
  const metaisComp = t1.ambientes[4]!.componentes.find((c) => c.nome === "Metais")!;
  const kitOpt = metaisComp.options.find((o) => o.isKit)!;
  const kitKey = String(kitOpt.id);
  const kitEntity = seed.kits.find((k) => k.id === kitOpt.baseId)!;

  it("expandir o kit gera um sub-item por item, reposiciona a opção e cresce a altura", () => {
    const collapsed = buildLayout(t1, none, seed.kits);
    const expanded = buildLayout(t1, new Set([kitKey]), seed.kits);

    const n = kitEntity.itens.length;
    expect(n).toBe(4);
    expect(expanded.subNodes).toHaveLength(n);
    expect(expanded.subNodes.every((s) => s.optKey === kitKey)).toBe(true);

    const optC = collapsed.optNodes.find((o) => o.key === kitKey)!;
    const optE = expanded.optNodes.find((o) => o.key === kitKey)!;
    expect(optC.isOpen).toBe(false);
    expect(optE.isOpen).toBe(true);

    // cy da opção aberta = média do 1º e último sub-item
    const subs = expanded.subNodes.map((s) => s.cy);
    expect(optE.cy).toBe(((subs[0] ?? 0) + (subs[subs.length - 1] ?? 0)) / 2);

    // bloco do kit: n*(rowH4+gap4) - gap4 vs rowH3 → +100 para n=4
    const delta = n * (CV.rowH4 + CV.gap4) - CV.gap4 - CV.rowH3;
    expect(delta).toBe(100);
    expect(expanded.height - collapsed.height).toBe(delta);

    // arestas tracejadas opção→sub-item
    const dashed = expanded.edges.filter((e) => e.kind === "dashed");
    expect(dashed).toHaveLength(n);
    expect(dashed[0]?.x1).toBe(CV.x3 + CV.w3);
    expect(dashed[0]?.x2).toBe(CV.x4);
  });
});

describe("buildLayout — casos vazios", () => {
  it("ambiente sem componentes gera placeholder e aresta tracejada", () => {
    const tip: Tipologia = {
      id: 9001,
      nome: "Teste",
      metragem: 50,
      descricao: "",
      unidades: 1,
      status: "incompleta",
      ambientes: [{ id: 9002, blueprintRoomId: 9003, nome: "Sala", componentes: [], registros: [] }],
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
    const layout = buildLayout(t3, none, seed.kits);
    let nichoComp;
    for (const amb of t3.ambientes) {
      const c = amb.componentes.find((x) => x.nome === "Nicho");
      if (c) nichoComp = c;
    }
    if (!nichoComp) throw new Error("Nicho não encontrado na t3");
    expect(nichoComp.padrao).toBeNull();
    expect(nichoComp.options).toHaveLength(0);
    const nicho = layout.compNodes.find((n) => n.comp.id === nichoComp.id)!;
    expect(nicho.empty).toBe(true);
  });

  it("tipologia vazia: addAmbY = pad + 20", () => {
    const tip: Tipologia = {
      id: 9101,
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
