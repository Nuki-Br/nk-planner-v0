import { EASE, PLANE_W, type Edge } from "@/lib/canvas/buildLayout";

/** Conectores Bézier entre colunas (sólido: hierarquia; tracejado: placeholder/sub-item). */
export function EdgesSvg({ edges, height }: { edges: Edge[]; height: number }) {
  return (
    <svg
      width={PLANE_W}
      height={height}
      style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none", overflow: "visible" }}
    >
      {edges.map((e, i) => {
        const dx = (e.x2 - e.x1) / 2;
        return (
          <path
            key={i}
            d={`M ${e.x1} ${e.y1} C ${e.x1 + dx} ${e.y1}, ${e.x2 - dx} ${e.y2}, ${e.x2} ${e.y2}`}
            fill="none"
            stroke={e.kind === "dashed" ? "#bfbfbf" : "#d9d9d9"}
            strokeWidth={1.5}
            strokeDasharray={e.kind === "dashed" ? "5 4" : "none"}
            style={{ transition: `d .3s ${EASE}` }}
          />
        );
      })}
    </svg>
  );
}
