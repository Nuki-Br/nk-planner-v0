import type { NextRequest } from "next/server";

import { toInt, withOrg } from "@/lib/api/handler";
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
  return withOrg((org) => getTipologia(org, toInt(params.id)));
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const patch = (await req.json()) as Partial<TipologiaInput & { status: TipologiaStatus }>;
  return withOrg((org) => updateTipologia(org, toInt(params.id), patch));
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withOrg((org) => deleteTipologia(org, toInt(params.id)));
}
