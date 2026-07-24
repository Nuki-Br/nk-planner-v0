import type { NextRequest } from "next/server";

import { fail, toInt, withOrg } from "@/lib/api/handler";
import { publishBudget, type PublishBudgetInput } from "@/lib/server/pricing";

function isPublishBody(v: unknown): v is PublishBudgetInput {
  if (typeof v !== "object" || v === null) return false;
  const b = v as Record<string, unknown>;
  return typeof b.summary === "string" && typeof b.createdBy === "string";
}

// Congela o rascunho no Material e cria a versão. Não mexe no status do
// empreendimento: "Concluir planejamento" (/publicacao) é outro marco.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body: unknown = await req.json();
  if (!isPublishBody(body)) return fail("Payload de publicação inválido.", 400);
  return withOrg((org) => publishBudget(org, toInt(params.id), body));
}
