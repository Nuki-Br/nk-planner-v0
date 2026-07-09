// Texturas determinísticas de material (stand-in para fotos) e constantes de
// colaboração mock — porte de docs/prototype-src/canvas.jsx (linhas 26-74).
import type { Material } from "@/shared/types/domain";

export interface CanvasUser {
  name: string;
  initials: string;
  color: string;
}

export const CV_USER: CanvasUser = { name: "Ana Carvalho", initials: "AC", color: "#047676" };
export const CV_PRESENCE: CanvasUser[] = [
  { name: "Ana Carvalho", initials: "AC", color: "#047676" },
  { name: "Marcos Leitão", initials: "ML", color: "#E8713F" },
  { name: "Beatriz Nunes", initials: "BN", color: "#7c3aed" },
];

/** Paleta fixa dos post-its (4 cores). */
export const STICKY = [
  { id: "amarelo", bg: "#FFE7A0", edge: "#EFD477", ink: "#5C4A12" },
  { id: "coral", bg: "#FFD6C7", edge: "#F2B6A2", ink: "#6B3826" },
  { id: "menta", bg: "#C7EBD8", edge: "#A4D9C0", ink: "#1F5942" },
  { id: "azul", bg: "#CFE2FB", edge: "#A9C8F1", ink: "#234A78" },
] as const;

export type StickyId = (typeof STICKY)[number]["id"];

export function stickyById(id: string) {
  return STICKY.find((s) => s.id === id) ?? STICKY[0];
}

/** Swatch determinística por nome/categoria do material. */
export function swatchStyle(mat: Material | null | undefined): React.CSSProperties {
  if (!mat) return { background: "#f0f0f0" };
  const n = mat.nome.toLowerCase();
  let base = "#D7C9AE";
  if (/creme/.test(n)) base = "#E6DAC2";
  else if (/super white|bianco|off-white|branco|white/.test(n)) base = "#EFEDE7";
  else if (/carrara|statuario|m[aá]rmore|marmore|cristal|quartz/.test(n)) base = "#ECEAE6";
  else if (/gold|dourado/.test(n)) base = "#C7A24E";
  else if (/preto|nero|fosco/.test(n)) base = "#2C2C2C";
  else if (/cromad/.test(n)) base = "#BCC1C7";
  else if (/bronze/.test(n)) base = "#856038";
  else if (/siena|granito/.test(n)) base = "#CBBCA0";
  else if (/natural/.test(n)) base = "#C7BBA4";

  const cat = mat.categoria;
  let backgroundImage = "";
  let backgroundSize = "auto";
  if (cat === "Piso" || cat === "Revestimento") {
    backgroundImage =
      "linear-gradient(0deg, rgba(0,0,0,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.10) 1px, transparent 1px)";
    backgroundSize = "50% 50%";
  } else if (cat === "Pedra") {
    backgroundImage =
      "linear-gradient(125deg, transparent 36%, rgba(90,90,100,0.28) 47%, transparent 55%), linear-gradient(70deg, transparent 60%, rgba(120,120,130,0.20) 70%, transparent 78%)";
  } else if (cat === "Metal") {
    backgroundImage =
      "linear-gradient(135deg, rgba(255,255,255,0.55), rgba(255,255,255,0) 42%, rgba(0,0,0,0.30))";
  } else if (cat === "Cuba/Louça") {
    backgroundImage =
      "radial-gradient(circle at 34% 28%, rgba(255,255,255,0.85), rgba(0,0,0,0.05) 70%)";
  } else if (cat === "Rodapé") {
    backgroundImage =
      "repeating-linear-gradient(90deg, rgba(0,0,0,0.05) 0 3px, rgba(255,255,255,0.10) 3px 6px)";
  }
  return { backgroundColor: base, backgroundImage, backgroundSize, backgroundPosition: "center" };
}
