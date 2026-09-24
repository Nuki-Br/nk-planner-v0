// Projeção da aba "Preço final" em linhas planas, para exportar (Excel). Mesmas
// regras da tabela (BudgetScreen/KitOptionRows): crédito do padrão na qtd
// líquida, débito do upgrade na qtd com RT, linha pendente fora dos totais.
// Puro — o writer (./precoFinalXlsx.ts) só formata.
import { kitCredit, resolveKitSubItems, type KitSubItemResult } from "@/lib/budget";
import { getKit, getMaterial } from "@/lib/data/entities";
import type {
  Ambiente,
  Componente,
  CustoBase,
  Kit,
  Material,
  MaterialOption,
  Tipologia,
} from "@/shared/types/domain";

import {
  ambTotal,
  calcAnyRow,
  isOptionOwnPending,
  isRowPending,
  kitSubItemsOf,
  pricingOf,
  qtdOf,
  rtOf,
  unidadeOf,
  valUnOf,
  type AnyRowResult,
  type BudgetDeps,
} from "./calc";
import { linhasPendentesOf } from "./resolve";
import { composicaoSubRows, kitSubRow } from "./subRows";
import type { SubRowCells } from "./components/SubRow";

export type Lado = "padrao" | "upgrade";

/** Célula de coluna livre: valor, erro de fórmula ou vazia (sem cálculo). */
export type ColCell = number | "#ERR" | null;

export interface ExportItemRow {
  kind: "item";
  lado: Lado;
  /** 0 = a opção (material ou kit); 1 = sub-linha (composição / sub-item de kit). */
  nivel: 0 | 1;
  /** Primeira linha de um componente dentro da seção — onde a separação é desenhada. */
  inicioGrupo: boolean;
  /** Linha de kit (o kit em si; os sub-itens são nivel 1). */
  isKit: boolean;
  /** Sem custo/quantidade: fica fora dos totais, como na tabela. */
  pendente: boolean;
  componente: string;
  especificacao: string;
  /** Fabricante, "Kit · N itens", código do insumo… */
  detalhe: string;
  qtd: number | null;
  unidade: string;
  /** null = sem valor (pendente) ou não se aplica (kit). */
  valUn: number | null;
  /** Crédito (padrão) ou débito (upgrade), já estendido. */
  debCred: number | null;
  custoTroca: number | null;
  /** Uma célula por coluna livre, na ordem de `deps.cols`. */
  colunas: ColCell[];
  total: number | null;
  /** Pendência ou nota ("Aguardando custo", "Valor un. sobreposto"…). */
  obs: string;
}

export type ExportRow =
  | { kind: "ambiente"; nome: string }
  | { kind: "secao"; lado: Lado; titulo: string }
  | { kind: "vazio"; titulo: string }
  | ExportItemRow
  | { kind: "totalAmbiente"; nome: string; total: number };

export interface PrecoFinalSheet {
  tipologia: string;
  rows: ExportRow[];
  totalGeral: number;
  /** Upgrades fora do cálculo por pendência (o aviso do rodapé da tabela). */
  pendentes: number;
}

function plural(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`;
}

/** Títulos das faixas de seção — os mesmos da tabela. */
export function secaoTitulo(lado: Lado, usaDC: boolean): string {
  if (lado === "padrao") {
    return usaDC
      ? "Acabamentos padrão — crédito incluído no preço"
      : "Acabamentos padrão — inclusos no preço base";
  }
  return usaDC
    ? "Acabamentos personalizados — débito cobrado do cliente"
    : "Acabamentos personalizados — custo cobrado do cliente";
}

/** Dica de pendência de um material: sem cotação e/ou insumo da composição sem preço. */
function pendenciaMaterial(deps: BudgetDeps, baseId: number): string {
  const partes: string[] = [];
  if ((deps.custosBase[baseId]?.custoMat ?? null) === null) partes.push("Aguardando custo");
  const insumos = linhasPendentesOf(deps.custosBase, baseId);
  const primeiro = insumos[0];
  if (primeiro) {
    partes.push(
      `Insumo sem preço: ${primeiro.nome}${insumos.length > 1 ? ` e mais ${insumos.length - 1}` : ""}`
    );
  }
  return partes.join(" · ");
}

function pendenciaKit(subs: readonly KitSubItemResult[]): string {
  const semCusto = subs.filter((s) => s.pending).length;
  const semQtd = subs.filter((s) => s.qtd === null).length;
  const partes: string[] = [];
  if (semCusto > 0) partes.push(`${plural(semCusto, "sub-item", "sub-itens")} sem custo`);
  if (semQtd > 0) partes.push(`${plural(semQtd, "sub-item", "sub-itens")} sem quantidade`);
  return partes.join(" · ");
}

const semColunas = (deps: BudgetDeps): ColCell[] => deps.cols.map(() => null);

function colunasOf(deps: BudgetDeps, r: AnyRowResult | null): ColCell[] {
  if (!r) return semColunas(deps);
  return deps.cols.map((col) => {
    const cr = r.result.colResults[String(col.id)];
    if (!cr) return null;
    return cr.error ? "#ERR" : cr.value;
  });
}

/** Sub-linha (composição ou sub-item de kit) — só qtd, valor un. e o valor da linha. */
function subItem(
  deps: BudgetDeps,
  lado: Lado,
  componente: string,
  c: SubRowCells,
  obs: string
): ExportItemRow {
  const semValor = c.pending || c.pendingQtd === true;
  const pend = [c.pending && "Aguardando custo", c.pendingQtd && "Sem quantidade"]
    .filter((p): p is string => typeof p === "string")
    .join(" · ");
  return {
    kind: "item",
    lado,
    nivel: 1,
    inicioGrupo: false,
    isKit: false,
    pendente: semValor,
    componente,
    especificacao: c.nome,
    detalhe: [c.badge, c.sub].filter((p): p is string => Boolean(p)).join(" · "),
    qtd: c.pendingQtd ? null : c.qtd,
    unidade: c.unidade,
    valUn: c.pending ? null : c.valUn,
    debCred: semValor ? null : c.line,
    custoTroca: null,
    colunas: semColunas(deps),
    total: null,
    obs: [pend, obs].filter(Boolean).join(" · "),
  };
}

/**
 * Composição do custo base sob a linha de um material. Com valor unitário
 * sobreposto ela é só informativa — a nota vai na primeira sub-linha, como na tela.
 */
function composicaoItems(
  deps: BudgetDeps,
  lado: Lado,
  componente: string,
  custo: CustoBase | undefined,
  qtd: number,
  unidade: string,
  overridden: boolean
): ExportItemRow[] {
  return composicaoSubRows(custo, qtd, unidade).map((c, i) =>
    subItem(
      deps,
      lado,
      componente,
      c,
      overridden && i === 0 ? "Informativo — valor un. sobreposto" : ""
    )
  );
}

function padraoMaterialRows(
  deps: BudgetDeps,
  comp: Componente,
  def: MaterialOption,
  mat: Material
): ExportItemRow[] {
  const valUn = valUnOf(deps, def);
  const qtd = qtdOf(deps, comp, def.id);
  const unidade = unidadeOf(deps, comp, def.id);
  const pending = isOptionOwnPending(deps, def);
  const overridden = pricingOf(deps, def.id).valorUnitario != null;
  const main: ExportItemRow = {
    kind: "item",
    lado: "padrao",
    nivel: 0,
    inicioGrupo: true,
    isKit: false,
    pendente: pending,
    componente: comp.nome,
    especificacao: mat.nome,
    detalhe: mat.fabricante,
    qtd,
    unidade,
    valUn: pending && !overridden ? null : valUn,
    // Crédito: valor unitário × qtd líquida (sem RT).
    debCred: pending ? null : valUn * qtd,
    custoTroca: null,
    colunas: semColunas(deps),
    total: null,
    obs: pending
      ? pendenciaMaterial(deps, def.baseId)
      : overridden
        ? "Valor un. sobreposto"
        : "",
  };
  return [
    main,
    ...composicaoItems(
      deps,
      "padrao",
      comp.nome,
      deps.custosBase[def.baseId],
      qtd,
      unidade,
      overridden
    ),
  ];
}

function upgradeMaterialRows(
  deps: BudgetDeps,
  comp: Componente,
  opt: MaterialOption,
  mat: Material,
  inicioGrupo: boolean
): ExportItemRow[] {
  const pending = isOptionOwnPending(deps, opt);
  const rr = pending ? null : calcAnyRow(deps, comp, opt);
  const r = rr?.kind === "material" ? rr.result : null;
  const unidade = unidadeOf(deps, comp, opt.id);
  const qtdComRT = qtdOf(deps, comp, opt.id) * (1 + rtOf(deps, comp, opt.id) / 100);
  const overridden = pricingOf(deps, opt.id).valorUnitario != null;
  const main: ExportItemRow = {
    kind: "item",
    lado: "upgrade",
    nivel: 0,
    inicioGrupo,
    isKit: false,
    pendente: pending,
    componente: comp.nome,
    especificacao: mat.nome,
    detalhe: mat.fabricante,
    qtd: qtdComRT,
    unidade,
    valUn: pending && !overridden ? null : valUnOf(deps, opt),
    debCred: r ? r.debitoTotal : null,
    custoTroca: r ? r.custoDeTroca : null,
    colunas: colunasOf(deps, r ? rr : null),
    total: r ? r.total : null,
    obs: pending
      ? pendenciaMaterial(deps, opt.baseId)
      : overridden
        ? "Valor un. sobreposto"
        : "",
  };
  return [
    main,
    ...composicaoItems(
      deps,
      "upgrade",
      comp.nome,
      deps.custosBase[opt.baseId],
      qtdComRT,
      unidade,
      overridden
    ),
  ];
}

/**
 * Kit — padrão (crédito) ou upgrade (débito) — mais um sub-item por linha. O
 * kit não tem valor unitário: o valor é a soma dos sub-itens.
 */
function kitRows(
  deps: BudgetDeps,
  lado: Lado,
  comp: Componente,
  opt: MaterialOption,
  kit: Kit,
  inicioGrupo: boolean
): ExportItemRow[] {
  const padrao = lado === "padrao";
  const rt = rtOf(deps, comp, opt.id);
  const qtd = qtdOf(deps, comp, opt.id);
  const rr = padrao ? null : calcAnyRow(deps, comp, opt);
  const result = rr?.kind === "kit" ? rr.result : null;
  // Padrão não tem linha no motor (vira crédito dos upgrades): estende aqui.
  const subs = padrao
    ? resolveKitSubItems(kitSubItemsOf(deps, comp, opt) ?? [], rt)
    : (result?.subItems ?? []);
  const pendencia = pendenciaKit(subs);
  const pending = pendencia !== "";
  const r = !padrao && result && !pending ? result : null;
  const main: ExportItemRow = {
    kind: "item",
    lado,
    nivel: 0,
    inicioGrupo,
    isKit: true,
    pendente: pending,
    componente: comp.nome,
    especificacao: kit.nome,
    detalhe: `Kit · ${plural(kit.itens.length, "item", "itens")}`,
    qtd: padrao ? qtd : qtd * (1 + rt / 100),
    unidade: unidadeOf(deps, comp, opt.id),
    valUn: null,
    debCred: pending ? null : padrao ? kitCredit(subs).credito : (r?.debitoTotal ?? null),
    custoTroca: r ? r.custoDeTroca : null,
    colunas: colunasOf(deps, r ? rr : null),
    total: r ? r.total : null,
    obs: pendencia,
  };
  const subRows = subs.map((s) => {
    const insumos =
      s.pending && (deps.custosBase[s.item.materialId]?.custoMat ?? null) !== null
        ? linhasPendentesOf(deps.custosBase, s.item.materialId)
        : [];
    const primeiro = insumos[0];
    const obs = primeiro
      ? `Insumo sem preço: ${primeiro.nome}${insumos.length > 1 ? ` e mais ${insumos.length - 1}` : ""}`
      : "";
    return subItem(deps, lado, comp.nome, kitSubRow(s, padrao ? "credito" : "debito"), obs);
  });
  return [main, ...subRows];
}

function ambienteRows(
  deps: BudgetDeps,
  amb: Ambiente,
  usaDC: boolean,
  total: number
): ExportRow[] {
  const { materiais, kits } = deps;
  const rows: ExportRow[] = [{ kind: "ambiente", nome: amb.nome }];

  // ── padrão: uma linha por componente (o crédito) ──
  rows.push({ kind: "secao", lado: "padrao", titulo: secaoTitulo("padrao", usaDC) });
  const padrao: ExportItemRow[] = [];
  for (const comp of amb.componentes) {
    const def = comp.options.find((o) => o.id === comp.padrao);
    if (!def) continue;
    if (def.isKit) {
      const kit = getKit(kits, def.baseId);
      if (kit) padrao.push(...kitRows(deps, "padrao", comp, def, kit, true));
      continue;
    }
    const mat = getMaterial(materiais, def.baseId);
    if (mat) padrao.push(...padraoMaterialRows(deps, comp, def, mat));
  }
  if (padrao.length === 0) rows.push({ kind: "vazio", titulo: "Nenhum material padrão definido" });
  rows.push(...padrao);

  // ── personalizados: as opções agrupadas por componente ──
  rows.push({ kind: "secao", lado: "upgrade", titulo: secaoTitulo("upgrade", usaDC) });
  const upgrades: ExportItemRow[] = [];
  for (const comp of amb.componentes) {
    let inicio = true;
    for (const opt of comp.options) {
      if (opt.isDefault) continue;
      let linhas: ExportItemRow[] = [];
      if (opt.isKit) {
        const kit = getKit(kits, opt.baseId);
        if (kit) linhas = kitRows(deps, "upgrade", comp, opt, kit, inicio);
      } else {
        const mat = getMaterial(materiais, opt.baseId);
        if (mat) linhas = upgradeMaterialRows(deps, comp, opt, mat, inicio);
      }
      if (linhas.length > 0) inicio = false;
      upgrades.push(...linhas);
    }
  }
  if (upgrades.length === 0) rows.push({ kind: "vazio", titulo: "Nenhum upgrade cadastrado" });
  rows.push(...upgrades);

  rows.push({ kind: "totalAmbiente", nome: amb.nome, total });
  return rows;
}

/** A tabela "Preço final" de uma tipologia, linha a linha. */
export function buildPrecoFinalSheet(deps: BudgetDeps, tip: Tipologia): PrecoFinalSheet {
  const usaDC = deps.usaDebitoCredito ?? true;
  const rows: ExportRow[] = [];
  let totalGeral = 0;
  let pendentes = 0;
  for (const amb of tip.ambientes) {
    const total = ambTotal(deps, amb);
    rows.push(...ambienteRows(deps, amb, usaDC, total));
    totalGeral += total;
    for (const comp of amb.componentes) {
      for (const opt of comp.options) {
        if (!opt.isDefault && isRowPending(deps, comp, opt)) pendentes++;
      }
    }
  }
  return { tipologia: tip.nome, rows, totalGeral, pendentes };
}
