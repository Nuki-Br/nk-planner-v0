// Publicação de preço e diff rascunho × publicado — o único lugar que decide
// "qual preço vale". Vive separado do store porque importa o motor de cálculo
// (features/budget), que é puro mas mora do outro lado da fronteira; concentrar
// a dependência aqui mantém o store.ts falando só Prisma.
//
// Regra central: o diff e a publicação percorrem EXATAMENTE o mesmo resolvedor,
// então o que o modal promete é o que o publish grava.
import { Prisma } from "@prisma/client";

import { calcAnyRow, isRowPending, type BudgetDeps } from "@/features/budget/calc";
import { kitSubItemsOf, qtdOf, rtOf, unidadeOf, valUnOf } from "@/features/budget/resolve";
import { fmtNum } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import type {
  BudgetVersion,
  Componente,
  MaterialOption,
  PricingDiff,
  PricingDiffRow,
  Tipologia,
} from "@/shared/types/domain";

import {
  assertEnterprise,
  createVersionWithin,
  getBudgetColumns,
  getEnterpriseCostMap,
  getProject,
  listKits,
  listMateriais,
  listPricing,
  listTipologias,
} from "./store";

/** Uma aplicação resolvida para publicação: o que grava e como se chama. */
interface ResolvedRow {
  optionId: number;
  especificacao: string;
  ambiente: string;
  componente: string;
  /** null = a linha não é publicável agora (pendente de custo). */
  total: number | null;
  /** Valores congelados; null quando total é null. */
  snapshot: {
    valorUnitario: number;
    qtd: number;
    rt: number;
    unidade: string;
    colunas: Record<string, { nome: string; valor: number }>;
  } | null;
}

interface ResolvedEnterprise {
  rows: ResolvedRow[];
  avisos: string[];
  /** optionId → publicado atual, para o diff. */
  published: Map<number, MaterialOption["publicado"]>;
}

/** Diferença de centavo não é mudança de preço — evita diff que nunca zera. */
function precoMudou(de: number, para: number): boolean {
  return Math.abs(de - para) >= 0.005;
}

/**
 * Percorre o empreendimento e resolve cada opção OFERTÁVEL (não-padrão) para o
 * preço que seria publicado.
 *
 * Um Material pode aparecer em várias tipologias (ambiente compartilhado), mas
 * o preço é UM só. As tipologias vêm ordenadas por Position, então a primeira
 * aparição ganha — e se as quantidades divergirem sem override, isso vira aviso
 * em vez de um preço escolhido em silêncio.
 */
async function resolveEnterprise(
  organizationId: string,
  projectId: number
): Promise<ResolvedEnterprise> {
  const [project, tipologias, materiais, kits, cols, custosBase, pricings] = await Promise.all([
    getProject(organizationId, projectId),
    listTipologias(organizationId, projectId),
    listMateriais(organizationId),
    listKits(organizationId),
    getBudgetColumns(organizationId, projectId),
    getEnterpriseCostMap(organizationId, projectId),
    listPricing(organizationId, projectId),
  ]);

  const deps: BudgetDeps = {
    materiais,
    kits,
    cols,
    custosBase,
    pricings,
    usaDebitoCredito: project?.usaDebitoCredito !== false,
  };

  const rows: ResolvedRow[] = [];
  const published = new Map<number, MaterialOption["publicado"]>();
  const seen = new Map<
    number,
    { tipologia: Tipologia; qtd: number; kitQtds: string | null; padKitQtds: string | null }
  >();
  // Material: chaveado por COMPONENTE, não por opção — a quantidade diverge no
  // componente (BlueprintRoomComponent), então cada opção dele produziria a
  // MESMA frase e o usuário leria o mesmo aviso três vezes. Kit: por opção,
  // porque os quantitativos dos sub-itens são de cada kit.
  const conflitos = new Map<string, string>();

  for (const tip of tipologias) {
    for (const amb of tip.ambientes) {
      for (const comp of amb.componentes) {
        for (const opt of comp.options) {
          if (opt.isDefault) continue; // o padrão é crédito, não preço de venda

          const qtd = qtdOf(deps, comp, opt.id);
          const kitQtds = opt.isKit ? kitQtdsLabel(deps, comp, opt) : null;
          // Kit PADRÃO: as quantidades dos sub-itens definem o crédito de todas
          // as opções do componente.
          const def = comp.options.find((o) => o.id === comp.padrao);
          const padKitQtds = def?.isKit ? kitQtdsLabel(deps, comp, def) : null;
          const first = seen.get(opt.id);
          if (first) {
            // Já resolvido numa tipologia anterior. Se a quantidade herdada
            // difere e não há override, o preço publicado é o da primeira —
            // avisar é melhor que escolher calado.
            const semOverride = deps.pricings[opt.id]?.qtd == null;
            const compKey = `comp-${comp.id}`;
            if (
              !opt.isKit &&
              semOverride &&
              Math.abs(first.qtd - qtd) >= 0.0001 &&
              !conflitos.has(compKey)
            ) {
              conflitos.set(
                compKey,
                `"${amb.nome} · ${comp.nome}" é compartilhado e tem quantidades diferentes ` +
                  `(${first.tipologia.nome}: ${first.qtd}; ${tip.nome}: ${qtd}). ` +
                  `O preço publicado usa a de ${first.tipologia.nome}.`
              );
            }
            // Kit: os quantitativos dos sub-itens são da PLANTA e não têm
            // override compartilhado — divergência entre tipologias sempre avisa.
            const kitKey = `kit-${opt.id}`;
            if (kitQtds !== null && first.kitQtds !== kitQtds && !conflitos.has(kitKey)) {
              conflitos.set(
                kitKey,
                `"${amb.nome} · ${comp.nome}" é compartilhado e o kit "${nomeDaOpcao(deps, opt)}" ` +
                  `tem quantidades de sub-itens diferentes (${first.tipologia.nome}: ` +
                  `${first.kitQtds}; ${tip.nome}: ${kitQtds}). O preço publicado usa as de ` +
                  `${first.tipologia.nome}.`
              );
            }
            const padKey = `kitpad-${comp.id}`;
            if (
              def &&
              padKitQtds !== null &&
              first.padKitQtds !== padKitQtds &&
              !conflitos.has(padKey)
            ) {
              conflitos.set(
                padKey,
                `"${amb.nome} · ${comp.nome}" é compartilhado e o kit padrão ` +
                  `"${nomeDaOpcao(deps, def)}" tem quantidades de sub-itens diferentes ` +
                  `(${first.tipologia.nome}: ${first.padKitQtds}; ${tip.nome}: ${padKitQtds}). ` +
                  `O crédito publicado usa as de ${first.tipologia.nome}.`
              );
            }
            continue;
          }
          seen.set(opt.id, { tipologia: tip, qtd, kitQtds, padKitQtds });
          published.set(opt.id, opt.publicado);

          const nome = nomeDaOpcao(deps, opt);
          const base = {
            optionId: opt.id,
            especificacao: nome,
            ambiente: amb.nome,
            componente: comp.nome,
          };

          const r = calcAnyRow(deps, comp, opt);
          if (!r || isRowPending(deps, comp, opt, r)) {
            rows.push({ ...base, total: null, snapshot: null });
            continue;
          }

          const colunas: Record<string, { nome: string; valor: number }> = {};
          for (const col of cols) {
            const cr = r.result.colResults[String(col.id)];
            colunas[String(col.id)] = { nome: col.nome, valor: cr && !cr.error ? cr.value : 0 };
          }

          rows.push({
            ...base,
            total: r.result.total,
            snapshot: {
              valorUnitario: opt.isKit ? r.result.valUnUpg : valUnOf(deps, opt),
              qtd,
              rt: rtOf(deps, comp, opt.id),
              unidade: unidadeOf(deps, comp, opt.id),
              colunas,
            },
          });
        }
      }
    }
  }

  return { rows, avisos: [...conflitos.values()], published };
}

/**
 * Quantidades líquidas dos sub-itens de um kit nesta planta, como texto
 * comparável e exibível ("18,4 / 12 / —"). "—" = pendente.
 */
function kitQtdsLabel(deps: BudgetDeps, comp: Componente, opt: MaterialOption): string {
  const subs = kitSubItemsOf(deps, comp, opt) ?? [];
  return subs.map((s) => (s.qtd === null ? "—" : fmtNum(s.qtd, 2))).join(" / ");
}

function nomeDaOpcao(deps: BudgetDeps, opt: MaterialOption): string {
  if (opt.isKit) return deps.kits.find((k) => k.id === opt.baseId)?.nome ?? "";
  return deps.materiais.find((m) => m.id === opt.baseId)?.nome ?? "";
}

/** Compara o rascunho vivo com o publicado — alimenta o badge e o modal. */
export async function getPricingDiff(
  organizationId: string,
  projectId: number
): Promise<PricingDiff> {
  await assertEnterprise(organizationId, projectId);
  const { rows, avisos, published } = await resolveEnterprise(organizationId, projectId);

  const diff: PricingDiffRow[] = [];
  let algumPublicado = false;
  for (const row of rows) {
    const pub = published.get(row.optionId) ?? null;
    if (pub) algumPublicado = true;

    if (!pub && row.total != null) {
      diff.push({ ...row, de: null, para: row.total, tipo: "novo" });
    } else if (pub && row.total == null) {
      // Deixou de ser calculável (custo apagado): publicar vai LIMPAR o preço.
      diff.push({ ...row, de: pub.preco, para: null, tipo: "removido" });
    } else if (pub && row.total != null && precoMudou(pub.preco, row.total)) {
      diff.push({ ...row, de: pub.preco, para: row.total, tipo: "alterado" });
    }
  }

  return { rows: diff, avisos, nuncaPublicado: !algumPublicado };
}

export interface PublishBudgetInput {
  summary: string;
  createdBy: string;
}

/**
 * "Publicar orçamento": congela o rascunho no Material e cria a versão. É o
 * único ponto que escreve PriceInCents/PublishedSnapshot — depois disso, mexer
 * no custo base ou nas fórmulas não move mais o preço publicado.
 *
 * Uma linha que ficou impublicável (pendente) tem o preço LIMPO, não mantido:
 * publicar tem que deixar o estado publicado igual ao que o diff mostrou.
 */
export async function publishBudget(
  organizationId: string,
  projectId: number,
  input: PublishBudgetInput
): Promise<BudgetVersion> {
  await assertEnterprise(organizationId, projectId);
  const { rows } = await resolveEnterprise(organizationId, projectId);

  const now = new Date();
  const publicaveis = rows.filter((r) => r.total != null && r.snapshot != null);
  const limpar = rows.filter((r) => r.total == null).map((r) => r.optionId);

  // Tudo numa transação interativa, versão inclusive: publicação pela metade —
  // versão criada mas preços não gravados — é o pior estado possível aqui, e é
  // exatamente o que este módulo existe para evitar.
  //
  // Timeout generoso porque o UPDATE é por linha (cada uma tem seu snapshot) e
  // os 5s padrão do Prisma são apertados para um empreendimento grande.
  return prisma.$transaction(
    async (tx) => {
      const version = await createVersionWithin(tx, projectId, {
        summary: input.summary,
        createdBy: input.createdBy,
        changes: { materiais: [], custos: [], taxas: [], tipologias: [] },
      });

      for (const r of publicaveis) {
        await tx.material.update({
          where: { Id: r.optionId },
          data: {
            PriceInCents: Math.round((r.total ?? 0) * 100),
            PublishedSnapshot: r.snapshot as unknown as Prisma.InputJsonValue,
            PublishedAt: now,
            PublishedVersionId: version.id,
          },
        });
      }

      if (limpar.length > 0) {
        await tx.material.updateMany({
          where: { Id: { in: limpar } },
          data: {
            PriceInCents: null,
            PublishedSnapshot: Prisma.DbNull,
            PublishedAt: null,
            PublishedVersionId: null,
          },
        });
      }

      return version;
    },
    { timeout: 30_000, maxWait: 10_000 }
  );
}
