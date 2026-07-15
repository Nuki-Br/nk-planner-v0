import Image from "next/image";

import { cn } from "@/lib/utils";

import { Icon } from "./Icon";

interface MaterialThumbProps {
  /** URL da imagem. Ausente/null → ícone neutro. */
  url?: string | null;
  /** Texto alternativo (normalmente o nome do material). */
  alt: string;
  /** Lado do quadrado em px. */
  size?: number;
  /**
   * Kit não tem imagem própria (o domínio Kit não tem o campo) — ganha um
   * visual próprio em vez do ícone de "falta imagem", que seria mentira.
   */
  isKit?: boolean;
  className?: string;
}

/**
 * Miniatura de material para tabelas e listas.
 *
 * Fallback é ÍCONE NEUTRO, não o swatch do canvas: numa tabela a textura falsa
 * daria a entender que aquele é o acabamento real. No canvas o swatch continua
 * (ver MaterialSwatch) — decisão consciente de divergir por contexto.
 */
export function MaterialThumb({
  url,
  alt,
  size = 36,
  isKit = false,
  className,
}: MaterialThumbProps) {
  // A borda fica nos ramos que a querem, não na base com border-none por cima:
  // `border` (width) e `border-none` (style) são propriedades diferentes, então
  // o tailwind-merge não dedupa e o resultado sairia certo por acidente.
  const box = cn("relative shrink-0 overflow-hidden rounded-lg", className);
  const bordered = "border border-neutral-gray-4";
  const style = { width: size, height: size };

  if (isKit) {
    return (
      <div
        style={style}
        title="Kit — composição de materiais"
        className={cn(box, "flex items-center justify-center bg-primary-8 text-white")}
      >
        <Icon name="layers" size={Math.round(size * 0.5)} />
      </div>
    );
  }

  if (!url) {
    return (
      <div
        style={style}
        title="Sem imagem"
        className={cn(box, bordered, "flex items-center justify-center bg-neutral-gray-2")}
      >
        <Icon name="image_off" size={Math.round(size * 0.45)} className="text-neutral-gray-6" />
      </div>
    );
  }

  return (
    <div style={style} className={cn(box, bordered)}>
      {/* `sizes` é o que impede a tabela de baixar a imagem em tamanho cheio
          por linha — sem ele o next/image serve a maior variante. */}
      <Image src={url} alt={alt} fill sizes={`${size}px`} className="object-cover" />
    </div>
  );
}
