import type { NextRequest } from "next/server";

import { withOrg } from "@/lib/api/handler";
import { createCategoria, listCategorias, type CategoriaInput } from "@/lib/server/store";

export async function GET() {
  return withOrg((org) => listCategorias(org));
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as CategoriaInput;
  return withOrg((org) => createCategoria(org, body));
}
