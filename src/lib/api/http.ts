import type { BaseResult } from "@/shared/types/api";

/**
 * Thin typed fetch wrapper for calling this app's own Next.js route handlers
 * from client components (paired with React Query). Unwraps the `BaseResult`
 * envelope and throws on failure so React Query can surface the error.
 *
 * Real endpoints are added in Phase 5; this establishes the calling convention.
 */
export async function httpGet<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = (await res.json()) as BaseResult<T>;

  if (!res.ok || !body.success) {
    throw new Error(body.message ?? `Request failed: ${res.status}`);
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
  const body = (await res.json()) as BaseResult<T>;

  if (!res.ok || !body.success) {
    throw new Error(body.message ?? `Request failed: ${res.status}`);
  }
  return body.data;
}
