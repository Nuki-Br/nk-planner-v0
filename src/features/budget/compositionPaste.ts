// Parser do "colar do Excel" da grade "Adicionar itens de custo". Puro: sem
// React/DOM. A planilha da construtora tem as colunas Cód · Nome · Unidade ·
// Qtd · Valor; o usuário seleciona as linhas, Ctrl+C, e cola na grade — cada
// linha vira uma GridRow. Tolerâncias: `;` como separador (CSV exportado),
// linha sem a coluna Cód, "R$ 1,64" e "1.234,56" no valor, unidade em grafia
// livre ("KG", "M2", "Un").
import { parseBR } from "@/lib/utils";
import { normalizeUnidade, type Unidade } from "@/shared/constants/unidades";

export interface PastedRow {
  /** "" = sem código. */
  codigo: string;
  nome: string;
  /** null = não reconhecida (a grade mantém a unidade que já estava). */
  unidade: Unidade | null;
  /** null = coluna ausente/vazia (só existe quando `comQtd`). */
  qtd: number | null;
  /** null = coluna ausente/vazia = preço pendente. */
  preco: number | null;
}

export interface ParseTsvOptions {
  /** Layout com a coluna Qtd (contexto de composição de um material). */
  comQtd: boolean;
}

/** Códigos da planilha são numéricos ("6495") ou quase ("6495-A", "10.2"). */
function isCodigoish(cell: string): boolean {
  return /^\d[\d.\-/]*[a-z]?$/i.test(cell.trim());
}

/**
 * "1,64" → 1.64 · "R$ 10,05" → 10.05 · "1.234,56" → 1234.56 · "8" → 8.
 * null quando a célula não tem dígito nenhum (vazia, "—", "n/a").
 */
export function parseNumberCell(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  let s = raw.replace(/[^\d,.\-]/g, "");
  if (!/\d/.test(s)) return null;
  // Ponto de milhar só quando há vírgula decimal junto ("1.234,56").
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "");
  return parseBR(s);
}

function splitCells(line: string): string[] {
  const cells = line.includes("\t") ? line.split("\t") : line.split(";");
  return cells.map((c) => c.trim());
}

/**
 * Converte o texto colado em linhas da grade. Colunas esperadas:
 * `[Cód, Nome, Unidade, Qtd?, Valor]` (Qtd só com `comQtd`). Quando a linha
 * vem curta e a primeira célula não parece código, assume que o Cód ficou de
 * fora: `[Nome, Unidade, (Qtd), Valor]`. Linhas vazias ou sem nome são
 * descartadas.
 */
export function parseTsv(text: string, opts: ParseTsvOptions): PastedRow[] {
  const full = opts.comQtd ? 5 : 4;
  const out: PastedRow[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === "") continue;
    const cells = splitCells(line);
    const first = cells[0] ?? "";
    const hasCod = cells.length >= full || isCodigoish(first);
    const off = hasCod ? 1 : 0;
    const nome = cells[off] ?? "";
    if (nome === "") continue;
    const unidadeRaw = cells[off + 1] ?? "";
    const qtdRaw = opts.comQtd ? cells[off + 2] : undefined;
    const precoRaw = cells[off + (opts.comQtd ? 3 : 2)];
    out.push({
      codigo: hasCod ? first : "",
      nome,
      unidade: normalizeUnidade(unidadeRaw),
      qtd: opts.comQtd ? parseNumberCell(qtdRaw) : null,
      preco: parseNumberCell(precoRaw),
    });
  }
  return out;
}

/** O texto colado tem cara de planilha (várias linhas ou colunas)? */
export function looksTabular(text: string): boolean {
  return text.includes("\t") || /\r?\n/.test(text.trim());
}
