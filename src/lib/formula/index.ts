// Motor de fórmulas do Construtor de Preço — porte fiel de
// docs/prototype-src/data.js (linhas 353-463). Puro: sem React/DOM/dados.
// As mensagens de erro PT-BR são contrato de UI (tooltips #ERR na Fase 7):
// não alterar a redação.

/** Erro de fórmula com mensagem PT-BR exibível na UI. */
export class FormulaError extends Error {
  readonly msg: string;

  constructor(msg: string) {
    super(msg);
    this.name = "FormulaError";
    this.msg = msg;
  }
}

/** Escopo de referências: token normalizado (normName) → valor numérico. */
export type Scope = Record<string, number>;

export interface CellResult {
  value: number;
  error: string | null;
}

/**
 * Normaliza um nome de coluna em token de referência: NFD, remove acentos,
 * minúsculas, trim, não-alfanumérico → "_", remove "_" das pontas.
 * Ex.: "Taxa Construtora" → "taxa_construtora".
 */
export function normName(s: string | null | undefined): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

type Tok =
  | { t: "+" | "-" | "*" | "/" | "(" | ")" | "%" }
  | { t: "num"; v: number }
  | { t: "id"; v: string; raw: string };

/**
 * Avalia uma fórmula SEM o "=" inicial contra um escopo token → número.
 * Suporta + - * / %, parênteses, números (vírgula decimal) e identificadores;
 * "10%" é açúcar para 0.10 (pós-fixo ÷100). Lança FormulaError em erro de
 * sintaxe ou referência desconhecida.
 */
export function evalFormula(src: string, scope: Scope): number {
  // ── tokenizador ──
  const toks: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src.charAt(i);
    if (c === " " || c === "\t") {
      i++;
      continue;
    }
    if (c === "+" || c === "-" || c === "*" || c === "/" || c === "(" || c === ")" || c === "%") {
      toks.push({ t: c });
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let j = i + 1;
      while (j < src.length && /[0-9.,]/.test(src.charAt(j))) j++;
      const num = parseFloat(src.slice(i, j).replace(",", "."));
      if (isNaN(num)) throw new FormulaError("número inválido");
      toks.push({ t: "num", v: num });
      i = j;
      continue;
    }
    if (/[\p{L}_]/u.test(c)) {
      let j = i + 1;
      while (j < src.length && /[\p{L}\p{N}_]/u.test(src.charAt(j))) j++;
      const raw = src.slice(i, j);
      toks.push({ t: "id", v: normName(raw), raw });
      i = j;
      continue;
    }
    throw new FormulaError(`caractere inválido "${c}"`);
  }
  if (toks.length === 0) throw new FormulaError("fórmula vazia");

  // ── parser recursivo-descendente ──
  let pos = 0;
  const peek = (): Tok | undefined => toks[pos];
  const eat = (): Tok => {
    const tk = toks[pos++];
    // Inalcançável: todo eat() é precedido de peek(); satisfaz o narrowing.
    if (!tk) throw new FormulaError("expressão incompleta");
    return tk;
  };

  function parseExpr(): number {
    // + -
    let v = parseTerm();
    let nx = peek();
    while (nx && (nx.t === "+" || nx.t === "-")) {
      const op = eat().t;
      const r = parseTerm();
      v = op === "+" ? v + r : v - r;
      nx = peek();
    }
    return v;
  }

  function parseTerm(): number {
    // * /
    let v = parseFactor();
    let nx = peek();
    while (nx && (nx.t === "*" || nx.t === "/")) {
      const op = eat().t;
      const r = parseFactor();
      if (op === "/") {
        if (r === 0) throw new FormulaError("divisão por zero");
        v = v / r;
      } else {
        v = v * r;
      }
      nx = peek();
    }
    return v;
  }

  function parseFactor(): number {
    // unário +/-, depois primário, depois pós-fixo %
    let neg = false;
    let nx = peek();
    while (nx && (nx.t === "+" || nx.t === "-")) {
      if (eat().t === "-") neg = !neg;
      nx = peek();
    }
    let v = parsePrimary();
    nx = peek();
    while (nx && nx.t === "%") {
      eat();
      v = v / 100;
      nx = peek();
    }
    return neg ? -v : v;
  }

  function parsePrimary(): number {
    const tk = peek();
    if (!tk) throw new FormulaError("expressão incompleta");
    if (tk.t === "num") {
      eat();
      return tk.v;
    }
    if (tk.t === "id") {
      eat();
      const val = scope[tk.v];
      if (val === undefined) throw new FormulaError(`coluna "${tk.raw}" não encontrada`);
      return val;
    }
    if (tk.t === "(") {
      eat();
      const v = parseExpr();
      const close = peek();
      if (!close || close.t !== ")") throw new FormulaError("parêntese não fechado");
      eat();
      return v;
    }
    throw new FormulaError("token inesperado");
  }

  const result = parseExpr();
  if (pos < toks.length) throw new FormulaError("sintaxe inválida");
  if (!isFinite(result)) throw new FormulaError("resultado inválido");
  return result;
}

/**
 * Contrato por célula: vazio → {0, null}; "=..." → evalFormula; senão número
 * puro (vírgula decimal; "%" → ÷100; não-numérico → erro "valor inválido").
 * Nunca lança.
 */
export function evalCell(expr: string | null | undefined, scope: Scope): CellResult {
  const raw = String(expr ?? "").trim();
  if (raw === "") return { value: 0, error: null };
  try {
    if (raw.startsWith("=")) return { value: evalFormula(raw.slice(1), scope), error: null };
    const n = parseFloat(raw.replace("%", "").replace(",", "."));
    if (isNaN(n)) return { value: 0, error: "valor inválido" };
    return { value: raw.includes("%") ? n / 100 : n, error: null };
  } catch (e: unknown) {
    return { value: 0, error: e instanceof FormulaError ? e.msg : "erro de fórmula" };
  }
}
