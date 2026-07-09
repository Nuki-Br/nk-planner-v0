import type { NextRequest } from "next/server";

import { withOrg } from "@/lib/api/handler";
import {
  appendComment,
  getComments,
  listCommentThreads,
  type CommentInput,
} from "@/lib/server/store";
import type { Comment } from "@/shared/types/domain";

/** GET ?rowKey= → thread única; sem query → todas as threads (contadores). */
export async function GET(req: NextRequest) {
  const rowKey = req.nextUrl.searchParams.get("rowKey");
  return withOrg<Comment[] | Record<string, Comment[]>>((org) =>
    rowKey !== null ? getComments(org, rowKey) : listCommentThreads(org)
  );
}

export async function POST(req: NextRequest) {
  const { rowKey, input } = (await req.json()) as { rowKey: string; input: CommentInput };
  return withOrg((org) => appendComment(org, rowKey, input));
}
