// Adapter do Supabase Storage para o Media Center. Isola o SDK para que
// lib/server/media.ts fale só de domínio — e para que trocar o driver (Azure,
// S3) seja mexer só aqui.
//
// SOMENTE SERVIDOR: usa o cliente service-role.
import { randomUUID } from "crypto";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { MEDIA_BUCKET } from "@/shared/utils/media";

export { MEDIA_BUCKET };

/**
 * TTL da URL assinada de upload. O Supabase NÃO aceita parâmetro de expiração
 * em createSignedUploadUrl — são 2h fixas no servidor. O contrato original
 * (Azure SAS) prometia 15 min; 2h é estritamente mais permissivo, e a nota do
 * contrato sobre registro Pending órfão continua valendo.
 */
export const SIGNED_UPLOAD_TTL_MS = 2 * 60 * 60 * 1000;

/** Extensão do nome original, minúscula e sem ponto. "" se não houver. */
function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot < 0 || dot === filename.length - 1) return "";
  return filename.slice(dot + 1).toLowerCase();
}

/**
 * Path do objeto: "{organizationId}/{uuid}.{ext}".
 *
 * O bucket é público, então o segredo é o path: o uuid impede adivinhação e o
 * prefixo de org mantém os arquivos de cada organização separados (e permite
 * uma policy por prefixo, se um dia o bucket virar privado).
 */
export function buildStoragePath(organizationId: string, filename: string): string {
  const ext = extensionOf(filename);
  const name = ext ? `${randomUUID()}.${ext}` : randomUUID();
  return `${organizationId}/${name}`;
}

/** URL assinada para o cliente dar PUT direto, sem passar pelo servidor. */
export async function createUploadUrl(path: string): Promise<string> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(MEDIA_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    throw new Error(
      `Não foi possível preparar o upload: ${error?.message ?? "erro desconhecido"}`
    );
  }
  return data.signedUrl;
}

/**
 * Metadados do objeto, ou null se não existe.
 *
 * Usado no confirm para provar que o binário chegou. Melhor que um HEAD na URL
 * pública (que pode servir 404 de cache do CDN) e devolve o tamanho REAL — que
 * é o que alimenta a contagem de uso, em vez do sizeBytes que o cliente
 * declarou no passo 1 e pode ter mentido.
 */
export async function statObject(path: string): Promise<{ sizeBytes: number } | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage.from(MEDIA_BUCKET).info(path);

  if (error || !data) return null;
  return { sizeBytes: data.size ?? 0 };
}

/** Remove o objeto. Idempotente: remover o que não existe não é erro. */
export async function removeObject(path: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage.from(MEDIA_BUCKET).remove([path]);
  if (error) throw new Error(`Não foi possível remover o arquivo: ${error.message}`);
}

/** URL pública permanente (o bucket é público — ver docs/decisions.md). */
export function publicUrlFor(path: string): string {
  const admin = createSupabaseAdminClient();
  return admin.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}
