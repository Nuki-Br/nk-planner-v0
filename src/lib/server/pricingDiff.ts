// Diff rascunho × publicado e o formato que ele ganha no histórico de versões.
// Puro (sem Prisma) de propósito: o modal "Publicar orçamento", a publicação e
// o drawer de versões leem o MESMO diff — o que o modal promete é o que a
// versão registra — e isso precisa ser testável sem banco.
import { fmtBRL, fmtNum } from "@/lib/utils";
import type {
  Change,
  PricingDiffField,
  PricingDiffRow,
  PublishedPricing,
  VersionChanges,
} from "@/shared/types/domain";

/** Valores resolvidos que a publicação congela no Material.PublishedSnapshot. */
export interface PublishedSnapshotJson {
  valorUnitario: number;
  qtd: number;
  rt: number;
  unidade: string;
  colunas: Record<string, { nome: string; valor: number }>;
  /** Crédito do padrão abatido. Opcional: snapshots antigos não têm. */
  credito?: number;
}

/** Uma aplicação resolvida para publicação: o que grava e como se chama. */
export interface ResolvedRow {
  optionId: number;
  especificacao: string;
  ambiente: string;
  componente: string;
  /** null = a linha não é publicável agora (pendente de custo). */
  total: number | null;
  /** Valores congelados; null quando total é null. */
  snapshot: PublishedSnapshotJson | null;
}

/** Diferença de centavo não é mudança de preço — evita diff que nunca zera. */
function mudou(de: number, para: number): boolean {
  return Math.abs(de - para) >= 0.005;
}

function fmtPct(v: number): string {
  return `${fmtNum(v, Number.isInteger(v) ? 0 : 2)}%`;
}

/**
 * Campos do snapshot que explicam por que o preço da linha mudou. Colunas vão
 * na ordem atual; uma coluna que só existe de um lado conta como 0 do outro
 * (coluna nova valendo 0 não moveu preço nenhum).
 */
export function motivosDe(
  pub: PublishedPricing,
  novo: PublishedSnapshotJson
): PricingDiffField[] {
  const out: PricingDiffField[] = [];
  if (mudou(pub.valorUnitario, novo.valorUnitario)) {
    out.push({ campo: "Valor unitário", de: fmtBRL(pub.valorUnitario), para: fmtBRL(novo.valorUnitario) });
  }
  if (Math.abs(pub.qtd - novo.qtd) >= 0.0001) {
    out.push({ campo: "Qtd", de: fmtNum(pub.qtd, 2), para: fmtNum(novo.qtd, 2) });
  }
  if (Math.abs(pub.rt - novo.rt) >= 0.0001) {
    out.push({ campo: "RT", de: fmtPct(pub.rt), para: fmtPct(novo.rt) });
  }
  if (pub.unidade !== novo.unidade) {
    out.push({ campo: "Unidade", de: pub.unidade, para: novo.unidade });
  }
  if (pub.credito != null && novo.credito != null && mudou(pub.credito, novo.credito)) {
    out.push({ campo: "Crédito do padrão", de: fmtBRL(pub.credito), para: fmtBRL(novo.credito) });
  }
  const ids = [
    ...Object.keys(novo.colunas),
    ...Object.keys(pub.colunas).filter((id) => !(id in novo.colunas)),
  ];
  for (const id of ids) {
    const a = pub.colunas[id];
    const b = novo.colunas[id];
    if (!mudou(a?.valor ?? 0, b?.valor ?? 0)) continue;
    out.push({
      campo: b?.nome ?? a?.nome ?? "Coluna",
      de: a ? fmtBRL(a.valor) : "—",
      para: b ? fmtBRL(b.valor) : "—",
    });
  }
  return out;
}

/**
 * Compara cada linha resolvida com o seu publicado. Só entra no diff o que
 * muda o PREÇO — é o mesmo critério do badge "N alterações não publicadas".
 */
export function diffRows(
  rows: ResolvedRow[],
  published: Map<number, PublishedPricing | null>
): { rows: PricingDiffRow[]; algumPublicado: boolean } {
  const diff: PricingDiffRow[] = [];
  let algumPublicado = false;
  for (const row of rows) {
    const pub = published.get(row.optionId) ?? null;
    if (pub) algumPublicado = true;

    // Campos explícitos: o diff vai para o Json da versão, e total/snapshot
    // não fazem parte dele.
    const base = {
      optionId: row.optionId,
      especificacao: row.especificacao,
      ambiente: row.ambiente,
      componente: row.componente,
    };
    if (!pub && row.total != null) {
      diff.push({ ...base, de: null, para: row.total, tipo: "novo", motivos: [] });
    } else if (pub && row.total == null) {
      // Deixou de ser calculável (custo apagado): publicar vai LIMPAR o preço.
      diff.push({ ...base, de: pub.preco, para: null, tipo: "removido", motivos: [] });
    } else if (pub && row.total != null && mudou(pub.preco, row.total)) {
      diff.push({
        ...base,
        de: pub.preco,
        para: row.total,
        tipo: "alterado",
        motivos: row.snapshot ? motivosDe(pub, row.snapshot) : [],
      });
    }
  }
  return { rows: diff, algumPublicado };
}

// ─── Leitura do Json de BudgetVersion.Changes ──────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const isNumOrNull = (v: unknown): v is number | null => v === null || typeof v === "number";

function isField(v: unknown): v is PricingDiffField {
  return (
    isRecord(v) &&
    typeof v.campo === "string" &&
    typeof v.de === "string" &&
    typeof v.para === "string"
  );
}

function toDiffRow(v: unknown): PricingDiffRow | null {
  if (!isRecord(v)) return null;
  if (
    typeof v.optionId !== "number" ||
    typeof v.especificacao !== "string" ||
    typeof v.ambiente !== "string" ||
    typeof v.componente !== "string" ||
    !isNumOrNull(v.de) ||
    !isNumOrNull(v.para) ||
    (v.tipo !== "novo" && v.tipo !== "alterado" && v.tipo !== "removido")
  ) {
    return null;
  }
  return {
    optionId: v.optionId,
    especificacao: v.especificacao,
    ambiente: v.ambiente,
    componente: v.componente,
    de: v.de,
    para: v.para,
    tipo: v.tipo,
    motivos: Array.isArray(v.motivos) ? v.motivos.filter(isField) : [],
  };
}

function toChanges(v: unknown): Change[] {
  if (!Array.isArray(v)) return [];
  return v.filter(
    (c): c is Change =>
      isRecord(c) &&
      typeof c.desc === "string" &&
      (c.tipo === "adicionado" || c.tipo === "alterado" || c.tipo === "removido")
  );
}

/**
 * Json gravado → VersionChanges, tolerante aos dois formatos: publicação
 * (`precos` + `avisos`) e o descritivo antigo (materiais/custos/taxas/
 * tipologias). Versões publicadas antes de o diff ser gravado não têm `precos`
 * e ficam com `precos: null` — a tela diz que o diff não foi registrado em vez
 * de fingir que nada mudou.
 */
export function parseVersionChanges(v: unknown): VersionChanges {
  const o = isRecord(v) ? v : {};
  return {
    precos: Array.isArray(o.precos)
      ? o.precos.map(toDiffRow).filter((r): r is PricingDiffRow => r !== null)
      : null,
    avisos: Array.isArray(o.avisos)
      ? o.avisos.filter((a): a is string => typeof a === "string")
      : [],
    materiais: toChanges(o.materiais),
    custos: toChanges(o.custos),
    taxas: toChanges(o.taxas),
    tipologias: toChanges(o.tipologias),
  };
}
