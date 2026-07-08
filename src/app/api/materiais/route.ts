import type { NextRequest } from "next/server";

import { withOrg } from "@/lib/api/handler";
import {
  createMateriais,
  createMaterial,
  listMateriais,
  type MaterialInput,
} from "@/lib/server/store";
import type { Material } from "@/shared/types/domain";

export async function GET() {
  return withOrg((org) => listMateriais(org));
}

/** Body objeto → cria 1 material; body array → criação em lote (CSV). */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as MaterialInput | MaterialInput[];
  return withOrg<Material | Material[]>((org) =>
    Array.isArray(body) ? createMateriais(org, body) : createMaterial(org, body)
  );
}
