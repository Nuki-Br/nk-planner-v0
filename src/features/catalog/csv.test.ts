import { describe, expect, it } from "vitest";

import { convertRows, guessMapping, type CsvMapping } from "./csv";

describe("guessMapping", () => {
  it("mapeia os cabeçalhos de identidade; Und e as colunas de custo são ignoradas", () => {
    // Custo saiu do catálogo (é por empreendimento), então "Custo mat"/"MO" não
    // têm mais campo alvo — cair no "Ignorar" é o comportamento correto, não um
    // buraco no auto-mapeamento.
    expect(
      guessMapping(["Código", "Descrição", "Marca", "Tipo", "Und", "Custo mat", "MO"])
    ).toEqual({
      "Código": "codigo",
      "Descrição": "nome",
      Marca: "fabricante",
      Tipo: "categoria",
      Und: "",
      "Custo mat": "",
      MO: "",
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
    "Custo mat": "",
    MO: "",
  };

  it("converte linhas válidas ignorando as colunas de custo", () => {
    const { materiais, descartadas } = convertRows(
      [
        { "Código": "PT-NV-6060", "Descrição": "Porcelanato Natural 60×60", Marca: "Portobello", Tipo: "Piso", "Custo mat": "54,00", MO: "22,00" },
        { "Código": "GR-NG-POL", "Descrição": "Granito Negro São Gabriel", Marca: "Minaspedras", Tipo: "Pedra", "Custo mat": "290,00", MO: "—" },
      ],
      mapping
    );
    expect(descartadas).toEqual([]);
    expect(materiais).toEqual([
      { codigo: "PT-NV-6060", nome: "Porcelanato Natural 60×60", fabricante: "Portobello", categoria: "Piso" },
      { codigo: "GR-NG-POL", nome: "Granito Negro São Gabriel", fabricante: "Minaspedras", categoria: "Pedra" },
    ]);
  });

  it("aceita categoria nova (criada no servidor)", () => {
    const { materiais, descartadas } = convertRows(
      [{ "Código": "Y", "Descrição": "Tomada teste", Marca: "", Tipo: "Elétrica" }],
      mapping
    );
    expect(descartadas).toEqual([]);
    expect(materiais[0]?.categoria).toBe("Elétrica");
  });

  it("descarta linha sem nome e sem categoria, com motivo", () => {
    const { materiais, descartadas } = convertRows(
      [
        { "Código": "A", "Descrição": "", Marca: "", Tipo: "Piso" },
        { "Código": "B", "Descrição": "Válido", Marca: "", Tipo: "" },
        { "Código": "C", "Descrição": "Ok", Marca: "", Tipo: "Metal" },
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
    });
  });
});
