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

// ─── Portal do terceiro (rota pública /api/portal/[token]) ────────────
import type {
  CustosBase,
  FillLinkCampos,
  Material,
  PortalFill,
  Tipologia,
} from "@/shared/types/domain";

/**
 * Payload completo do portal, resolvido no servidor a partir do token.
 * Quando `protegido` é true (senha exigida e não fornecida), os dados vêm
 * vazios — o gate desbloqueia repetindo o GET com ?senha=.
 */
export interface PortalData {
  protegido: boolean;
  projectNome: string;
  prazo: string | null;
  campos: FillLinkCampos;
  /** Só as tipologias do escopo do link (com ambientes/componentes). */
  tipologias: Tipologia[];
  materiais: Material[];
  /**
   * Custo base JÁ preenchido neste empreendimento — semeia os campos do portal.
   * Vem do empreendimento do link, não do catálogo: o que a construtora desta
   * obra cotou não vale para as outras obras da incorporadora.
   */
  custosBase: CustosBase;
  fills: Record<string, PortalFill>;
}
