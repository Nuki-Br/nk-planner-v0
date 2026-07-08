import { NextResponse } from "next/server";

import { getAuthContext } from "@/lib/auth/session";
import type { BaseResult } from "@/shared/types/api";

// Envelope BaseResult + resolução de organização para as rotas /api/*.
// withOrg: exige sessão e injeta o organizationId do membership — o cliente
// NUNCA envia org. publicRoute: para o portal do terceiro (token no path).

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
  if (message.includes("somente leitura")) return 403;
  return 400;
}

async function run<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    return ok(await fn());
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Erro interno.";
    return fail(message, statusFor(message));
  }
}

export async function withOrg<T>(
  fn: (organizationId: string) => Promise<T>
): Promise<NextResponse> {
  const auth = await getAuthContext();
  if (!auth) return fail("Não autenticado.", 401);
  return run(() => fn(auth.organizationId));
}

export async function publicRoute<T>(fn: () => Promise<T>): Promise<NextResponse> {
  return run(fn);
}
