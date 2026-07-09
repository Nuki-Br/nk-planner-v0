import type { NextRequest } from "next/server";

import { withOrg } from "@/lib/api/handler";
import { getProject, updateProject, type ProjectPatch } from "@/lib/server/store";

interface Params {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: Params) {
  return withOrg((org) => getProject(org, params.id));
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const patch = (await req.json()) as ProjectPatch;
  return withOrg((org) => updateProject(org, params.id, patch));
}
