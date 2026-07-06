import { beforeEach, describe, expect, it } from "vitest";

import {
  addPendingItem,
  appendComment,
  createComponente,
  createMaterial,
  createTipologia,
  deleteAmbiente,
  getSharedInfo,
  linkAmbiente,
  createVersion,
  deleteMaterial,
  duplicateTipologia,
  getBudgetColumns,
  getComments,
  getProject,
  getTipologia,
  listMateriais,
  listPendingItems,
  listProjects,
  listVersions,
  removePendingItem,
  reorderComponentes,
  resetStore,
  restoreVersion,
  setKitQtds,
  setPadrao,
  updateBudgetColumns,
  updateProject,
} from "./store";

beforeEach(() => {
  resetStore();
});

describe("store — leituras clonadas", () => {
  it("mutar o retorno não vaza para o store", async () => {
    const materiais = await listMateriais();
    materiais.pop();
    materiais[0]!.nome = "Alterado localmente";
    const releitura = await listMateriais();
    expect(releitura).toHaveLength(25);
    expect(releitura[0]?.nome).toBe("Porcelanato Acetinado 60×60 Creme");
  });
});

describe("store — materiais", () => {
  it("createMaterial aparece na listagem; deleteMaterial remove", async () => {
    const novo = await createMaterial({
      codigo: "TST-001",
      nome: "Material de teste",
      fabricante: "Teste",
      categoria: "Piso",
      unidade: "m²",
      custoMat: 10,
      custoMO: 5,
    });
    expect(novo.id).toMatch(/^mat-/);
    expect(await listMateriais()).toHaveLength(26);
    await deleteMaterial(novo.id);
    expect(await listMateriais()).toHaveLength(25);
  });

  it("id inexistente lança erro PT-BR", async () => {
    await expect(deleteMaterial("nao-existe")).rejects.toThrow("Material não encontrado.");
  });
});

describe("store — projetos e colunas", () => {
  it("updateProject persiste campos de config", async () => {
    await updateProject("p001", { inccBase: "07/2026", nome: "Novo nome" });
    const p = await getProject("p001");
    expect(p?.inccBase).toBe("07/2026");
    expect(p?.nome).toBe("Novo nome");
    expect((await listProjects())[0]?.nome).toBe("Novo nome");
  });

  it("getBudgetColumns usa as colunas do projeto ou o default", async () => {
    expect(await getBudgetColumns("p001")).toHaveLength(3); // do projeto
    expect(await getBudgetColumns("p002")).toHaveLength(3); // fallback default
    const novas = await updateBudgetColumns("p001", [
      { id: "x1", nome: "Nova", kind: "free", expr: "=custo_troca * 1%", visivel: true },
    ]);
    expect(novas).toHaveLength(1);
    expect(await getBudgetColumns("p001")).toHaveLength(1);
  });
});

describe("store — tipologias profundas", () => {
  it("setPadrao/setKitQtds gravam profundo e sobrevivem à releitura", async () => {
    await setPadrao("t1", "a1-1", "c1-1-1", "piso-002");
    await setKitQtds("t1", "a1-1", "c1-1-1", "kit-piso-barcelona", { "piso-bcn": 20 });
    const tip = await getTipologia("t1");
    const comp = tip?.ambientes[0]?.componentes[0];
    expect(comp?.padrao).toBe("piso-002");
    expect(comp?.kitQtds?.["kit-piso-barcelona"]?.["piso-bcn"]).toBe(20);
  });

  it("reorderComponentes aplica a nova ordem e valida ids", async () => {
    await reorderComponentes("t1", "a1-1", ["c1-1-2", "c1-1-1"]);
    const tip = await getTipologia("t1");
    expect(tip?.ambientes[0]?.componentes.map((c) => c.id)).toEqual(["c1-1-2", "c1-1-1"]);
    await expect(reorderComponentes("t1", "a1-1", ["c1-1-2"])).rejects.toThrow(
      "Ordem de componentes inválida."
    );
  });

  it("createTipologia nasce incompleta e duplicateTipologia gera ids novos", async () => {
    const nova = await createTipologia({ nome: "Planta D", metragem: 70, descricao: "", unidades: 8 });
    expect(nova.status).toBe("incompleta");
    expect(nova.ambientes).toEqual([]);
    const copia = await duplicateTipologia("t1");
    expect(copia.id).not.toBe("t1");
    expect(copia.nome).toBe("Planta A — 86m² (cópia)");
    expect(copia.ambientes).toHaveLength(5);
    expect(copia.ambientes[0]?.id).not.toBe("a1-1");
    expect(copia.ambientes[0]?.componentes[0]?.id).not.toBe("c1-1-1");
  });
});

describe("store — versões, comentários e pendências", () => {
  it("createVersion incrementa o label e é exclusivamente atual", async () => {
    const v = await createVersion({ summary: "Teste", createdBy: "Felipe", changes: { materiais: [], custos: [], taxas: [], tipologias: [] } });
    expect(v.label).toBe("v4");
    expect(v.isCurrent).toBe(true);
    const all = await listVersions();
    expect(all.filter((x) => x.isCurrent)).toHaveLength(1);
    const restaurada = await restoreVersion("v1");
    expect(restaurada.isCurrent).toBe(true);
    expect((await listVersions()).find((x) => x.id === v.id)?.isCurrent).toBe(false);
  });

  it("appendComment cria thread nova com data no formato BR", async () => {
    const c = await appendComment("c1-1-1-piso-002", { autor: "incorporadora", texto: "Ok." });
    expect(c.data).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
    expect(await getComments("c1-1-1-piso-002")).toHaveLength(1);
    expect(await getComments("c2-1-1-piso-002")).toHaveLength(3); // thread do seed intacta
  });

  it("add/removePendingItem sem duplicar", async () => {
    await addPendingItem("c1-1-1-piso-002");
    await addPendingItem("c1-1-1-piso-002");
    expect(await listPendingItems()).toHaveLength(6);
    await removePendingItem("c1-1-1-piso-002");
    expect(await listPendingItems()).toHaveLength(5);
  });
});

describe("store — compartilhamento de ambientes", () => {
  it("seed traz a Sala/Living compartilhada entre as 3 tipologias", async () => {
    const { sharedReg, ambShared } = await getSharedInfo();
    expect(sharedReg["sh-sala"]?.tips).toEqual(["t1", "t2", "t3"]);
    expect(ambShared["a2-1"]).toBe("sh-sala");
  });

  it("linkAmbiente clona com ids novos e registra os dois lados", async () => {
    // Vincula a Cozinha da t2 (a2-2) na t1
    const novo = await linkAmbiente("t1", "t2", "a2-2");
    expect(novo.id).not.toBe("a2-2");
    expect(novo.nome).toBe("Cozinha");
    expect(novo.componentes).toHaveLength(3);
    expect(novo.componentes.map((c) => c.id)).not.toContain("c2-2-1");

    const { sharedReg, ambShared } = await getSharedInfo();
    expect(ambShared[novo.id]).toBe("sh-a2-2");
    expect(ambShared["a2-2"]).toBe("sh-a2-2");
    expect(sharedReg["sh-a2-2"]?.tips.sort()).toEqual(["t1", "t2"]);
  });

  it("deleteAmbiente desvincula a tipologia do grupo", async () => {
    await deleteAmbiente("t3", "a3-1"); // Sala/Living da t3 (sh-sala)
    const { sharedReg, ambShared } = await getSharedInfo();
    expect(ambShared["a3-1"]).toBeUndefined();
    expect(sharedReg["sh-sala"]?.tips.sort()).toEqual(["t1", "t2"]);
  });
});

describe("store — createComponente com padrão", () => {
  it("aceita padrao opcional e nasce sem upgrades", async () => {
    const comp = await createComponente("t1", "a1-1", {
      nome: "Nicho decorativo",
      unidade: "und",
      qtd: 2,
      rt: 0,
      padrao: "piso-001",
    });
    expect(comp.padrao).toBe("piso-001");
    expect(comp.upgrades).toEqual([]);
    const semPadrao = await createComponente("t1", "a1-1", {
      nome: "Outro",
      unidade: "m²",
      qtd: 1,
      rt: 0,
    });
    expect(semPadrao.padrao).toBeNull();
  });
});

describe("store — resetStore", () => {
  it("volta ao seed original", async () => {
    await createMaterial({ codigo: "X", nome: "X", fabricante: "X", categoria: "Piso", unidade: "m²", custoMat: 1, custoMO: 1 });
    await updateProject("p001", { nome: "Mudou" });
    resetStore();
    expect(await listMateriais()).toHaveLength(25);
    expect((await getProject("p001"))?.nome).toBe("Parque Ibirapuera Residências");
  });
});
