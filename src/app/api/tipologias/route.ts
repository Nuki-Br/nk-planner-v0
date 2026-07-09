import type { NextRequest } from "next/server";

import { withOrg } from "@/lib/api/handler";
import { createTipologia, listTipologias, type TipologiaInput } from "@/lib/server/store";

export async function GET() {
  return withOrg((org) => listTipologias(org));
}

export async function POST(req: NextRequest) {
  const input = (await req.json()) as TipologiaInput;
  return withOrg((org) => createTipologia(org, input));
}
