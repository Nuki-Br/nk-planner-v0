import { describe, expect, it } from "vitest";

import { createSeed } from "@/lib/data/seed";
import type { Ambiente } from "@/shared/types/domain";

import { enumerateBaseIds, enumerateCostRefs } from "./enumerate";

const seed = createSeed();

function ambByNome(nome: string): Ambiente {
  for (const tip of seed.tipologias) {
    const a = tip.ambientes.find((x) => x.nome === nome);
    if (a) return a;
  }
  throw new Error(`ambiente ${nome} não encontrado`);
}

const mat = (codigo: string) => {
  const m = seed.materiais.find((x) => x.codigo === codigo);
  if (!m) throw new Error(`material ${codigo} não encontrado`);
  return m;
};

describe("enumerateCostRefs", () => {
  const hall = ambByNome("Hall");
  const refs = enumerateCostRefs(hall);

  it("inclui o material de um componente de custo fixo", () => {
    // Sem preço no rodapé, o custo de troca de TODAS as opções fica pendente —
    // logo ele precisa aparecer para o terceiro preencher.
    const rodape = refs.find((r) => r.baseId === mat("RDP-466-SL").id);
    expect(rodape).toBeDefined();
    expect(rodape?.origem).toBe("componente-custo");
    expect(rodape?.optionId).toBeNull(); // não tem linha Material → sem thread
  });

  it("não inclui satélite espelho — o preço vem da opção escolhida", () => {
    // O Hall tem 4 satélites: Soleira (espelho) + 3 fixos. Só os fixos entram.
    const doCusto = refs.filter((r) => r.origem === "componente-custo");
    expect(doCusto).toHaveLength(3);
    expect(doCusto.some((r) => r.compNome.endsWith("· Soleira"))).toBe(false);
    // "Soleiras Granito" é FIXO e deve aparecer — não confundir com o espelho.
    expect(doCusto.some((r) => r.compNome.endsWith("· Soleiras Granito"))).toBe(true);
  });

  it("lista as opções, incluindo o material padrão", () => {
    const opcoes = refs.filter((r) => r.origem === "opcao");
    expect(opcoes).toHaveLength(4); // padrão + Barcelona, Aeterna, Breccia
    expect(opcoes.every((r) => r.optionId !== null)).toBe(true);
    // O material padrão também precisa de custo → entra na enumeração, igual
    // às opções de upgrade (é o que destrava preenchê-lo na aba Custo base).
    expect(opcoes.filter((r) => r.isDefault)).toHaveLength(1);
    expect(opcoes.filter((r) => !r.isDefault)).toHaveLength(3);
  });

  it("não duplica um baseId que já está como opção do mesmo ambiente", () => {
    const ids = refs.map((r) => r.baseId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("enumerateBaseIds cobre toda a tipologia", () => {
    const t1 = seed.tipologias[0]!;
    const ids = enumerateBaseIds(t1);
    expect(ids.has(mat("RDP-466-SL").id)).toBe(true); // satélite fixo do Hall
    expect(ids.has(mat("PP-6060-BI").id)).toBe(true); // upgrade da Sala
  });
});
