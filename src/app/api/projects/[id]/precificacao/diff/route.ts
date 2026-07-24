import type { NextRequest } from "next/server";

import { toInt, withOrg } from "@/lib/api/handler";
import { getPricingDiff } from "@/lib/server/pricing";

// Diff rascunho × publicado. Vive no servidor (e não no cliente) para percorrer
// o MESMO resolvedor que a publicação usa — o que o modal promete é o que o
// publish grava.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  return withOrg((org) => getPricingDiff(org, toInt(params.id)));
}
