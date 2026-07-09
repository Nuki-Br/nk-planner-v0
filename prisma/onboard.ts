// Onboarding de um cliente novo: cria uma organização ISOLADA + o login dele no
// Supabase Auth + um projeto âncora VAZIO. Diferente do seed, NÃO carrega o
// catálogo/tipologias de demonstração — a org começa limpa para o cliente
// construir do zero. Idempotente (upsert; não recria o projeto se já existir).
//
// Rodar com as variáveis do cliente (o resto vem do .env.local):
//   bash:
//     CLIENT_ORG_ID=org-acme CLIENT_ORG_NAME="ACME Incorporadora" \
//     CLIENT_EMAIL=cliente@acme.com CLIENT_PASSWORD="senha-forte" \
//     npm run db:onboard
//   PowerShell:
//     $env:CLIENT_ORG_ID="org-acme"; $env:CLIENT_ORG_NAME="ACME Incorporadora";
//     $env:CLIENT_EMAIL="cliente@acme.com"; $env:CLIENT_PASSWORD="senha-forte";
//     npm run db:onboard
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

import { TAX_COLUMNS_DEFAULT } from "../src/shared/constants/budget";

const prisma = new PrismaClient();

function reqEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`✗ Falta a variável de ambiente ${name}.`);
    process.exit(1);
  }
  return v;
}

/** Cria (ou reaproveita) o usuário no Supabase Auth e retorna o id. */
async function ensureAuthUser(email: string, password: string): Promise<string> {
  const url = reqEnv("NEXT_PUBLIC_SUPABASE_URL");
  const secret = reqEnv("SUPABASE_SECRET_KEY");
  const admin = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.data.user) return created.data.user.id;

  // Já existe? Procura na listagem (beta: poucos usuários).
  const list = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = list.data?.users.find((u) => u.email === email);
  if (existing) return existing.id;

  console.error(
    `✗ Não foi possível criar/achar o usuário ${email}: ${created.error?.message ?? "erro desconhecido"}`
  );
  process.exit(1);
}

async function main(): Promise<void> {
  const orgId = reqEnv("CLIENT_ORG_ID");
  const orgName = reqEnv("CLIENT_ORG_NAME");
  const email = reqEnv("CLIENT_EMAIL");
  const password = reqEnv("CLIENT_PASSWORD");
  const projectNome = process.env.CLIENT_PROJECT_NOME ?? "Meu primeiro empreendimento";

  // ── Organização + usuário + membership (owner) ──
  await prisma.organization.upsert({
    where: { id: orgId },
    update: { name: orgName },
    create: { id: orgId, name: orgName },
  });

  const authUserId = await ensureAuthUser(email, password);
  await prisma.membership.upsert({
    where: { authUserId_organizationId: { authUserId, organizationId: orgId } },
    update: { email, role: "owner" },
    create: { authUserId, email, role: "owner", organizationId: orgId },
  });

  // ── Projeto âncora vazio (só se a org ainda não tiver projeto) ──
  // getActiveProjectId resolve o projeto ativo da org por este registro. As
  // colunas de cálculo recebem ids namespaced pela org — BudgetColumn.id é PK
  // GLOBAL, então não podem reusar os ids default (tc1/tc2/tc3) de outra org.
  const existing = await prisma.project.findFirst({ where: { organizationId: orgId } });
  if (!existing) {
    const projectId = `${orgId}-prj-1`;
    await prisma.project.create({
      data: {
        id: projectId,
        nome: projectNome,
        torre: "",
        incorporadora: orgName,
        construtora: "",
        status: "rascunho",
        totalItens: 0,
        itensPreenchidos: 0,
        organizationId: orgId,
        taxColumns: {
          create: TAX_COLUMNS_DEFAULT.map((c, i) => ({
            ...c,
            id: `${projectId}-${c.id}`,
            ordem: i,
            organizationId: orgId,
          })),
        },
      },
    });
    console.log(`  · Projeto âncora criado: "${projectNome}" (${projectId})`);
  } else {
    console.log(`  · Org já possui projeto (${existing.id}) — mantido.`);
  }

  console.log(`✓ Onboarding OK — org "${orgName}" (${orgId}), login ${email}.`);
  console.log(
    "  Fluxo do cliente: /login → config base → catálogo (materiais) → tipologias → construtor de preço → publicação."
  );
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
