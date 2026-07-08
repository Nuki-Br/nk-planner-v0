import type { NextRequest } from "next/server";

import { withOrg } from "@/lib/api/handler";
import { createVersion, listVersions, type VersionInput } from "@/lib/server/store";

export async function GET() {
  return withOrg((org) => listVersions(org));
}

export async function POST(req: NextRequest) {
  const input = (await req.json()) as VersionInput;
  return withOrg((org) => createVersion(org, input));
}
