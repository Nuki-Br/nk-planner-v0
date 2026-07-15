// Regras de mídia compartilhadas entre servidor e cliente (puro, sem I/O).
// Porta de nk-admin-portal/src/shared/utils/Media.ts, com dois bugs corrigidos
// (ver humanFileSize).

/**
 * Bucket do Supabase Storage. É o valor de `storageContainer` no DTO, então
 * faz parte do contrato — não é detalhe interno do servidor.
 */
export const MEDIA_BUCKET = "media";

/** Teto por arquivo (25 MiB). Validado no cliente e no bucket. */
export const MEDIA_MAX_FILE_BYTES = 25 * 1024 * 1024;

/**
 * Tipos aceitos no upload. A lista é verbatim do contrato do media center
 * (nk-api-customization/docs/media-center-frontend-integration.md) para que o
 * front e o backend concordem sem tradução.
 *
 * Nota: "image/ico" não é um MIME real — navegadores reportam "image/x-icon".
 * Mantido verbatim por paridade de contrato; na prática .ico é rejeitado.
 */
export const ACCEPTED_MEDIA_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/svg+xml",
  "image/tiff",
  "image/bmp",
  "image/ico",
  "image/heic",
  "image/heif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const isAcceptedMediaMimeType = (mimeType: string): boolean =>
  (ACCEPTED_MEDIA_MIME_TYPES as readonly string[]).includes(mimeType);

export const isImageMimeType = (mimeType: string): boolean =>
  mimeType.startsWith("image/");

const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

/**
 * BigInt-as-string (o contrato serializa SizeBytes/UsedBytes assim) → Number.
 * Entrada inválida vira NaN em vez de lançar: BigInt("abc") lança SyntaxError.
 */
function toByteCount(bytes: string | number | bigint): number {
  if (typeof bytes !== "string") return Number(bytes);
  try {
    return Number(BigInt(bytes));
  } catch {
    return Number.NaN;
  }
}

/** Tamanho legível: "0 B", "1.5 KB", "2.0 GB". Entrada inválida → "0 B". */
export const humanFileSize = (bytes: string | number | bigint): string => {
  const value = toByteCount(bytes);
  if (!Number.isFinite(value) || value <= 0) return "0 B";

  const exponent = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    BYTE_UNITS.length - 1
  );
  const size = value / Math.pow(1024, exponent);

  // O Math.min acima já garante o índice no range, então o `??` é exigência de
  // tipo (noUncheckedIndexedAccess), não guarda de runtime. Fica porque o custo
  // é zero e porque protege se alguém mexer no clamp.
  return `${size.toFixed(exponent === 0 ? 0 : 1)} ${BYTE_UNITS[exponent] ?? BYTE_UNITS[0]}`;
};
