// Lógica pura do wizard de importação CSV: auto-mapeamento de colunas por
// nome e conversão de linhas cruas em MaterialInput validado. O parsing do
// arquivo em si é do PapaParse (no modal); aqui não há DOM.
import type { MaterialInput } from "@/lib/data/store";
import { normName } from "@/lib/formula";

/** Campo Nuki alvo de uma coluna do CSV ("" = ignorar). */
export type CsvField = "" | "codigo" | "nome" | "fabricante" | "categoria";

export const CSV_FIELD_OPTS: { value: CsvField; label: string }[] = [
  { value: "", label: "Ignorar coluna" },
  { value: "codigo", label: "Código de referência" },
  { value: "nome", label: "Especificação completa" },
  { value: "fabricante", label: "Fabricante" },
  { value: "categoria", label: "Categoria" },
];

/** rowKey = nome da coluna no CSV → campo Nuki. */
export type CsvMapping = Record<string, CsvField>;

// Sinônimos aceitos no auto-mapeamento (chaves já normalizadas via normName).
// Material não tem unidade de medida (ela vem do componente ou do kit) nem
// CUSTO (que é por empreendimento, preenchido na aba "Custos base"), então
// colunas "unidade"/"custo"/"preço" caem todas no "Ignorar".
const HEADER_ALIASES: Record<string, CsvField> = {
  codigo: "codigo",
  codigo_de_referencia: "codigo",
  cod: "codigo",
  ref: "codigo",
  referencia: "codigo",
  nome: "nome",
  descricao: "nome",
  especificacao: "nome",
  especificacao_completa: "nome",
  produto: "nome",
  fabricante: "fabricante",
  marca: "fabricante",
  fornecedor: "fabricante",
  categoria: "categoria",
  tipo: "categoria",
};

/** Sugere o mapeamento inicial a partir dos cabeçalhos detectados. */
export function guessMapping(headers: string[]): CsvMapping {
  const mapping: CsvMapping = {};
  const taken = new Set<CsvField>();
  for (const header of headers) {
    const field = HEADER_ALIASES[normName(header)] ?? "";
    if (field !== "" && !taken.has(field)) {
      mapping[header] = field;
      taken.add(field);
    } else {
      mapping[header] = "";
    }
  }
  return mapping;
}

export interface CsvConversion {
  materiais: MaterialInput[];
  /** Linhas descartadas: índice (1-based, sem o cabeçalho) + motivo PT-BR. */
  descartadas: { linha: number; motivo: string }[];
}

/**
 * Converte as linhas cruas (header: true do PapaParse) em MaterialInput.
 * Regras: nome e categoria obrigatórios; categoria nova é criada no servidor
 * (find-or-create case-insensitive); custos vazios/inválidos viram 0
 * (permanecem pendentes até a revisão/link, como no cadastro manual).
 */
export function convertRows(
  rows: Record<string, string>[],
  mapping: CsvMapping
): CsvConversion {
  const materiais: MaterialInput[] = [];
  const descartadas: CsvConversion["descartadas"] = [];
  const get = (row: Record<string, string>, field: CsvField): string => {
    const col = Object.keys(mapping).find((c) => mapping[c] === field);
    return col !== undefined ? (row[col] ?? "").trim() : "";
  };

  rows.forEach((row, i) => {
    const linha = i + 1;
    const nome = get(row, "nome");
    if (nome === "") {
      descartadas.push({ linha, motivo: "sem especificação" });
      return;
    }
    const categoria = get(row, "categoria");
    if (categoria === "") {
      descartadas.push({ linha, motivo: "sem categoria" });
      return;
    }
    materiais.push({
      codigo: get(row, "codigo"),
      nome,
      fabricante: get(row, "fabricante"),
      categoria,
    });
  });

  return { materiais, descartadas };
}
