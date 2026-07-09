import type { NextRequest } from "next/server";

import { withOrg } from "@/lib/api/handler";
import { createUnitGroup, listUnitGroups, type UnitGroupInput } from "@/lib/server/store";

export async function GET() {
  return withOrg((org) => listUnitGroups(org));
}

export async function POST(req: NextRequest) {
  const input = (await req.json()) as UnitGroupInput;
  return withOrg((org) => createUnitGroup(org, input));
}
