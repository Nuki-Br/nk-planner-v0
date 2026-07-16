import type { NextRequest } from "next/server";

import { withOrg } from "@/lib/api/handler";
import { listTorres, updateTorres, type TorreInput } from "@/lib/server/store";

export async function GET() {
  return withOrg((org) => listTorres(org));
}

/** Reconcilia a lista completa de torres do empreendimento âncora (por id). */
export async function PUT(req: NextRequest) {
  const items = (await req.json()) as TorreInput[];
  return withOrg((org) => updateTorres(org, items));
}
