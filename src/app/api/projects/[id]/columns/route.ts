import type { NextRequest } from "next/server";

import { toInt, withOrg } from "@/lib/api/handler";
import { getBudgetColumns, updateBudgetColumns } from "@/lib/server/store";
import type { BudgetColumn } from "@/shared/types/domain";

interface Params {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: Params) {
  return withOrg((org) => getBudgetColumns(org, toInt(params.id)));
}

export async function PUT(req: NextRequest, { params }: Params) {
  const cols = (await req.json()) as BudgetColumn[];
  return withOrg((org) => updateBudgetColumns(org, toInt(params.id), cols));
}
