import type { NextRequest } from "next/server";

import { withOrg } from "@/lib/api/handler";
import { createKit, listKits, type KitInput } from "@/lib/server/store";

export async function GET() {
  return withOrg((org) => listKits(org));
}

export async function POST(req: NextRequest) {
  const input = (await req.json()) as KitInput;
  return withOrg((org) => createKit(org, input));
}
