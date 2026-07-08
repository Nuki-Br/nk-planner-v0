import type { NextRequest } from "next/server";

import { withOrg } from "@/lib/api/handler";
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
  return withOrg((org) => createComponente(org, params.id, params.ambId, input));
}

/** Reordenação por drag: body = { orderedIds }. */
export async function PUT(req: NextRequest, { params }: Params) {
  const { orderedIds } = (await req.json()) as { orderedIds: string[] };
  return withOrg((org) => reorderComponentes(org, params.id, params.ambId, orderedIds));
}
