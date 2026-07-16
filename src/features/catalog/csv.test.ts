import { describe, expect, it } from "vitest";

import { convertRows, guessMapping, type CsvMapping } from "./csv";

describe("guessMapping", () => {
  it("mapeia os cabeçalhos do CSV de exemplo do protótipo (Und é ignorada)", () => {
    expect(
      guessMapping(["Código", "Descrição", "Marca", "Tipo", "Und", "Custo mat", "MO"])
    ).toEqual({
      "Código": "codigo",
      "Descrição": "nome",
      Marca: "fabricante",
      Tipo: "categoria",
      Und: "",
      "Custo mat": "custoMat",
      MO: "custoMO",
    });
  });

  it("cabeçalho desconhecido fica ignorado; duplicata não rouba o campo", () => {
    expect(guessMapping(["Observações", "Nome", "Descrição"])).toEqual({
      Observações: "",
      Nome: "nome",
      Descrição: "",
    });
  });
});

describe("convertRows", () => {
  const mapping: CsvMapping = {
    "Código": "codigo",
    "Descrição": "nome",
    Marca: "fabricante",
    Tipo: "categoria",
    "Custo mat": "custoMat",
    MO: "custoMO",
  };

  it("converte linhas válidas com vírgula decimal e travessão", () => {
    const { materiais, descartadas } = convertRows(
      [
        { "Código": "PT-NV-6060", "Descrição": "Porcelanato Natural 60×60", Marca: "Portobello", Tipo: "Piso", "Custo mat": "54,00", MO: "22,00" },
        { "Código": "GR-NG-POL", "Descrição": "Granito Negro São Gabriel", Marca: "Minaspedras", Tipo: "Pedra", "Custo mat": "290,00", MO: "—" },
      ],
      mapping
    );
    expect(descartadas).toEqual([]);
    expect(materiais).toEqual([
      { codigo: "PT-NV-6060", nome: "Porcelanato Natural 60×60", fabricante: "Portobello", categoria: "Piso", custoMat: 54, custoMO: 22 },
      { codigo: "GR-NG-POL", nome: "Granito Negro São Gabriel", fabricante: "Minaspedras", categoria: "Pedra", custoMat: 290, custoMO: 0 },
    ]);
  });

  it("aceita categoria nova (criada no servidor) e preços com R$", () => {
    const { materiais, descartadas } = convertRows(
      [{ "Código": "Y", "Descrição": "Tomada teste", Marca: "", Tipo: "Elétrica", "Custo mat": "R$ 10,50", MO: "" }],
      mapping
    );
    expect(descartadas).toEqual([]);
    expect(materiais[0]?.categoria).toBe("Elétrica");
    expect(materiais[0]?.custoMat).toBe(10.5);
  });

  it("descarta linha sem nome e sem categoria, com motivo", () => {
    const { materiais, descartadas } = convertRows(
      [
        { "Código": "A", "Descrição": "", Marca: "", Tipo: "Piso", "Custo mat": "", MO: "" },
        { "Código": "B", "Descrição": "Válido", Marca: "", Tipo: "", "Custo mat": "", MO: "" },
        { "Código": "C", "Descrição": "Ok", Marca: "", Tipo: "Metal", "Custo mat": "", MO: "" },
      ],
      mapping
    );
    expect(materiais).toHaveLength(1);
    expect(materiais[0]?.codigo).toBe("C");
    expect(descartadas).toEqual([
      { linha: 1, motivo: "sem especificação" },
      { linha: 2, motivo: "sem categoria" },
    ]);
  });

  it("colunas ignoradas não entram no material", () => {
    const { materiais } = convertRows(
      [{ "Descrição": "Só nome", Tipo: "Metal", Extra: "lixo" }],
      { "Descrição": "nome", Tipo: "categoria", Extra: "" }
    );
    expect(materiais[0]).toEqual({
      codigo: "",
      nome: "Só nome",
      fabricante: "",
      categoria: "Metal",
      custoMat: 0,
      custoMO: 0,
    });
  });
});
