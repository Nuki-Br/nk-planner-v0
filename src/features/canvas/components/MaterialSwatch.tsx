"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";
import type { Material } from "@/shared/types/domain";

import { swatchStyle } from "../swatch";

interface MaterialSwatchProps {
  mat: Material | null | undefined;
  /** Classes de tamanho/forma da caixa (ex.: "h-[46px] w-[46px] rounded-lg"). */
  className?: string;
  /** Lado em px — vira o `sizes` do next/image. */
  size: number;
  title?: string;
}

/**
 * Slot de imagem do material no canvas: foto real quando existe, swatch quando
 * não.
 *
 * O swatch (textura CSS determinística por nome/categoria) sempre foi um
 * stand-in para foto — está escrito na primeira linha do swatch.ts. Agora que
 * existe foto de verdade, ela ganha; o swatch vira o fallback e continua no
 * canvas para não virar um mar de ícones cinza enquanto o acervo não tem imagem.
 * Em tabelas o fallback é diferente (ícone neutro) — ver MaterialThumb.
 */
export function MaterialSwatch({ mat, className, size, title }: MaterialSwatchProps) {
  // Mesmo tooltip nos dois ramos: ter ou não imagem não muda o que o slot É, e
  // alternar o texto faria nós vizinhos parecerem coisas diferentes.
  const label = title ?? "Material associado";
  const url = mat?.imagem?.url;

  if (url) {
    return (
      <div title={label} className={cn("relative shrink-0 overflow-hidden", className)}>
        <Image src={url} alt={mat?.nome ?? ""} fill sizes={`${size}px`} className="object-cover" />
      </div>
    );
  }

  return <div title={label} className={cn("shrink-0", className)} style={swatchStyle(mat)} />;
}
