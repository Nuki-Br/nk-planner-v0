import type { NextRequest } from "next/server";

import { withProject, withProjectBody } from "@/lib/api/handler";
import { createTipologia, listTipologias } from "@/lib/server/store";

export async function GET(req: NextRequest) {
  return withProject(req, listTipologias);
}

export async function POST(req: NextRequest) {
  return withProjectBody(req, createTipologia);
}
