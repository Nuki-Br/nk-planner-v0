import type { NextRequest } from "next/server";

import { withOrg } from "@/lib/api/handler";
import { listMediaFiles, parseFileType } from "@/lib/server/media";

/** Inteiro opcional de query string (ausente → undefined; inválido → erro). */
function optionalInt(raw: string | null, field: string): number | undefined {
  if (raw === null || raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n)) throw new Error(`Parâmetro inválido: ${field}.`);
  return n;
}

/** GET ?folderId=&page=&limit=&search=&fileType= — sem folderId = toda a org. */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  return withOrg((org) =>
    listMediaFiles(org, {
      folderId: optionalInt(sp.get("folderId"), "folderId"),
      page: optionalInt(sp.get("page"), "page"),
      limit: optionalInt(sp.get("limit"), "limit"),
      search: sp.get("search") ?? undefined,
      fileType: parseFileType(sp.get("fileType")),
    })
  );
}
