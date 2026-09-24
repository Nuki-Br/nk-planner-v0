// Paleta de ambientes COMPARTILHADOS entre tipologias — roxo, distinto do
// teal da marca (SHARED do protótipo).
export const SHARED = {
  bg: "#F3ECFB",
  soft: "#FAF6FE",
  border: "#D8C4F7",
  icon: "#7C5CEF",
  text: "#5b3fd6",
} as const;

/** Características estruturais selecionáveis no Editar tipologia (mock). */
export const PLANTA_CARACTERISTICAS = [
  "Varanda aberta",
  "Cozinha aberta",
  "Ampliar quarto",
  "Integrar sala e cozinha",
  "Suíte ampliada",
  "Lavabo opcional",
];

/**
 * Unidades de uma planta a partir dos grupos vinculados — números distintos
 * por torre ("101" da Torre A e da Torre B são duas). Mesma regra do servidor
 * (toTipologia); aqui roda sobre o cache dos grupos, então o contador acompanha
 * o vincular/desvincular na hora, sem esperar o refetch da tipologia.
 */
export function contarUnidades(groups: readonly { torre: string; unidades: string[] }[]): number {
  return new Set(groups.flatMap((g) => g.unidades.map((u) => `${g.torre}:${u.trim()}`))).size;
}
