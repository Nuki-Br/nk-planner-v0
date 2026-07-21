import { NextResponse, type NextRequest } from "next/server";

import { getAuthContext, type AuthContext } from "@/lib/auth/session";
import { assertEnterprise } from "@/lib/server/store";
import type { BaseResult } from "@/shared/types/api";

// Envelope BaseResult + resolução de organização para as rotas /api/*.
// withOrg: exige sessão e injeta o organizationId do membership — o cliente
// NUNCA envia org. publicRoute: para o portal do terceiro (token no path).
//
// withProject/withProjectBody estabelecem a INVARIANTE do escopo por
// empreendimento: um projectId que chega numa fn do store JÁ foi validado
// contra a org (aqui, ou derivado de uma linha já validada — ver o portal, que
// usa o EnterpriseId do próprio FillLink). Por isso as fns do store não repetem
// o assertEnterprise: seria um round-trip a mais por request.

export function ok<T>(data: T): NextResponse {
  const body: BaseResult<T> = { success: true, data };
  return NextResponse.json(body);
}

export function fail(message: string, status: number): NextResponse {
  const body: BaseResult<null> = { success: false, data: null, message };
  return NextResponse.json(body, { status });
}

/** Mapeia mensagens do store de servidor para status HTTP. */
function statusFor(message: string): number {
  if (message.includes("não encontrad")) return 404;
  return 400;
}

/** Parseia um id de path (string) para Int; id inválido → 404 via run(). */
export function toInt(raw: string): number {
  const n = Number(raw);
  if (!Number.isInteger(n)) throw new Error("Recurso não encontrado.");
  return n;
}

async function run<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    return ok(await fn());
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Erro interno.";
    return fail(message, statusFor(message));
  }
}

/**
 * Como withOrg, mas entrega o AuthContext inteiro. Use quando a rota precisa de
 * mais que a org — hoje só o upload de mídia, que grava o userId em
 * MediaFile.UploadedById.
 */
export async function withAuth<T>(
  fn: (auth: AuthContext) => Promise<T>
): Promise<NextResponse> {
  const auth = await getAuthContext();
  if (!auth) return fail("Não autenticado.", 401);
  return run(() => fn(auth));
}

export async function withOrg<T>(
  fn: (organizationId: string) => Promise<T>
): Promise<NextResponse> {
  return withAuth((auth) => fn(auth.organizationId));
}

export async function publicRoute<T>(fn: () => Promise<T>): Promise<NextResponse> {
  return run(fn);
}

// ─── Escopo por empreendimento ─────────────────────────────────────────

/** Corpo das rotas por empreendimento: o payload vem embrulhado com o projeto. */
export interface ProjectPayload<B> {
  projectId: number;
  input: B;
}

/**
 * Id ausente, não-inteiro ou de outra org caem todos na MESMA mensagem, que o
 * statusFor mapeia para 404. Distinguir "não existe" de "existe mas não é sua"
 * vazaria a existência de empreendimentos de outras organizações.
 */
function parseProjectId(raw: string | number | null): number {
  const n = typeof raw === "string" ? Number(raw) : raw;
  if (n === null || !Number.isInteger(n)) throw new Error("Empreendimento não encontrado.");
  return n;
}

/** Escopo por `?projectId=` — para os GET. */
export async function withProject<T>(
  req: NextRequest,
  fn: (organizationId: string, projectId: number) => Promise<T>
): Promise<NextResponse> {
  return withOrg(async (org) => {
    const projectId = parseProjectId(req.nextUrl.searchParams.get("projectId"));
    await assertEnterprise(org, projectId);
    return fn(org, projectId);
  });
}

/**
 * Escopo por `{ projectId, input }` no body — para POST/PUT. Separado do
 * withProject de propósito: req.json() só pode ser lido uma vez, e um helper
 * que às vezes consome o body é uma armadilha silenciosa.
 */
export async function withProjectBody<T, B>(
  req: NextRequest,
  fn: (organizationId: string, projectId: number, input: B) => Promise<T>
): Promise<NextResponse> {
  const body = (await req.json()) as ProjectPayload<B>;
  return withOrg(async (org) => {
    const projectId = parseProjectId(body.projectId);
    await assertEnterprise(org, projectId);
    return fn(org, projectId, body.input);
  });
}
