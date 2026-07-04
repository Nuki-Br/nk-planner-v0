// Standard envelope for Next.js route-handler responses. Mirrors the
// `BaseResult<T>` shape used in nk-admin-portal so the client API layer feels
// familiar, but here it wraps our own route handlers (not an external gateway).
export interface BaseResult<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string | string[];
}

export interface Paginated<T> {
  results: T[];
  total: number;
}

export interface GetParams {
  page?: number;
  pageSize?: number;
  search?: string;
}
