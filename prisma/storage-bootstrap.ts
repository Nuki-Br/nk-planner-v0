// Cria/reconcilia o bucket do media center no Supabase Storage.
// Idempotente: cria se não existe, atualiza a config se já existe.
//
// O bucket é PÚBLICO por decisão (espelha a semântica do Azure Blob do
// nk-admin-portal): getPublicUrl() devolve URL estável e permanente, gravável
// na coluna PublicUrl e otimizável pelo next/image. O isolamento vem do path
// "{organizationId}/{uuid}.{ext}", que não é adivinhável.
//
// RLS: nenhuma policy é necessária, e isso é intencional. Bucket público →
// leitura anônima passa por design. Escrita → só via service-role (route
// handlers) ou signed upload URL, que é um token de capacidade escopado a um
// path. Sem policy em storage.objects, anon/authenticated não escrevem direto.
//
// Rodar com: npm run storage:bootstrap
import { createSupabaseAdminClient } from "../src/lib/supabase/admin";
import {
  ACCEPTED_MEDIA_MIME_TYPES,
  MEDIA_BUCKET,
  MEDIA_MAX_FILE_BYTES,
} from "../src/shared/utils/media";

// allowedMimeTypes é a ÚNICA guarda server-side do que de fato aterrissa no
// bucket: a signed upload URL é agnóstica de conteúdo, então sem isto um
// cliente poderia subir qualquer coisa para o path assinado.
const BUCKET_CONFIG = {
  public: true,
  fileSizeLimit: MEDIA_MAX_FILE_BYTES,
  allowedMimeTypes: [...ACCEPTED_MEDIA_MIME_TYPES],
};

async function main(): Promise<void> {
  const admin = createSupabaseAdminClient();

  const { data: existing, error: getError } =
    await admin.storage.getBucket(MEDIA_BUCKET);

  if (existing) {
    const { error } = await admin.storage.updateBucket(MEDIA_BUCKET, BUCKET_CONFIG);
    if (error) throw new Error(`Falha ao atualizar o bucket: ${error.message}`);
    console.log(`✔ Bucket "${MEDIA_BUCKET}" já existia — config reconciliada.`);
  } else {
    // getBucket erra com "not found" quando o bucket não existe; qualquer outro
    // erro (rede, credencial) não deve virar um createBucket às cegas.
    if (getError && !/not.?found/i.test(getError.message)) {
      throw new Error(`Falha ao consultar o bucket: ${getError.message}`);
    }
    const { error } = await admin.storage.createBucket(MEDIA_BUCKET, BUCKET_CONFIG);
    if (error) throw new Error(`Falha ao criar o bucket: ${error.message}`);
    console.log(`✔ Bucket "${MEDIA_BUCKET}" criado.`);
  }

  console.log(
    `  público: ${BUCKET_CONFIG.public} · limite: ${MEDIA_MAX_FILE_BYTES} bytes · ${BUCKET_CONFIG.allowedMimeTypes.length} MIME types`
  );
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
