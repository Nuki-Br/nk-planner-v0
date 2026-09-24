import { describe, expect, it } from "vitest";

import type { CompositionLine, CustoBase } from "@/shared/types/domain";

import {
  composicaoSubtotal,
  custoBaseBreakdown,
  custoBasePendente,
  custoBaseStatus,
  custoBaseTotal,
  linhasPendentes,
} from "./custoBase";

// Composição da planilha da construtora (por m² de porcelanato 90×90).
const linha = (
  id: number,
  nome: string,
  qtd: number,
  preco: number | null,
  unidade: CompositionLine["unidade"] = "kg"
): CompositionLine => ({
  id,
  itemId: id,
  codigo: String(id),
  nome,
  unidade,
  qtd,
  preco,
  ordem: id,
});

const PORCELANATO: CustoBase = {
  baseId: 1,
  custoMat: 98.445,
  custoMO: 0,
  custoQtd: 1.2,
  composicao: [
    linha(1, "Argamassa colante ACIII cinza", 8, 1.63875),
    linha(2, "Rejunte flexível", 0.07, 10.04625),
    linha(3, "Espaçador plástico 2 mm", 8, 0.627, "und"),
    linha(4, "Nivelador de piso", 8, 0.09975, "und"),
    linha(5, "Frete porcelanato", 1, 7.7037, "m²"),
    linha(6, "Assentamento de piso em porcelanato 90×90", 1, 106.875, "m²"),
  ],
};

describe("custoBaseTotal", () => {
  it("soma material × coeficiente + MO + Σ linhas (exemplo da planilha)", () => {
    const b = custoBaseBreakdown(PORCELANATO);
    expect(b.material).toBeCloseTo(118.134, 3);
    expect(b.composicao).toBeCloseTo(134.21, 2);
    expect(custoBaseTotal(PORCELANATO)).toBeCloseTo(252.34, 2);
  });

  it("sem composição é o custo 'cheio' (mat + MO) como antes", () => {
    const c: CustoBase = { baseId: 2, custoMat: 100, custoMO: 40, custoQtd: 1, composicao: [] };
    expect(custoBaseTotal(c)).toBe(140);
  });

  it("insumo pendente conta 0 no total e material ausente conta 0", () => {
    const c: CustoBase = {
      ...PORCELANATO,
      custoMat: null,
      composicao: [linha(1, "Argamassa", 8, null)],
    };
    expect(custoBaseTotal(c)).toBe(0);
    expect(custoBaseTotal(undefined)).toBe(0);
    expect(composicaoSubtotal(c.composicao)).toBe(0);
  });
});

describe("custoBasePendente / custoBaseStatus", () => {
  it("preenchido quando material e todos os insumos têm preço", () => {
    expect(custoBasePendente(PORCELANATO)).toBe(false);
    expect(custoBaseStatus(PORCELANATO)).toBe("preenchido");
  });

  it("pendente quando o material nunca foi preenchido, mesmo com MO", () => {
    const c: CustoBase = { baseId: 3, custoMat: null, custoMO: 50, custoQtd: 1, composicao: [] };
    expect(custoBasePendente(c)).toBe(true);
    expect(custoBaseStatus(c)).toBe("pendente");
    expect(custoBaseStatus(undefined)).toBe("pendente");
  });

  it("pendente quando UM insumo da composição está sem preço", () => {
    const c: CustoBase = {
      ...PORCELANATO,
      composicao: [...PORCELANATO.composicao, linha(7, "Manta de proteção", 1.05, null, "m²")],
    };
    expect(custoBasePendente(c)).toBe(true);
    expect(custoBaseStatus(c)).toBe("pendente");
    expect(linhasPendentes(c).map((l) => l.nome)).toEqual(["Manta de proteção"]);
  });

  it("'sem custo' é o zero marcado num material SEM composição", () => {
    const semCusto: CustoBase = { baseId: 4, custoMat: 0, custoMO: 0, custoQtd: 1, composicao: [] };
    expect(custoBaseStatus(semCusto)).toBe("sem_custo");
    expect(custoBasePendente(semCusto)).toBe(false);
    // Com linhas, o zero do material é só uma parcela zerada: status "preenchido".
    const comLinhas: CustoBase = { ...semCusto, composicao: [linha(1, "Assentamento", 1, 50, "m²")] };
    expect(custoBaseStatus(comLinhas)).toBe("preenchido");
    expect(custoBaseTotal(comLinhas)).toBe(50);
  });
});
