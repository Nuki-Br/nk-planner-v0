import type { NextRequest } from "next/server";

import { withProject } from "@/lib/api/handler";
import { getSharedInfo } from "@/lib/server/store";

export async function GET(req: NextRequest) {
  return withProject(req, getSharedInfo);
}
