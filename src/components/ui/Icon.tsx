import type { IconType } from "react-icons";
import {
  LuArrowLeft,
  LuBell,
  LuBuilding2,
  LuCalculator,
  LuCheck,
  LuChevronDown,
  LuChevronRight,
  LuCircleCheck,
  LuClipboardList,
  LuCopy,
  LuEye,
  LuEyeOff,
  LuFilter,
  LuGhost,
  LuInfo,
  LuLayers,
  LuLink,
  LuLock,
  LuLogOut,
  LuMenu,
  LuMessageSquare,
  LuPackage,
  LuPencilLine,
  LuPlus,
  LuSearch,
  LuSend,
  LuSettings2,
  LuShare2,
  LuTrash2,
  LuTriangleAlert,
  LuUpload,
  LuUser,
  LuX,
} from "react-icons/lu";

// Mapa nome → ícone Lucide (react-icons), preservando os nomes usados pelo
// protótipo (shared-components.jsx) para facilitar o porte das telas.
const ICON_MAP = {
  back: LuArrowLeft,
  bell: LuBell,
  box: LuPackage,
  building: LuBuilding2,
  calculator: LuCalculator,
  chat: LuMessageSquare,
  check: LuCheck,
  check_circle: LuCircleCheck,
  chevD: LuChevronDown,
  chevR: LuChevronRight,
  clipboard: LuClipboardList,
  close: LuX,
  copy: LuCopy,
  edit: LuPencilLine,
  eye: LuEye,
  eye_off: LuEyeOff,
  filter: LuFilter,
  ghost: LuGhost,
  info: LuInfo,
  layers: LuLayers,
  link: LuLink,
  lock: LuLock,
  logout: LuLogOut,
  menu: LuMenu,
  person: LuUser,
  plus: LuPlus,
  search: LuSearch,
  send: LuSend,
  share: LuShare2,
  trash: LuTrash2,
  tune: LuSettings2,
  upload: LuUpload,
  warning: LuTriangleAlert,
} satisfies Record<string, IconType>;

export type IconName = keyof typeof ICON_MAP;

export const ICON_NAMES = Object.keys(ICON_MAP) as IconName[];

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

/** Ícone único por nome (linha Lu* do Lucide). Cor via `className` (text-*). */
export function Icon({ name, size = 16, className }: IconProps) {
  const Cmp = ICON_MAP[name];
  return <Cmp size={size} className={className} aria-hidden />;
}
