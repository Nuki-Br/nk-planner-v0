import { describe, expect, it } from "vitest";

import type { DataTableColumn } from "./DataTable";
import { sortRows } from "./sortRows";

interface Row {
  codigo: string;
  nome: string;
  usos: number;
}

const columns: Pick<DataTableColumn<Row>, "key" | "sortValue">[] = [
  { key: "codigo", sortValue: (r) => r.codigo },
  { key: "nome", sortValue: (r) => r.nome },
  { key: "usos", sortValue: (r) => r.usos },
  { key: "acoes" }, // coluna sem ordenação
];

const rows: Row[] = [
  { codigo: "PO-10", nome: "Ébano", usos: 3 },
  { codigo: "PO-2", nome: "areia", usos: 10 },
  { codigo: "PO-1", nome: "Zinco", usos: 2 },
];

describe("sortRows", () => {
  it("sem descriptor devolve as linhas como vieram", () => {
    expect(sortRows(rows, columns, undefined)).toBe(rows);
  });

  it("não muta o array recebido", () => {
    const antes = [...rows];
    sortRows(rows, columns, { column: "nome", direction: "ascending" });
    expect(rows).toEqual(antes);
  });

  it("ordena texto ignorando caixa e acento na comparação pt-BR", () => {
    const out = sortRows(rows, columns, { column: "nome", direction: "ascending" });
    expect(out.map((r) => r.nome)).toEqual(["areia", "Ébano", "Zinco"]);
  });

  it("ordena código numericamente, não lexicograficamente", () => {
    // Lexicograficamente "PO-10" viria antes de "PO-2"; com numeric:true não.
    const out = sortRows(rows, columns, { column: "codigo", direction: "ascending" });
    expect(out.map((r) => r.codigo)).toEqual(["PO-1", "PO-2", "PO-10"]);
  });

  it("ordena números como números", () => {
    const out = sortRows(rows, columns, { column: "usos", direction: "ascending" });
    expect(out.map((r) => r.usos)).toEqual([2, 3, 10]);
  });

  it("respeita a direção descendente", () => {
    const out = sortRows(rows, columns, { column: "usos", direction: "descending" });
    expect(out.map((r) => r.usos)).toEqual([10, 3, 2]);
  });

  it("coluna sem sortValue ou desconhecida não reordena", () => {
    expect(sortRows(rows, columns, { column: "acoes", direction: "ascending" })).toBe(rows);
    expect(sortRows(rows, columns, { column: "zzz", direction: "ascending" })).toBe(rows);
  });
});
