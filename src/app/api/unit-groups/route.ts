import type { NextRequest } from "next/server";

import { withProject, withProjectBody } from "@/lib/api/handler";
import { createUnitGroup, listUnitGroups } from "@/lib/server/store";

export async function GET(req: NextRequest) {
  return withProject(req, listUnitGroups);
}

export async function POST(req: NextRequest) {
  return withProjectBody(req, createUnitGroup);
}
