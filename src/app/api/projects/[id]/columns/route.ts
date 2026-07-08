import type { NextRequest } from "next/server";

import { withOrg } from "@/lib/api/handler";
import { getBudgetColumns, updateBudgetColumns } from "@/lib/server/store";
import type { BudgetColumn } from "@/shared/types/domain";

interface Params {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: Params) {
  return withOrg((org) => getBudgetColumns(org, params.id));
}

export async function PUT(req: NextRequest, { params }: Params) {
  const cols = (await req.json()) as BudgetColumn[];
  return withOrg((org) => updateBudgetColumns(org, params.id, cols));
}
