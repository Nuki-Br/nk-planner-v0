// Exportação da aba "Preço final" para Excel (.xlsx) — uma planilha por
// tipologia, com a mesma leitura da tela: faixa do ambiente, seções padrão /
// personalizados, separação por componente, sub-linhas recuadas e totais. As
// linhas vêm prontas de ./precoFinalExport.ts; aqui é só formatação.
//
// O exceljs é carregado sob demanda (import dinâmico) para não pesar no bundle
// da tela — só baixa quando alguém clica em exportar.
import type { Borders, Cell, Fill, Font, Row, Workbook, Worksheet } from "exceljs";

import type { BudgetColumn } from "@/shared/types/domain";

import type { ColCell, ExportItemRow, PrecoFinalSheet } from "./precoFinalExport";

// Paleta da tabela (tailwind.config.ts) em ARGB.
const C = {
  preto: "FF1F1F1F",
  branco: "FFFFFFFF",
  cinza2: "FFFAFAFA",
  cinza4: "FFF0F0F0",
  cinza5: "FFD9D9D9",
  cinza6: "FFBFBFBF",
  cinza7: "FF8C8C8C",
  cinza8: "FF595959",
  teal: "FF047676",
  tealClaro: "FFE6FAFA",
  padraoBg: "FFF4FFFE",
  kitBg: "FFFBF6FF",
  laranja: "FFC2410C",
  laranjaClaro: "FFFFF7ED",
  pendenteBg: "FFFFFBE6",
  pendenteFg: "FFB45309",
} as const;

const FMT_BRL = '"R$ "#,##0.00';
const FMT_DEB = '"Déb. R$ "#,##0.00';
const FMT_CRED = '"Créd. R$ "#,##0.00';
const FMT_QTD = "#,##0.00";

const fill = (argb: string): Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
const font = (f: Partial<Font>): Partial<Font> => ({ name: "Calibri", size: 10, ...f });
const linha = (argb: string): Partial<Borders> => ({ bottom: { style: "thin", color: { argb } } });

interface Layout {
  cols: BudgetColumn[];
  usaDC: boolean;
  /** Índice (1-based) de cada coluna da planilha. */
  idx: {
    componente: number;
    especificacao: number;
    detalhe: number;
    qtd: number;
    unidade: number;
    valUn: number;
    debCred: number | null;
    custoTroca: number;
    primeiraLivre: number;
    total: number;
    obs: number;
  };
  ultima: number;
}

function layoutOf(cols: BudgetColumn[], usaDC: boolean): Layout {
  const debCred = usaDC ? 7 : null;
  const custoTroca = usaDC ? 8 : 7;
  const primeiraLivre = custoTroca + 1;
  const total = primeiraLivre + cols.length;
  return {
    cols,
    usaDC,
    idx: {
      componente: 1,
      especificacao: 2,
      detalhe: 3,
      qtd: 4,
      unidade: 5,
      valUn: 6,
      debCred,
      custoTroca,
      primeiraLivre,
      total,
      obs: total + 1,
    },
    ultima: total + 1,
  };
}

/** Linha que atravessa a tabela inteira (ambiente, seção, vazio, aviso). */
function faixa(
  ws: Worksheet,
  L: Layout,
  texto: string,
  bg: string,
  f: Partial<Font>,
  altura = 18
): Row {
  const row = ws.addRow([texto]);
  ws.mergeCells(row.number, 1, row.number, L.ultima);
  const cell = row.getCell(1);
  cell.fill = fill(bg);
  cell.font = font(f);
  cell.alignment = { vertical: "middle", indent: 1 };
  row.height = altura;
  return row;
}

function setNum(cell: Cell, v: number | null, numFmt: string): void {
  if (v === null) {
    cell.value = "—";
    cell.alignment = { horizontal: "right", vertical: "middle" };
    cell.font = font({ color: { argb: C.cinza6 } });
    return;
  }
  cell.value = v;
  cell.numFmt = numFmt;
}

function setColCell(cell: Cell, v: ColCell): void {
  if (v === "#ERR") {
    cell.value = "#ERR";
    cell.alignment = { horizontal: "right" };
    cell.font = font({ bold: true, color: { argb: "FFE45F61" } });
    return;
  }
  setNum(cell, v, FMT_BRL);
}

function itemRow(ws: Worksheet, L: Layout, it: ExportItemRow): void {
  const { idx } = L;
  const row = ws.addRow([]);
  const sub = it.nivel === 1;
  const { pendente, isKit } = it;
  const bg = sub
    ? C.branco
    : pendente
      ? C.pendenteBg
      : it.lado === "padrao"
        ? C.padraoBg
        : isKit
          ? C.kitBg
          : C.branco;

  // Base: fundo, fonte e a borda fina entre linhas em todas as células.
  for (let c = 1; c <= L.ultima; c++) {
    const cell = row.getCell(c);
    cell.fill = fill(bg);
    cell.font = font({ size: sub ? 9 : 10, color: { argb: sub ? C.cinza8 : C.preto } });
    cell.border = linha(C.cinza4);
    cell.alignment = { vertical: "middle" };
  }

  // Componente: forte só na primeira linha do grupo — as seguintes repetem o
  // nome (para o filtro do Excel funcionar) mas apagadas, e a separação entre
  // componentes é uma borda um pouco mais escura em cima do grupo.
  const comp = row.getCell(idx.componente);
  comp.value = it.componente;
  comp.font = it.inicioGrupo
    ? font({ bold: true })
    : font({ size: sub ? 9 : 10, color: { argb: C.cinza6 } });
  if (it.inicioGrupo) {
    for (let c = 1; c <= L.ultima; c++) {
      const cell = row.getCell(c);
      cell.border = { ...linha(C.cinza4), top: { style: "thin", color: { argb: C.cinza5 } } };
    }
  }

  const esp = row.getCell(idx.especificacao);
  esp.value = it.especificacao;
  esp.font = font(
    sub
      ? { size: 9, color: { argb: C.cinza8 } }
      : { bold: true, color: { argb: pendente ? C.pendenteFg : C.preto } }
  );
  esp.alignment = { vertical: "middle", indent: sub ? 2 : 0, wrapText: true };

  const det = row.getCell(idx.detalhe);
  det.value = it.detalhe;
  det.font = font({ size: 9, color: { argb: C.cinza7 } });

  setNum(row.getCell(idx.qtd), it.qtd, FMT_QTD);
  row.getCell(idx.unidade).value = it.unidade;
  setNum(row.getCell(idx.valUn), it.valUn, FMT_BRL);
  if (isKit && !sub) {
    // Kit não tem valor unitário: o valor é a soma dos sub-itens.
    const vu = row.getCell(idx.valUn);
    vu.value = "soma dos itens";
    vu.alignment = { horizontal: "right" };
    vu.font = font({ size: 9, color: { argb: C.cinza7 } });
  }

  if (idx.debCred !== null) {
    const credito = it.lado === "padrao";
    const dc = row.getCell(idx.debCred);
    setNum(dc, it.debCred, credito ? FMT_CRED : FMT_DEB);
    if (it.debCred !== null) {
      dc.font = font({
        size: sub ? 9 : 10,
        bold: !sub,
        color: { argb: credito ? C.teal : C.laranja },
      });
    }
  }

  setNum(row.getCell(idx.custoTroca), it.custoTroca, FMT_BRL);
  it.colunas.forEach((v, i) => setColCell(row.getCell(idx.primeiraLivre + i), v));

  const tot = row.getCell(idx.total);
  setNum(tot, it.total, FMT_BRL);
  if (it.total !== null) {
    tot.fill = fill(C.tealClaro);
    tot.font = font({ bold: true, color: { argb: C.teal } });
  }

  const obs = row.getCell(idx.obs);
  obs.value = it.obs;
  obs.font = font({
    size: 9,
    bold: pendente,
    color: { argb: pendente ? C.pendenteFg : C.cinza7 },
  });
  obs.alignment = { vertical: "middle", wrapText: true };
}

function totalRow(
  ws: Worksheet,
  L: Layout,
  label: string,
  valor: number,
  geral: boolean
): void {
  const row = ws.addRow([]);
  ws.mergeCells(row.number, 1, row.number, L.idx.total - 1);
  const lab = row.getCell(1);
  lab.value = label;
  lab.alignment = { horizontal: "right", vertical: "middle" };
  lab.font = font({ bold: true, size: geral ? 11 : 10, color: { argb: geral ? C.preto : C.cinza8 } });
  const tot = row.getCell(L.idx.total);
  tot.value = valor;
  tot.numFmt = FMT_BRL;
  tot.font = font({ bold: true, size: geral ? 12 : 11, color: { argb: geral ? C.branco : C.teal } });
  tot.fill = fill(geral ? C.teal : C.tealClaro);
  if (!geral) {
    for (let c = 1; c <= L.ultima; c++) {
      const cell = row.getCell(c);
      if (c !== L.idx.total) cell.fill = fill(C.cinza2);
      cell.border = {
        top: { style: "medium", color: { argb: C.cinza5 } },
        bottom: { style: "thin", color: { argb: C.cinza4 } },
      };
    }
  }
  row.height = geral ? 22 : 18;
}

function headerRow(ws: Worksheet, L: Layout): void {
  const { idx } = L;
  const titulos: [number, string][] = [
    [idx.componente, "Componente"],
    [idx.especificacao, "Especificação"],
    [idx.detalhe, "Fabricante / detalhe"],
    [idx.qtd, "Qtd c/ RT"],
    [idx.unidade, "Un."],
    [idx.valUn, "Valor un."],
    [idx.custoTroca, L.usaDC ? "Custo troca" : "Custo total"],
    [idx.total, "Total final"],
    [idx.obs, "Observação"],
  ];
  if (idx.debCred !== null) titulos.push([idx.debCred, "Déb./Créd."]);
  L.cols.forEach((col, i) => titulos.push([idx.primeiraLivre + i, col.nome]));

  const row = ws.addRow([]);
  for (const [c, t] of titulos) {
    const cell = row.getCell(c);
    cell.value = t.toUpperCase();
    const teal = c === idx.total;
    cell.fill = fill(teal ? C.tealClaro : C.cinza2);
    cell.font = font({ bold: true, size: 9, color: { argb: teal ? C.teal : C.cinza7 } });
    cell.border = { bottom: { style: "medium", color: { argb: C.cinza5 } } };
    const esquerda = c === idx.componente || c === idx.especificacao || c === idx.detalhe || c === idx.obs;
    cell.alignment = {
      vertical: "middle",
      horizontal: esquerda ? "left" : teal ? "center" : "right",
    };
  }
  row.height = 20;
}

function larguras(ws: Worksheet, L: Layout): void {
  const { idx } = L;
  const w: Record<number, number> = {
    [idx.componente]: 22,
    [idx.especificacao]: 40,
    [idx.detalhe]: 22,
    [idx.qtd]: 11,
    [idx.unidade]: 6,
    [idx.valUn]: 15,
    [idx.custoTroca]: 15,
    [idx.total]: 16,
    [idx.obs]: 38,
  };
  if (idx.debCred !== null) w[idx.debCred] = 20;
  L.cols.forEach((_, i) => (w[idx.primeiraLivre + i] = 15));
  for (let c = 1; c <= L.ultima; c++) ws.getColumn(c).width = w[c] ?? 14;
}

/** Nome de aba válido no Excel: até 31 caracteres, sem : \ / ? * [ ] e único. */
function nomeAba(nome: string, usados: Set<string>): string {
  const base = (nome.replace(/[:\\/?*[\]]/g, " ").trim() || "Tipologia").slice(0, 31);
  let out = base;
  for (let n = 2; usados.has(out.toLowerCase()); n++) {
    const suf = ` (${n})`;
    out = base.slice(0, 31 - suf.length) + suf;
  }
  usados.add(out.toLowerCase());
  return out;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

const dataBR = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;

export interface PrecoFinalXlsxInput {
  projeto: string;
  sheets: PrecoFinalSheet[];
  cols: BudgetColumn[];
  usaDC: boolean;
  /** Momento da exportação (cabeçalho e nome do arquivo). */
  agora?: Date;
}

/** Monta o workbook — separado do download para ser testável fora do navegador. */
export async function buildPrecoFinalWorkbook({
  projeto,
  sheets,
  cols,
  usaDC,
  agora = new Date(),
}: PrecoFinalXlsxInput): Promise<Workbook> {
  const mod = await import("exceljs");
  // O bundle UMD do exceljs chega como CommonJS: o `default` da interop é o
  // module.exports; o namespace fica de reserva.
  const { Workbook } = mod.default ?? mod;

  const data = dataBR(agora);
  const hora = `${pad2(agora.getHours())}:${pad2(agora.getMinutes())}`;

  const wb = new Workbook();
  wb.creator = "Nuki Planner";
  wb.created = agora;
  const L = layoutOf(cols, usaDC);
  const usados = new Set<string>();

  for (const sheet of sheets) {
    const ws = wb.addWorksheet(nomeAba(sheet.tipologia, usados), {
      views: [{ state: "frozen", xSplit: 2, ySplit: 4 }],
      pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });
    larguras(ws, L);

    const titulo = ws.addRow([`Preço final — ${sheet.tipologia}`]);
    titulo.getCell(1).font = font({ bold: true, size: 14 });
    titulo.height = 22;
    const meta = ws.addRow([`${projeto} · exportado em ${data} às ${hora}`]);
    meta.getCell(1).font = font({ color: { argb: C.cinza7 } });
    ws.addRow([]);
    headerRow(ws, L);

    for (const r of sheet.rows) {
      switch (r.kind) {
        case "ambiente":
          faixa(ws, L, r.nome.toUpperCase(), C.preto, { bold: true, color: { argb: C.branco } }, 20);
          break;
        case "secao":
          faixa(
            ws,
            L,
            r.titulo.toUpperCase(),
            r.lado === "padrao" ? C.tealClaro : C.laranjaClaro,
            { bold: true, size: 9, color: { argb: r.lado === "padrao" ? C.teal : C.laranja } },
            16
          );
          break;
        case "vazio":
          faixa(ws, L, r.titulo, C.branco, { italic: true, size: 9, color: { argb: C.cinza7 } });
          break;
        case "item":
          itemRow(ws, L, r);
          break;
        case "totalAmbiente":
          totalRow(ws, L, `Total — ${r.nome}`, r.total, false);
          ws.addRow([]);
          break;
      }
    }

    totalRow(ws, L, `Total geral — ${sheet.tipologia}`, sheet.totalGeral, true);

    if (sheet.pendentes > 0) {
      ws.addRow([]);
      faixa(
        ws,
        L,
        `${sheet.pendentes} ${sheet.pendentes === 1 ? "item aguarda" : "itens aguardam"} preenchimento de custos pela construtora e ${sheet.pendentes === 1 ? "foi excluído" : "foram excluídos"} do cálculo.`,
        C.pendenteBg,
        { bold: true, size: 9, color: { argb: C.pendenteFg } }
      );
    }
  }

  return wb;
}

/** Monta o .xlsx e dispara o download no navegador. */
export async function downloadPrecoFinalXlsx(input: PrecoFinalXlsxInput): Promise<void> {
  const agora = input.agora ?? new Date();
  const wb = await buildPrecoFinalWorkbook({ ...input, agora });
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const arquivo = `Preço final - ${input.projeto} - ${dataBR(agora).replace(/\//g, "-")}.xlsx`.replace(
    /[\\/:*?"<>|]/g,
    "-"
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = arquivo;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
