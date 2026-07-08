import type { NextRequest } from "next/server";

import { withOrg } from "@/lib/api/handler";
import {
  deleteComponente,
  updateComponente,
  type ComponenteInput,
} from "@/lib/server/store";

interface Params {
  params: { id: string; ambId: string; compId: string };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const patch = (await req.json()) as Partial<ComponenteInput>;
  return withOrg((org) =>
    updateComponente(org, params.id, params.ambId, params.compId, patch)
  );
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withOrg((org) => deleteComponente(org, params.id, params.ambId, params.compId));
}
