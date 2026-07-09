import { describe, expect, it } from "vitest";

import { convertRows, guessMapping, type CsvMapping } from "./csv";

describe("guessMapping", () => {
  it("mapeia os cabeçalhos do CSV de exemplo do protótipo", () => {
    expect(
      guessMapping(["Código", "Descrição", "Marca", "Tipo", "Und", "Custo mat", "MO"])
    ).toEqual({
      "Código": "codigo",
      "Descrição": "nome",
      Marca: "fabricante",
      Tipo: "categoria",
      Und: "unidade",
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
    Und: "unidade",
    "Custo mat": "custoMat",
    MO: "custoMO",
  };

  it("converte linhas válidas com vírgula decimal e travessão", () => {
    const { materiais, descartadas } = convertRows(
      [
        { "Código": "PT-NV-6060", "Descrição": "Porcelanato Natural 60×60", Marca: "Portobello", Tipo: "Piso", Und: "m²", "Custo mat": "54,00", MO: "22,00" },
        { "Código": "GR-NG-POL", "Descrição": "Granito Negro São Gabriel", Marca: "Minaspedras", Tipo: "Pedra", Und: "ml", "Custo mat": "290,00", MO: "—" },
      ],
      mapping
    );
    expect(descartadas).toEqual([]);
    expect(materiais).toEqual([
      { codigo: "PT-NV-6060", nome: "Porcelanato Natural 60×60", fabricante: "Portobello", categoria: "Piso", unidade: "m²", custoMat: 54, custoMO: 22 },
      { codigo: "GR-NG-POL", nome: "Granito Negro São Gabriel", fabricante: "Minaspedras", categoria: "Pedra", unidade: "ml", custoMat: 290, custoMO: 0 },
    ]);
  });

  it("normaliza categoria/unidade com acento e caixa; unidade desconhecida vira und", () => {
    const { materiais } = convertRows(
      [{ "Código": "X", "Descrição": "Rodapé teste", Marca: "", Tipo: "rodape", Und: "M2", "Custo mat": "", MO: "" },
       { "Código": "Y", "Descrição": "Cuba teste", Marca: "", Tipo: "CUBA/LOUÇA", Und: "caixa", "Custo mat": "R$ 10,50", MO: "" }],
      mapping
    );
    expect(materiais[0]?.categoria).toBe("Rodapé");
    expect(materiais[0]?.unidade).toBe("m²");
    expect(materiais[0]?.custoMat).toBe(0);
    expect(materiais[1]?.categoria).toBe("Cuba/Louça");
    expect(materiais[1]?.unidade).toBe("und");
    expect(materiais[1]?.custoMat).toBe(10.5);
  });

  it("descarta linha sem nome e categoria desconhecida, com motivo", () => {
    const { materiais, descartadas } = convertRows(
      [
        { "Código": "A", "Descrição": "", Marca: "", Tipo: "Piso", Und: "m²", "Custo mat": "", MO: "" },
        { "Código": "B", "Descrição": "Válido", Marca: "", Tipo: "Elétrica", Und: "und", "Custo mat": "", MO: "" },
        { "Código": "C", "Descrição": "Ok", Marca: "", Tipo: "Metal", Und: "und", "Custo mat": "", MO: "" },
      ],
      mapping
    );
    expect(materiais).toHaveLength(1);
    expect(materiais[0]?.codigo).toBe("C");
    expect(descartadas).toEqual([
      { linha: 1, motivo: "sem especificação" },
      { linha: 2, motivo: 'categoria desconhecida "Elétrica"' },
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
      unidade: "und",
      custoMat: 0,
      custoMO: 0,
    });
  });
});
