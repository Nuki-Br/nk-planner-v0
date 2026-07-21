import type { NextRequest } from "next/server";

import { withOrg, withProject } from "@/lib/api/handler";
import { appendComment, getComments, listCommentThreads, type CommentInput } from "@/lib/server/store";

/**
 * GET ?rowKey= → thread única; sem query → todas as threads do empreendimento.
 * Só o segundo ramo precisa de projectId: a thread única é escopada pelo próprio
 * Material (que já resolve org + empreendimento), então exigir ?projectId= nela
 * seria pedir um dado que o chamador não precisa ter.
 */
export async function GET(req: NextRequest) {
  const rowKey = req.nextUrl.searchParams.get("rowKey");
  if (rowKey !== null) return withOrg((org) => getComments(org, rowKey));
  return withProject(req, listCommentThreads);
}

export async function POST(req: NextRequest) {
  const { rowKey, input } = (await req.json()) as { rowKey: string; input: CommentInput };
  return withOrg((org) => appendComment(org, rowKey, input));
}
