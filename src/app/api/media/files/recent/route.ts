import type { NextRequest } from "next/server";

import { withOrg } from "@/lib/api/handler";
import { listRecentMediaFiles, parseFileType } from "@/lib/server/media";

// Segmento estático — o Next 14 resolve /files/recent aqui e não em /files/[id],
// que é o que impede um toInt("recent") → NaN → 404 errado.

/** GET ?fileType= — recentes da org (raiz sem busca). Teto de 50, sem paginação. */
export async function GET(req: NextRequest) {
  const fileType = req.nextUrl.searchParams.get("fileType");
  return withOrg((org) => listRecentMediaFiles(org, parseFileType(fileType)));
}
