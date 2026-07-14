import type { NextRequest } from "next/server";

import { toInt, withOrg } from "@/lib/api/handler";
import { restoreVersion } from "@/lib/server/store";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  return withOrg((org) => restoreVersion(org, toInt(params.id)));
}
