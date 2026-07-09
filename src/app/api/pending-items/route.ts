import type { NextRequest } from "next/server";

import { withOrg } from "@/lib/api/handler";
import { addPendingItem, listPendingItems, removePendingItem } from "@/lib/server/store";

export async function GET() {
  return withOrg((org) => listPendingItems(org));
}

export async function POST(req: NextRequest) {
  const { key } = (await req.json()) as { key: string };
  return withOrg((org) => addPendingItem(org, key));
}

export async function DELETE(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key") ?? "";
  return withOrg((org) => removePendingItem(org, key));
}
