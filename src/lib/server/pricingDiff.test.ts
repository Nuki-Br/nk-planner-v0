import { describe, expect, it } from "vitest";

import type { PublishedPricing } from "@/shared/types/domain";

import {
  diffRows,
  motivosDe,
  parseVersionChanges,
  type PublishedSnapshotJson,
  type ResolvedRow,
} from "./pricingDiff";

const snap = (over: Partial<PublishedSnapshotJson> = {}): PublishedSnapshotJson => ({
  valorUnitario: 54,
  qtd: 18,
  rt: 10,
  unidade: "m²",
  colunas: { "1": { nome: "Margem", valor: 200 } },
  credito: 300,
  ...over,
});

const pub = (preco: number, over: Partial<PublishedPricing> = {}): PublishedPricing => ({
  preco,
  ...snap(),
  unidade: "m²",
  credito: 300,
  publicadoEm: "20/09/2026 10:00",
  versaoLabel: "v1",
  ...over,
});

const row = (optionId: number, total: number | null, s: PublishedSnapshotJson | null = snap()): ResolvedRow => ({
  optionId,
  especificacao: `Opção ${optionId}`,
  ambiente: "Sala",
  componente: "Piso",
  total,
  snapshot: total == null ? null : s,
});

describe("diffRows", () => {
  it("classifica novo, alterado e removido e ignora o que não mudou de preço", () => {
    const published = new Map<number, PublishedPricing | null>([
      [1, null],
      [2, pub(1000)],
      [3, pub(500)],
      [4, pub(800)],
    ]);
    const { rows, algumPublicado } = diffRows(
      [row(1, 700), row(2, 1100, snap({ valorUnitario: 58 })), row(3, null), row(4, 800.004)],
      published
    );
    expect(algumPublicado).toBe(true);
    expect(rows.map((r) => [r.optionId, r.tipo, r.de, r.para])).toEqual([
      [1, "novo", null, 700],
      [2, "alterado", 1000, 1100],
      [3, "removido", 500, null],
    ]);
  });

  it("não vaza total/snapshot para a linha do diff (ela vai para o Json da versão)", () => {
    const { rows } = diffRows([row(1, 700)], new Map([[1, null]]));
    expect(Object.keys(rows[0] ?? {}).sort()).toEqual(
      ["ambiente", "componente", "de", "especificacao", "motivos", "optionId", "para", "tipo"].sort()
    );
  });

  it("nunca publicado quando nenhuma linha tem publicado", () => {
    expect(diffRows([row(1, 700)], new Map([[1, null]])).algumPublicado).toBe(false);
  });
});

describe("motivosDe", () => {
  it("lista só os campos que mudaram, formatados em PT-BR", () => {
    const m = motivosDe(
      pub(1000),
      snap({ valorUnitario: 58, qtd: 20, rt: 12.5, credito: 280, colunas: { "1": { nome: "Margem", valor: 250 } } })
    );
    expect(m).toEqual([
      { campo: "Valor unitário", de: "R$ 54,00", para: "R$ 58,00" },
      { campo: "Qtd", de: "18,00", para: "20,00" },
      { campo: "RT", de: "10%", para: "12,50%" },
      { campo: "Crédito do padrão", de: "R$ 300,00", para: "R$ 280,00" },
      { campo: "Margem", de: "R$ 200,00", para: "R$ 250,00" },
    ]);
  });

  it("coluna nova ou removida aparece com — do lado que não existia; valendo 0 não conta", () => {
    const m = motivosDe(
      pub(1000),
      snap({ colunas: { "2": { nome: "Frete", valor: 40 }, "3": { nome: "Vazia", valor: 0 } } })
    );
    expect(m).toEqual([
      { campo: "Frete", de: "—", para: "R$ 40,00" },
      { campo: "Margem", de: "R$ 200,00", para: "—" },
    ]);
  });

  it("snapshot antigo sem crédito não inventa motivo de crédito", () => {
    expect(motivosDe(pub(1000, { credito: null }), snap({ credito: 999 }))).toEqual([]);
  });
});

describe("parseVersionChanges", () => {
  it("versão publicada: lê precos e avisos, descartando linhas inválidas", () => {
    const c = parseVersionChanges({
      precos: [
        { optionId: 1, especificacao: "A", ambiente: "Sala", componente: "Piso", de: null, para: 10, tipo: "novo", motivos: [] },
        { optionId: 2, tipo: "quebrado" },
      ],
      avisos: ["aviso", 3],
    });
    expect(c.precos).toHaveLength(1);
    expect(c.avisos).toEqual(["aviso"]);
  });

  it("linha gravada sem motivos ganha lista vazia", () => {
    const c = parseVersionChanges({
      precos: [{ optionId: 1, especificacao: "A", ambiente: "S", componente: "P", de: 1, para: 2, tipo: "alterado" }],
    });
    expect(c.precos?.[0]?.motivos).toEqual([]);
  });

  it("publicação antiga (seções vazias, sem precos) fica com precos null", () => {
    const c = parseVersionChanges({ materiais: [], custos: [], taxas: [], tipologias: [] });
    expect(c.precos).toBeNull();
    expect(c.materiais).toEqual([]);
  });

  it("formato descritivo antigo continua legível", () => {
    const c = parseVersionChanges({
      materiais: [{ tipo: "adicionado", desc: "Porcelanato" }],
      custos: [{ tipo: "x", desc: "inválido" }],
    });
    expect(c.materiais).toEqual([{ tipo: "adicionado", desc: "Porcelanato" }]);
    expect(c.custos).toEqual([]);
    expect(c.tipologias).toEqual([]);
  });

  it("lixo vira versão vazia sem diff", () => {
    expect(parseVersionChanges(null).precos).toBeNull();
    expect(parseVersionChanges([1, 2]).avisos).toEqual([]);
  });
});
