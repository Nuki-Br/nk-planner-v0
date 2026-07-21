import type { NextRequest } from "next/server";

import { withProjectBody } from "@/lib/api/handler";
import { createFillLink } from "@/lib/server/store";

export async function POST(req: NextRequest) {
  return withProjectBody(req, createFillLink);
}
