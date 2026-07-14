import type { NextRequest } from "next/server";

import { toInt, withOrg } from "@/lib/api/handler";
import {
  createComponente,
  reorderComponentes,
  type ComponenteInput,
} from "@/lib/server/store";

interface Params {
  params: { id: string; ambId: string };
}

export async function POST(req: NextRequest, { params }: Params) {
  const input = (await req.json()) as ComponenteInput;
  return withOrg((org) => createComponente(org, toInt(params.id), toInt(params.ambId), input));
}

/** Reordenação por drag: body = { orderedIds }. */
export async function PUT(req: NextRequest, { params }: Params) {
  const { orderedIds } = (await req.json()) as { orderedIds: number[] };
  return withOrg((org) => reorderComponentes(org, toInt(params.id), toInt(params.ambId), orderedIds));
}
