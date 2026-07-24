import type { NextRequest } from "next/server";

import { fail, toInt, withOrg } from "@/lib/api/handler";
import { listPricing, upsertPricing, type PricingPatch } from "@/lib/server/store";
import { UNIDADES } from "@/shared/constants/unidades";
import type { Unidade } from "@/shared/types/domain";

interface Params {
  params: { id: string };
}

interface PricingBody extends PricingPatch {
  /** Material id (a aplicação sendo precificada). */
  optionId: number;
}

/** `null` é valor legítimo (limpa o override), então só `undefined` passa batido. */
function isNumOrNull(v: unknown): boolean {
  return v === null || (typeof v === "number" && Number.isFinite(v));
}

function isColunas(v: unknown): v is Record<string, string> {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
  return Object.values(v).every((x) => typeof x === "string");
}

function isPricingBody(v: unknown): v is PricingBody {
  if (typeof v !== "object" || v === null) return false;
  const b = v as Record<string, unknown>;
  if (!Number.isInteger(b.optionId)) return false;
  for (const k of ["valorUnitario", "qtd", "rt"] as const) {
    if (b[k] !== undefined && !isNumOrNull(b[k])) return false;
  }
  if (
    b.unidade !== undefined &&
    b.unidade !== null &&
    !UNIDADES.includes(b.unidade as Unidade)
  ) {
    return false;
  }
  if (b.colunas !== undefined && !isColunas(b.colunas)) return false;
  return true;
}

export async function GET(_req: NextRequest, { params }: Params) {
  return withOrg((org) => listPricing(org, toInt(params.id)));
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const body: unknown = await req.json();
  if (!isPricingBody(body)) return fail("Payload de precificação inválido.", 400);
  const { optionId, ...patch } = body;
  return withOrg((org) => upsertPricing(org, toInt(params.id), optionId, patch));
}
