import type { NextRequest } from "next/server";

import { withOrg } from "@/lib/api/handler";
import {
  deleteTipologia,
  getTipologia,
  updateTipologia,
  type TipologiaInput,
} from "@/lib/server/store";
import type { TipologiaStatus } from "@/shared/types/domain";

interface Params {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: Params) {
  return withOrg((org) => getTipologia(org, params.id));
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const patch = (await req.json()) as Partial<TipologiaInput & { status: TipologiaStatus }>;
  return withOrg((org) => updateTipologia(org, params.id, patch));
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withOrg((org) => deleteTipologia(org, params.id));
}
