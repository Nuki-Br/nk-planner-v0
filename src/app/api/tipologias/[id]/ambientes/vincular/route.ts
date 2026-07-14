import type { NextRequest } from "next/server";

import { toInt, withOrg } from "@/lib/api/handler";
import { linkAmbiente } from "@/lib/server/store";

/**
 * Compartilha um ambiente de outra planta na planta alvo (insere um BlueprintRoom
 * para o MESMO Room — sem clonar). `srcAmbienteId` = BlueprintRoom de origem.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { srcAmbienteId } = (await req.json()) as { srcAmbienteId: number };
  return withOrg((org) => linkAmbiente(org, toInt(params.id), srcAmbienteId));
}
