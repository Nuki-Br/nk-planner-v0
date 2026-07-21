import type { NextRequest } from "next/server";

import { withProject, withProjectBody } from "@/lib/api/handler";
import { listTorres, updateTorres } from "@/lib/server/store";

export async function GET(req: NextRequest) {
  return withProject(req, listTorres);
}

/** Reconcilia a lista completa de torres do empreendimento (por id). */
export async function PUT(req: NextRequest) {
  return withProjectBody(req, updateTorres);
}
