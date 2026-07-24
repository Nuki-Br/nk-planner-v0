import type { NextRequest } from "next/server";

import { fail, toInt, withOrg } from "@/lib/api/handler";
import { listEnterpriseCosts, upsertEnterpriseCost } from "@/lib/server/store";

interface Params {
  params: { id: string };
}

/** Corpo do PATCH — um material por vez (a grade grava no blur de cada campo). */
interface CustoBaseBody {
  baseId: number;
  custoMat?: number;
  custoMO?: number;
}

// `custoMat`/`custoMO` são opcionais de propósito: a UI grava um campo por vez,
// e mandar o outro como 0 apagaria o valor já preenchido.
function isCustoBaseBody(v: unknown): v is CustoBaseBody {
  if (typeof v !== "object" || v === null) return false;
  const b = v as Record<string, unknown>;
  if (!Number.isInteger(b.baseId)) return false;
  for (const k of ["custoMat", "custoMO"] as const) {
    if (b[k] !== undefined && (typeof b[k] !== "number" || !Number.isFinite(b[k]))) return false;
  }
  return true;
}

export async function GET(_req: NextRequest, { params }: Params) {
  return withOrg((org) => listEnterpriseCosts(org, toInt(params.id)));
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const body: unknown = await req.json();
  if (!isCustoBaseBody(body)) return fail("Payload de custo base inválido.", 400);
  const { baseId, ...patch } = body;
  return withOrg((org) => upsertEnterpriseCost(org, toInt(params.id), baseId, patch));
}
