import type { NextRequest } from "next/server";

import { toInt, withOrg } from "@/lib/api/handler";
import { getFileUsages } from "@/lib/server/media";

interface Params {
  params: { id: string };
}

/** GET — "Onde é usado?": plantas, ambientes e materiais que apontam pra cá. */
export async function GET(_req: NextRequest, { params }: Params) {
  return withOrg((org) => getFileUsages(org, toInt(params.id)));
}
