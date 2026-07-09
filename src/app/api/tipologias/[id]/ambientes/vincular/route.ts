import type { NextRequest } from "next/server";

import { withOrg } from "@/lib/api/handler";
import { linkAmbiente } from "@/lib/server/store";

/** Vincula (clona + registra compartilhamento) um ambiente de outra tipologia. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { srcTipologiaId, srcAmbienteId } = (await req.json()) as {
    srcTipologiaId: string;
    srcAmbienteId: string;
  };
  return withOrg((org) => linkAmbiente(org, params.id, srcTipologiaId, srcAmbienteId));
}
