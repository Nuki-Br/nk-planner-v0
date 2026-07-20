import { describe, expect, it } from "vitest";

import { createSeed } from "./seed";

describe("createSeed", () => {
  const seed = createSeed();

  it("contagens fiéis ao protótipo", () => {
    expect(seed.materiais).toHaveLength(32);
    expect(seed.kits).toHaveLength(2);
    expect(seed.tipologias).toHaveLength(3);
    expect(seed.torres).toHaveLength(3);
    expect(seed.unitGroups).toHaveLength(5);
    expect(seed.versions).toHaveLength(3);
    expect(seed.projects).toHaveLength(5);
    expect(Object.keys(seed.comments)).toHaveLength(2);
  });

  it("projects[0] é o empreendimento âncora, com os extras", () => {
    const p = seed.projects[0];
    expect(p?.nome).toBe("Parque Ibirapuera Residências");
    expect(p?.itensPreenchidos).toBe(50);
    expect(p?.taxColumns).toHaveLength(3);
    expect(p?.taxColumns?.[2]?.expr).toBe("=valor_unitario * 22%");
  });

  it("estrutura das tipologias bate com o protótipo", () => {
    const t1 = seed.tipologias[0];
    expect(t1?.nome).toBe("Planta A — 86m²");
    expect(t1?.ambientes).toHaveLength(6);

    const piso = t1?.ambientes[0]?.componentes[0];
    expect(piso?.nome).toBe("Piso");
    expect(piso?.qtd).toBe(18.4);
    expect(piso?.rt).toBe(15);

    const rodape = t1?.ambientes[0]?.componentes[1];
    expect(rodape?.nome).toBe("Rodapé");
    expect(rodape?.qtd).toBe(16.8);
    expect(rodape?.rt).toBe(5);

    const kitPB = seed.kits.find((k) => k.nome === "Piso Barcelona + Soleira + RT");
    expect(kitPB?.itens).toHaveLength(3);

    expect(seed.tipologias[2]?.nome).toBe("Planta C — 142m²");
    expect(seed.tipologias[2]?.status).toBe("incompleta");
  });

  it("Sala/Living é um Room compartilhado pelas 3 plantas", () => {
    const s1 = seed.tipologias[0]!.ambientes[0]!;
    const s2 = seed.tipologias[1]!.ambientes[0]!;
    const s3 = seed.tipologias[2]!.ambientes[0]!;

    // mesmo Room id nas 3 plantas
    expect(s1.id).toBe(s2.id);
    expect(s2.id).toBe(s3.id);

    // paleta compartilhada: mesmos ids de componente e de opção
    expect(s1.componentes.map((c) => c.id)).toEqual(s2.componentes.map((c) => c.id));
    expect(s1.componentes[0]!.options.map((o) => o.id)).toEqual(
      s3.componentes[0]!.options.map((o) => o.id)
    );

    // só a instância por planta difere (qtd / RT / blueprintRoomId)
    expect(s1.componentes[0]!.qtd).not.toBe(s2.componentes[0]!.qtd);
    expect(s1.blueprintRoomId).not.toBe(s2.blueprintRoomId);
  });

  it("versão atual é a v3", () => {
    expect(seed.versions.find((v) => v.isCurrent)?.label).toBe("v3");
  });

  it("cada chamada retorna estrutura nova e isolada", () => {
    const a = createSeed();
    const b = createSeed();
    expect(a).not.toBe(b);
    a.materiais.push({ ...a.materiais[0]!, id: 999999 });
    const c = a.tipologias[0]?.ambientes[0]?.componentes[0];
    if (c) c.qtd = 999;
    expect(b.materiais).toHaveLength(32);
    expect(b.tipologias[0]?.ambientes[0]?.componentes[0]?.qtd).toBe(18.4);
  });
});
