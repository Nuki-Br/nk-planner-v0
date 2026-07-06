// Layout do Visualizador (canvas) — porte fiel de docs/prototype-src/canvas.jsx
// (linhas 10-23 e 106-180). Atribui centros verticais (cy) de baixo para cima,
// coluna a coluna: sub-itens → opção (média 1º/último) → componente (média das
// opções) → ambiente (média dos componentes). Puro: sem React/DOM; o resolver
// de kits vem por parâmetro (o protótipo fechava sobre o global KITS).
import { isKitId } from "@/lib/data/entities";
import type { Ambiente, Componente, Kit, Tipologia } from "@/shared/types/domain";

/** Geometria do plano (coordenadas do canvas). */
export const CV = {
  x1: 48, w1: 150, // L1 ambiente
  x2: 278, w2: 176, // L2 componente
  x3: 552, w3: 252, // L3 opção
  x4: 872, w4: 200, // L4 sub-item
  rowH3: 66, gap3: 16,
  rowH4: 34, gap4: 10,
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
  ambId: string;
  cy: number;
  /** Sem padrão e sem upgrades. */
  empty: boolean;
}

export interface OptNode {
  optId: string;
  isPadrao: boolean;
  /** "padrão" ou "opção NN". */
  label: string;
  /** `${comp.id}-${optId}` — chave de expansão de kit. */
  key: string;
  comp: Componente;
  ambId: string;
  isKit: boolean;
  kit: Kit | null;
  isOpen: boolean;
  cy: number;
}

export interface SubNode {
  /** `${comp.id}-${optId}-${mid}`. */
  key: string;
  optKey: string;
  comp: Componente;
  kitId: string;
  mid: string;
  cy: number;
}

export interface PlaceholderNode {
  ambId: string;
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

export function buildLayout(
  tip: Tipologia,
  expanded: ReadonlySet<string>,
  kits: Kit[]
): CanvasLayout {
  const getKit = (id: string) => kits.find((k) => k.id === id) ?? null;

  let y: number = CV.pad;
  const ambNodes: AmbNode[] = [];
  const compNodes: CompNode[] = [];
  const optNodes: OptNode[] = [];
  const subNodes: SubNode[] = [];
  const placeholders: PlaceholderNode[] = [];
  const ambCy: Record<string, number> = {};
  const compCy: Record<string, number> = {};
  const optCy: Record<string, number> = {};

  tip.ambientes.forEach((amb, ai) => {
    if (ai > 0) y += CV.ambGap;
    const cCys: number[] = [];

    if (amb.componentes.length === 0) {
      const cy = y + CV.rowH3 / 2;
      placeholders.push({ ambId: amb.id, cy });
      cCys.push(cy);
      y += CV.rowH3 + CV.gap3;
    } else {
      amb.componentes.forEach((comp, ci) => {
        if (ci > 0) y += CV.compGap;
        const options: { optId: string; isPadrao: boolean; label: string }[] = [];
        if (comp.padrao !== null)
          options.push({ optId: comp.padrao, isPadrao: true, label: "padrão" });
        comp.upgrades.forEach((uid, ui) =>
          options.push({
            optId: uid,
            isPadrao: false,
            label: "opção " + String(ui + 1).padStart(2, "0"),
          })
        );

        if (options.length === 0) {
          const cy = y + CV.rowH3 / 2;
          y += CV.rowH3 + CV.gap3;
          compNodes.push({ comp, ambId: amb.id, cy, empty: true });
          compCy[comp.id] = cy;
          cCys.push(cy);
          return;
        }
        const oCys: number[] = [];
        options.forEach((opt) => {
          const key = `${comp.id}-${opt.optId}`;
          const isKit = isKitId(opt.optId);
          const kit = isKit ? getKit(opt.optId) : null;
          const isOpen = isKit && kit !== null && expanded.has(key);
          if (isOpen) {
            const sCys: number[] = [];
            kit.itens.forEach((mid) => {
              const cy = y + CV.rowH4 / 2;
              subNodes.push({ key: `${key}-${mid}`, optKey: key, comp, kitId: opt.optId, mid, cy });
              sCys.push(cy);
              y += CV.rowH4 + CV.gap4;
            });
            y -= CV.gap4;
            const ocy = ((sCys[0] ?? y) + (sCys[sCys.length - 1] ?? y)) / 2;
            optNodes.push({ ...opt, key, comp, ambId: amb.id, isKit, kit, isOpen, cy: ocy });
            optCy[key] = ocy;
            oCys.push(ocy);
            y += CV.gap3;
          } else {
            const ocy = y + CV.rowH3 / 2;
            optNodes.push({ ...opt, key, comp, ambId: amb.id, isKit, kit, isOpen: false, cy: ocy });
            optCy[key] = ocy;
            oCys.push(ocy);
            y += CV.rowH3 + CV.gap3;
          }
        });
        y -= CV.gap3;
        const ccy = oCys.reduce((a, b) => a + b, 0) / oCys.length;
        compNodes.push({ comp, ambId: amb.id, cy: ccy, empty: false });
        compCy[comp.id] = ccy;
        cCys.push(ccy);
      });
    }

    const acy = cCys.reduce((a, b) => a + b, 0) / cCys.length;
    ambNodes.push({ amb, cy: acy });
    ambCy[amb.id] = acy;
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
