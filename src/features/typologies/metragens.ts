// Lógica do "Editar metragens" (qtd/RT de todos os componentes de uma
// tipologia numa tabela só). Puro: sem React/DOM. A modal guarda as strings dos
// inputs (o usuário digita "18,4", cola "1.234,56"); aqui elas viram número, a
// validação e a lista do que mudou.
import { looksTabular, parseNumberCell } from "@/features/budget/compositionPaste";
import type { MetragemInput, Tipologia, Unidade } from "@/shared/types/domain";

export type MetragemCol = "qtd" | "rt";

/** Strings dos dois inputs de uma linha. */
export interface MetragemCell {
  qtd: string;
  rt: string;
}

/** metragemKey → strings dos inputs. */
export type MetragemDraft = Record<string, MetragemCell>;

export interface MetragemRow {
  key: string;
  /** BlueprintRoom id. */
  ambienteId: number;
  componenteId: number;
  nome: string;
  unidade: Unidade;
  /** Valores gravados — base da comparação. */
  qtd: number;
  rt: number;
}

export interface MetragemGroup {
  ambienteId: number;
  nome: string;
  rows: MetragemRow[];
}

export const metragemKey = (ambienteId: number, componenteId: number) =>
  `${ambienteId}:${componenteId}`;

/** A tipologia como a tabela mostra: um grupo por ambiente, na ordem da planta. */
export function metragemGroups(tip: Tipologia): MetragemGroup[] {
  return tip.ambientes.map((amb) => ({
    ambienteId: amb.blueprintRoomId,
    nome: amb.nome,
    rows: amb.componentes.map((c) => ({
      key: metragemKey(amb.blueprintRoomId, c.id),
      ambienteId: amb.blueprintRoomId,
      componenteId: c.id,
      nome: c.nome,
      unidade: c.unidade,
      qtd: c.qtd,
      rt: c.rt,
    })),
  }));
}

/** 18.4 → "18,4" (sem milhar: o input é para editar, não para ler). */
export function fmtInput(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 4, useGrouping: false });
}

export function initialDraft(groups: readonly MetragemGroup[]): MetragemDraft {
  const out: MetragemDraft = {};
  for (const g of groups) {
    for (const r of g.rows) out[r.key] = { qtd: fmtInput(r.qtd), rt: fmtInput(r.rt) };
  }
  return out;
}

/** Quantidade: obrigatória, ≥ 0. null = inválida. */
export function parseQtd(raw: string): number | null {
  const n = parseNumberCell(raw);
  return n === null || n < 0 ? null : n;
}

/** RT: vazia vale 0 (sem reserva), senão ≥ 0. null = inválida. */
export function parseRt(raw: string): number | null {
  if (raw.trim() === "") return 0;
  const n = parseNumberCell(raw);
  return n === null || n < 0 ? null : n;
}

const EPS = 1e-9;

export interface MetragemRowState {
  qtd: number | null;
  rt: number | null;
  qtdChanged: boolean;
  rtChanged: boolean;
}

/** Estado de uma linha: valores lidos e o que difere do gravado. */
export function rowState(row: MetragemRow, cell: MetragemCell | undefined): MetragemRowState {
  const qtd = cell ? parseQtd(cell.qtd) : row.qtd;
  const rt = cell ? parseRt(cell.rt) : row.rt;
  return {
    qtd,
    rt,
    qtdChanged: qtd === null || Math.abs(qtd - row.qtd) > EPS,
    rtChanged: rt === null || Math.abs(rt - row.rt) > EPS,
  };
}

/**
 * O que vai para o servidor: só as linhas alteradas, com os dois valores (a
 * gravação é por linha). `invalidas` > 0 bloqueia o salvar.
 */
export function metragemChanges(
  groups: readonly MetragemGroup[],
  draft: MetragemDraft
): { itens: MetragemInput[]; invalidas: number } {
  const itens: MetragemInput[] = [];
  let invalidas = 0;
  for (const g of groups) {
    for (const r of g.rows) {
      const s = rowState(r, draft[r.key]);
      if (s.qtd === null || s.rt === null) {
        invalidas++;
        continue;
      }
      if (s.qtdChanged || s.rtChanged) {
        itens.push({ ambienteId: r.ambienteId, componenteId: r.componenteId, qtd: s.qtd, rt: s.rt });
      }
    }
  }
  return { itens, invalidas };
}

/**
 * Colar do Excel: uma coluna (ou duas: Qtd e RT) a partir da célula focada,
 * descendo pelas linhas na ordem da tabela — atravessa ambientes, como a
 * planilha de áreas da construtora. Linha vazia no meio pula a linha (mantém o
 * alinhamento); o que passa do fim é ignorado. null = o texto não é tabular
 * (o input segue com o colar normal).
 */
export function applyPaste(
  rows: readonly MetragemRow[],
  draft: MetragemDraft,
  startKey: string,
  startCol: MetragemCol,
  text: string
): { draft: MetragemDraft; linhas: number } | null {
  if (!looksTabular(text)) return null;
  const start = rows.findIndex((r) => r.key === startKey);
  if (start < 0) return null;
  const cols: MetragemCol[] = startCol === "qtd" ? ["qtd", "rt"] : ["rt"];
  const lines = text.replace(/\r?\n$/, "").split(/\r?\n/);
  const next: MetragemDraft = { ...draft };
  let linhas = 0;
  lines.forEach((line, i) => {
    const row = rows[start + i];
    if (!row) return;
    const cells = line.includes("\t") ? line.split("\t") : line.split(";");
    const cur: MetragemCell = { ...(next[row.key] ?? { qtd: fmtInput(row.qtd), rt: fmtInput(row.rt) }) };
    let tocou = false;
    cols.forEach((col, ci) => {
      const raw = cells[ci]?.trim();
      if (!raw) return;
      cur[col] = raw;
      tocou = true;
    });
    if (tocou) {
      next[row.key] = cur;
      linhas++;
    }
  });
  return { draft: next, linhas };
}
