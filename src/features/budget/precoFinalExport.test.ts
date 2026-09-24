import { describe, expect, it } from "vitest";

import { createSeed } from "@/lib/data/seed";
import { TAX_COLUMNS_DEFAULT } from "@/shared/constants/budget";

import { ambTotal, isRowPending, type BudgetDeps } from "./calc";
import { buildPrecoFinalSheet, type ExportItemRow, type ExportRow } from "./precoFinalExport";
import { buildPrecoFinalWorkbook } from "./precoFinalXlsx";

const seed = createSeed();
const deps = (extra?: Partial<BudgetDeps>): BudgetDeps => ({
  materiais: seed.materiais,
  kits: seed.kits,
  cols: TAX_COLUMNS_DEFAULT,
  custosBase: seed.custosBase,
  pricings: {},
  ...extra,
});

const isItem = (r: ExportRow): r is ExportItemRow => r.kind === "item";

/** Fatia as linhas por ambiente (do cabeçalho do ambiente até o total dele). */
function porAmbiente(rows: ExportRow[]): ExportRow[][] {
  const out: ExportRow[][] = [];
  for (const r of rows) {
    if (r.kind === "ambiente") out.push([]);
    out[out.length - 1]?.push(r);
  }
  return out;
}

describe("buildPrecoFinalSheet", () => {
  for (const tip of seed.tipologias) {
    describe(tip.nome, () => {
      const d = deps();
      const sheet = buildPrecoFinalSheet(d, tip);

      it("total geral e totais por ambiente batem com o motor da tabela", () => {
        const esperado = tip.ambientes.map((a) => ambTotal(d, a));
        const totais = sheet.rows.flatMap((r) => (r.kind === "totalAmbiente" ? [r.total] : []));
        expect(totais).toEqual(esperado);
        expect(sheet.totalGeral).toBeCloseTo(esperado.reduce((a, v) => a + v, 0), 6);
      });

      it("o total do ambiente é a soma das linhas de upgrade não pendentes", () => {
        for (const bloco of porAmbiente(sheet.rows)) {
          const soma = bloco
            .filter(isItem)
            .filter((r) => r.nivel === 0 && r.lado === "upgrade" && !r.pendente)
            .reduce((a, r) => a + (r.total ?? 0), 0);
          const total = bloco.find((r) => r.kind === "totalAmbiente");
          expect(total?.kind === "totalAmbiente" && total.total).toBeCloseTo(soma, 6);
        }
      });

      it("pendentes é o mesmo aviso do rodapé da tabela", () => {
        let n = 0;
        for (const amb of tip.ambientes)
          for (const comp of amb.componentes)
            for (const opt of comp.options) if (!opt.isDefault && isRowPending(d, comp, opt)) n++;
        expect(sheet.pendentes).toBe(n);
      });

      it("uma célula por coluna livre em toda linha", () => {
        for (const r of sheet.rows.filter(isItem)) expect(r.colunas).toHaveLength(d.cols.length);
      });

      it("upgrades agrupados por componente: um início de grupo por componente, em sequência", () => {
        for (const bloco of porAmbiente(sheet.rows)) {
          const upg = bloco.filter(isItem).filter((r) => r.lado === "upgrade" && r.nivel === 0);
          const inicios = upg.filter((r) => r.inicioGrupo).map((r) => r.componente);
          // cada componente abre um grupo só, e as linhas dele vêm juntas
          expect(new Set(inicios).size).toBe(inicios.length);
          const ordem = upg.map((r) => r.componente).filter((c, i, arr) => c !== arr[i - 1]);
          expect(ordem).toEqual(inicios);
        }
      });

      it("linha pendente não tem total", () => {
        for (const r of sheet.rows.filter(isItem)) if (r.pendente) expect(r.total).toBeNull();
      });
    });
  }

  it("sem débito/crédito, os títulos de seção mudam", () => {
    const sheet = buildPrecoFinalSheet(deps({ usaDebitoCredito: false }), seed.tipologias[0]!);
    const titulos = sheet.rows.flatMap((r) => (r.kind === "secao" ? [r.titulo] : []));
    expect(titulos).toContain("Acabamentos personalizados — custo cobrado do cliente");
  });
});

describe("buildPrecoFinalWorkbook", () => {
  it("gera uma aba por tipologia, com cabeçalho e total geral, e o .xlsx relê", async () => {
    const d = deps();
    const sheets = seed.tipologias.map((t) => buildPrecoFinalSheet(d, t));
    const wb = await buildPrecoFinalWorkbook({
      projeto: "Residencial Teste",
      sheets,
      cols: d.cols,
      usaDC: true,
      agora: new Date(2026, 8, 24, 14, 5),
    });
    const buf = await wb.xlsx.writeBuffer();

    const { Workbook } = await import("exceljs");
    const lido = new Workbook();
    await lido.xlsx.load(buf);
    expect(lido.worksheets.map((w) => w.name)).toEqual(
      seed.tipologias.map((t) => t.nome.replace(/[:\\/?*[\]]/g, " ").trim().slice(0, 31))
    );

    const ws = lido.worksheets[0]!;
    expect(ws.getCell(2, 1).value).toBe("Residencial Teste · exportado em 24/09/2026 às 14:05");
    expect(ws.getCell(4, 1).value).toBe("COMPONENTE");

    // última linha com "Total geral" carrega o total da tipologia
    let totalGeral: number | null = null;
    ws.eachRow((row) => {
      if (String(row.getCell(1).value).startsWith("Total geral")) {
        const v = row.getCell(8 + d.cols.length + 1).value;
        totalGeral = typeof v === "number" ? v : null;
      }
    });
    expect(totalGeral).toBeCloseTo(sheets[0]!.totalGeral, 6);
  });
});
