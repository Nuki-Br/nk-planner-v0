import type { NextRequest } from "next/server";

import { withOrg } from "@/lib/api/handler";
import { createProject, listProjects, type ProjectInput } from "@/lib/server/store";

export async function GET() {
  return withOrg((org) => listProjects(org));
}

/** withOrg, não withProjectBody: ainda não existe empreendimento para escopar. */
export async function POST(req: NextRequest) {
  const input = (await req.json()) as ProjectInput;
  return withOrg((org) => createProject(org, input));
}
