import type { IconType } from "react-icons";
import {
  LuLayoutDashboard,
  LuSettings,
  LuLayoutTemplate,
  LuPackage,
  LuClipboardList,
  LuTable,
  LuUpload,
} from "react-icons/lu";

export interface NavItem {
  /** Stable key that maps to the prototype screen id. */
  key: string;
  label: string;
  href: string;
  icon: IconType;
}

// Top-level Planner navigation. Contextual screens (typology canvas, per-component
// material config, third-party portal) are reached from within these, not the sidebar.
export const PLANNER_NAV: NavItem[] = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: LuLayoutDashboard },
  { key: "config-base", label: "Config. base", href: "/config-base", icon: LuSettings },
  { key: "typologies", label: "Tipologias", href: "/tipologias", icon: LuLayoutTemplate },
  { key: "catalog", label: "Catálogo", href: "/catalogo", icon: LuPackage },
  { key: "cost-review", label: "Revisão de custos", href: "/revisao-custos", icon: LuClipboardList },
  { key: "budget", label: "Orçamento", href: "/orcamento", icon: LuTable },
  { key: "publish", label: "Publicação", href: "/publicacao", icon: LuUpload },
];
