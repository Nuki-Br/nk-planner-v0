import type { NextRequest } from "next/server";

import { withOrg } from "@/lib/api/handler";
import { cloneAmbiente } from "@/lib/server/store";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string; ambId: string } }
) {
  return withOrg((org) => cloneAmbiente(org, params.id, params.ambId));
}
