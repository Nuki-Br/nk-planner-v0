"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getBudgetColumns, updateBudgetColumns } from "@/lib/data/store";
import type { BudgetColumn } from "@/shared/types/domain";

import { queryKeys } from "./queryKeys";

export function useBudgetColumns(projectId: number | null) {
  return useQuery({
    queryKey: queryKeys.budgetColumns(projectId ?? 0),
    queryFn: () => getBudgetColumns(projectId ?? 0),
    enabled: projectId !== null,
  });
}

export function useUpdateBudgetColumns() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, cols }: { projectId: number; cols: BudgetColumn[] }) =>
      updateBudgetColumns(projectId, cols),
    onSuccess: (_cols, { projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.budgetColumns(projectId) });
    },
  });
}
