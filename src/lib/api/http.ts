import type { BaseResult } from "@/shared/types/api";

/**
 * Thin typed fetch wrapper for calling this app's own Next.js route handlers
 * from client components (paired with React Query). Unwraps the `BaseResult`
 * envelope and throws on failure so React Query can surface the error.
 *
 * Real endpoints are added in Phase 5; this establishes the calling convention.
 */

/** Mensagem amigável quando não há `message` no corpo (ou o corpo nem é JSON). */
function statusFallback(status: number): string {
  if (status === 502 || status === 503 || status === 504)
    return "Serviço temporariamente indisponível. Tente novamente.";
  if (status >= 500) return "Erro no servidor. Tente novamente em instantes.";
  if (status === 401 || status === 403) return "Sessão expirada. Recarregue a página.";
  if (status === 404) return "Recurso não encontrado.";
  return `Falha na requisição (${status}).`;
}

/**
 * Lê o envelope com tolerância: um 500/gateway devolve HTML, não JSON, e um
 * `res.json()` cru estouraria com um `SyntaxError` opaco em vez de um erro
 * legível. Todas as rotas respondem com o envelope (inclusive DELETE), então
 * corpo vazio — 204 incluso — é quebra de contrato e vira erro, não `data: null`
 * disfarçado de `T`.
 */
async function parseBody<T>(res: Response): Promise<BaseResult<T>> {
  try {
    return (await res.json()) as BaseResult<T>;
  } catch {
    throw new Error(statusFallback(res.status));
  }
}

export async function httpGet<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await parseBody<T>(res);

  if (!res.ok || !body.success) {
    throw new Error(body.message ?? statusFallback(res.status));
  }
  return body.data;
}

export async function httpSend<T, B = object>(
  path: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  payload?: B
): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  const body = await parseBody<T>(res);

  if (!res.ok || !body.success) {
    throw new Error(body.message ?? statusFallback(res.status));
  }
  return body.data;
}
