import { describe, expect, it } from "vitest";

import { createSeed } from "./seed";

describe("createSeed", () => {
  const seed = createSeed();

  it("contagens fiéis ao protótipo", () => {
    expect(seed.materiais).toHaveLength(25);
    expect(seed.kits).toHaveLength(2);
    expect(seed.tipologias).toHaveLength(3);
    expect(seed.torres).toHaveLength(3);
    expect(seed.unitGroups).toHaveLength(5);
    expect(seed.pendingItems).toHaveLength(5);
    expect(seed.versions).toHaveLength(3);
    expect(seed.projects).toHaveLength(5);
    expect(Object.keys(seed.comments)).toHaveLength(2);
  });

  it("projects[0] carrega os extras do THE_PROJECT (typo corrigido)", () => {
    const p = seed.projects[0];
    expect(p?.id).toBe("p001");
    expect(p?.itensPreenchidos).toBe(50);
    expect(p?.inccBase).toBe("04/2026");
    expect(p?.taxas?.incorporadora).toBe(22);
    expect(p?.taxColumns).toHaveLength(3);
    expect(p?.taxColumns?.[2]?.expr).toBe("=valor_unitario * 22%");
  });

  it("estrutura das tipologias bate com o protótipo", () => {
    const t1 = seed.tipologias.find((t) => t.id === "t1");
    expect(t1?.ambientes).toHaveLength(5);
    const c111 = t1?.ambientes[0]?.componentes[0];
    expect(c111?.id).toBe("c1-1-1");
    expect(c111?.qtd).toBe(18.4);
    expect(c111?.rt).toBe(15);
    expect(c111?.kitQtds?.["kit-piso-barcelona"]?.["sol-bcn"]).toBe(2);
    const t3 = seed.tipologias.find((t) => t.id === "t3");
    expect(t3?.status).toBe("incompleta");
  });

  it("versão atual é a v3", () => {
    expect(seed.versions.find((v) => v.isCurrent)?.id).toBe("v3");
  });

  it("cada chamada retorna estrutura nova e isolada", () => {
    const a = createSeed();
    const b = createSeed();
    expect(a).not.toBe(b);
    a.materiais.push({ ...a.materiais[0]!, id: "x-teste" });
    const t = a.tipologias[0]?.ambientes[0]?.componentes[0];
    if (t) t.qtd = 999;
    expect(b.materiais).toHaveLength(25);
    expect(b.tipologias[0]?.ambientes[0]?.componentes[0]?.qtd).toBe(18.4);
  });
});
