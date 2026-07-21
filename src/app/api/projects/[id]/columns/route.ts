import type { NextRequest } from "next/server";

import { fail, toInt, withOrg } from "@/lib/api/handler";
import { getBudgetColumns, updateBudgetColumns } from "@/lib/server/store";
import type { BudgetColumn } from "@/shared/types/domain";

interface Params {
  params: { id: string };
}

// O payload é o array inteiro de colunas e vem direto do cliente — sem guard,
// um `expr` não-string chegaria ao Prisma como erro 500.
function isBudgetColumn(v: unknown): v is BudgetColumn {
  if (typeof v !== "object" || v === null) return false;
  const c = v as Record<string, unknown>;
  return (
    typeof c.id === "number" &&
    typeof c.nome === "string" &&
    typeof c.expr === "string" &&
    typeof c.visivel === "boolean"
  );
}

export async function GET(_req: NextRequest, { params }: Params) {
  return withOrg((org) => getBudgetColumns(org, toInt(params.id)));
}

export async function PUT(req: NextRequest, { params }: Params) {
  const body: unknown = await req.json();
  if (!Array.isArray(body) || !body.every(isBudgetColumn)) {
    return fail("Payload de colunas inválido.", 400);
  }
  const cols: BudgetColumn[] = body;
  return withOrg((org) => updateBudgetColumns(org, toInt(params.id), cols));
}
