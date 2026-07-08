import type { NextRequest } from "next/server";

import { withOrg } from "@/lib/api/handler";
import { createFillLink, type FillLinkInput } from "@/lib/server/store";

export async function POST(req: NextRequest) {
  const input = (await req.json()) as FillLinkInput;
  return withOrg((org) => createFillLink(org, input));
}
