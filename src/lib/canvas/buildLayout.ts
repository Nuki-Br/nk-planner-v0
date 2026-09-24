// Layout do Visualizador (canvas). Atribui centros verticais (cy) de baixo para
// cima, coluna a coluna: sub-itens → opção (média 1º/último) → componente (média
// das opções) → ambiente (média dos componentes). Puro: sem React/DOM; o resolver
// de kits vem por parâmetro. Ids em `number`; opções vêm de comp.options
// (a default é a "padrão"); kit-ness é atributo da opção.
import { getKit } from "@/lib/data/entities";
import type { Ambiente, Componente, Kit, KitItem, Tipologia } from "@/shared/types/domain";

/**
 * Geometria do plano (coordenadas do canvas). As colunas de opção e de sub-item
 * são largas e as linhas comportam o nome em DUAS linhas: nomes de catálogo
 * como "166m² - Aduela Elevador Social - Mármore Travertino Resignado
 * Levigado" não cabem numa linha só, e cortados não dá para saber qual é o
 * material.
 */
export const CV = {
  x1: 48, w1: 150, // L1 ambiente
  x2: 278, w2: 176, // L2 componente
  x3: 552, w3: 320, // L3 opção
  x4: 940, w4: 320, // L4 sub-item
  rowH3: 66, gap3: 16,
  /** Linha de opção na visão "Detalhado" (fabricante + preço sob o nome). */
  rowH3Detailed: 86,
  rowH4: 42, gap4: 10,
  compGap: 26, ambGap: 48,
  pad: 56,
} as const;

export const PLANE_W = CV.x4 + CV.w4 + CV.pad;
export const EASE = "cubic-bezier(.4,0,.2,1)";
export const NODE_TRANSITION = `top .32s ${EASE}, left .32s ${EASE}, height .32s ${EASE}`;

export interface AmbNode {
  amb: Ambiente;
  cy: number;
}

export interface CompNode {
  comp: Componente;
  ambId: number;
  cy: number;
  /** Sem padrão e sem upgrades. */
  empty: boolean;
}

export interface OptNode {
  /** Id da linha de opção (Material). */
  optId: number;
  /** BaseMaterial referenciado (resolve catálogo/swatch). */
  baseId: number;
  isPadrao: boolean;
  /** "padrão" ou "opção NN". */
  label: string;
  /** String(optId) — chave de expansão de kit. */
  key: string;
  comp: Componente;
  ambId: number;
  isKit: boolean;
  kit: Kit | null;
  isOpen: boolean;
  cy: number;
}

export interface SubNode {
  /** `${optKey}-${item.id}`. */
  key: string;
  optKey: string;
  comp: Componente;
  item: KitItem;
  cy: number;
}

export interface PlaceholderNode {
  ambId: number;
  cy: number;
}

export interface Edge {
  kind: "solid" | "dashed";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface CanvasLayout {
  ambNodes: AmbNode[];
  compNodes: CompNode[];
  optNodes: OptNode[];
  subNodes: SubNode[];
  placeholders: PlaceholderNode[];
  /** Y do botão "Adicionar ambiente" quando a tipologia está vazia. */
  addAmbY: number;
  edges: Edge[];
  height: number;
}

/** Opções ordenadas: a padrão (default) primeiro, upgrades depois por ordem. */
function orderedOptions(comp: Componente): { optId: number; baseId: number; isKit: boolean; isPadrao: boolean; label: string }[] {
  const sorted = [...comp.options].sort(
    (a, b) => Number(b.isDefault) - Number(a.isDefault) || a.ordem - b.ordem
  );
  let upg = 0;
  return sorted.map((o) => ({
    optId: o.id,
    baseId: o.baseId,
    isKit: o.isKit,
    isPadrao: o.isDefault,
    label: o.isDefault ? "padrão" : "opção " + String(++upg).padStart(2, "0"),
  }));
}

export function buildLayout(
  tip: Tipologia,
  expanded: ReadonlySet<string>,
  kits: Kit[],
  /** Visão "Detalhado": o nó de opção é mais alto, a linha acompanha. */
  detailed = false
): CanvasLayout {
  const rowH3 = detailed ? CV.rowH3Detailed : CV.rowH3;
  let y: number = CV.pad;
  const ambNodes: AmbNode[] = [];
  const compNodes: CompNode[] = [];
  const optNodes: OptNode[] = [];
  const subNodes: SubNode[] = [];
  const placeholders: PlaceholderNode[] = [];
  const ambCy: Record<number, number> = {};
  const compCy: Record<number, number> = {};
  const optCy: Record<string, number> = {};

  tip.ambientes.forEach((amb, ai) => {
    if (ai > 0) y += CV.ambGap;
    const cCys: number[] = [];

    if (amb.componentes.length === 0) {
      const cy = y + rowH3 / 2;
      placeholders.push({ ambId: amb.blueprintRoomId, cy });
      cCys.push(cy);
      y += rowH3 + CV.gap3;
    } else {
      amb.componentes.forEach((comp, ci) => {
        if (ci > 0) y += CV.compGap;
        const options = orderedOptions(comp);

        if (options.length === 0) {
          const cy = y + rowH3 / 2;
          y += rowH3 + CV.gap3;
          compNodes.push({ comp, ambId: amb.blueprintRoomId, cy, empty: true });
          compCy[comp.id] = cy;
          cCys.push(cy);
          return;
        }
        const oCys: number[] = [];
        options.forEach((opt) => {
          const key = String(opt.optId);
          const kit = opt.isKit ? getKit(kits, opt.baseId) ?? null : null;
          const isOpen = opt.isKit && kit !== null && expanded.has(key);
          if (isOpen && kit) {
            const sCys: number[] = [];
            kit.itens.forEach((item) => {
              const cy = y + CV.rowH4 / 2;
              subNodes.push({ key: `${key}-${item.id}`, optKey: key, comp, item, cy });
              sCys.push(cy);
              y += CV.rowH4 + CV.gap4;
            });
            y -= CV.gap4;
            const ocy = ((sCys[0] ?? y) + (sCys[sCys.length - 1] ?? y)) / 2;
            optNodes.push({ ...opt, key, comp, ambId: amb.blueprintRoomId, kit, isOpen, cy: ocy });
            optCy[key] = ocy;
            oCys.push(ocy);
            y += CV.gap3;
          } else {
            const ocy = y + rowH3 / 2;
            optNodes.push({ ...opt, key, comp, ambId: amb.blueprintRoomId, kit, isOpen: false, cy: ocy });
            optCy[key] = ocy;
            oCys.push(ocy);
            y += rowH3 + CV.gap3;
          }
        });
        y -= CV.gap3;
        const ccy = oCys.reduce((a, b) => a + b, 0) / oCys.length;
        compNodes.push({ comp, ambId: amb.blueprintRoomId, cy: ccy, empty: false });
        compCy[comp.id] = ccy;
        cCys.push(ccy);
      });
    }

    const acy = cCys.reduce((a, b) => a + b, 0) / cCys.length;
    ambNodes.push({ amb, cy: acy });
    ambCy[amb.blueprintRoomId] = acy;
  });

  const addAmbY = y + 20;
  y += 60;

  const edges: Edge[] = [];
  compNodes.forEach((cn) =>
    edges.push({ kind: "solid", x1: CV.x1 + CV.w1, y1: ambCy[cn.ambId] ?? 0, x2: CV.x2, y2: cn.cy })
  );
  placeholders.forEach((p) =>
    edges.push({ kind: "dashed", x1: CV.x1 + CV.w1, y1: ambCy[p.ambId] ?? 0, x2: CV.x2, y2: p.cy })
  );
  optNodes.forEach((on) =>
    edges.push({ kind: "solid", x1: CV.x2 + CV.w2, y1: compCy[on.comp.id] ?? 0, x2: CV.x3, y2: on.cy })
  );
  subNodes.forEach((sn) =>
    edges.push({ kind: "dashed", x1: CV.x3 + CV.w3, y1: optCy[sn.optKey] ?? 0, x2: CV.x4, y2: sn.cy })
  );

  return { ambNodes, compNodes, optNodes, subNodes, placeholders, addAmbY, edges, height: y + CV.pad };
}
