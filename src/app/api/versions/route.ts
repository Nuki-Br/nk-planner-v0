import type { NextRequest } from "next/server";

import { withProject, withProjectBody } from "@/lib/api/handler";
import { createVersion, listVersions } from "@/lib/server/store";

export async function GET(req: NextRequest) {
  return withProject(req, listVersions);
}

export async function POST(req: NextRequest) {
  return withProjectBody(req, createVersion);
}
