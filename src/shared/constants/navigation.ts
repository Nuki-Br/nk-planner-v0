import type { IconName } from "@/components/ui";

// Navegação do Planner — reconciliada com os dois modos da sidebar do
// protótipo (shared-components.jsx):
//  - modo dashboard: item único "Empreendimentos"
//  - modo projeto ativo: bloco do projeto + passos do fluxo (done/active)
export interface NavEntry {
  /** Chave estável = id de tela do protótipo. */
  key: string;
  label: string;
  href: string;
  icon: IconName;
}

export const DASHBOARD_ITEM: NavEntry = {
  key: "dashboard",
  label: "Empreendimentos",
  href: "/dashboard",
  icon: "building",
};

/** Passos do fluxo na sidebar em modo projeto ativo (WORKFLOW_STEPS do protótipo). */
export const WORKFLOW_NAV: NavEntry[] = [
  { key: "materials-catalog", label: "Catálogo de materiais", href: "/catalogo", icon: "box" },
  { key: "typologies", label: "Tipologias", href: "/tipologias", icon: "layers" },
  { key: "budget-table", label: "Construtor de Preço", href: "/orcamento", icon: "calculator" },
  { key: "publish", label: "Publicação", href: "/publicacao", icon: "check_circle" },
];

/** Rotas que mantêm a sidebar em modo dashboard (como no protótipo: dashboard e project-setup). */
export const DASHBOARD_MODE_ROUTES = ["/dashboard", "/config-base"];
