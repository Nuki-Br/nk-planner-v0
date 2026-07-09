"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getBudgetColumns, updateBudgetColumns } from "@/lib/data/store";
import type { BudgetColumn } from "@/shared/types/domain";

import { queryKeys } from "./queryKeys";

export function useBudgetColumns(projectId: string | null) {
  return useQuery({
    queryKey: queryKeys.budgetColumns(projectId ?? ""),
    queryFn: () => getBudgetColumns(projectId ?? ""),
    enabled: projectId !== null,
  });
}

export function useUpdateBudgetColumns() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, cols }: { projectId: string; cols: BudgetColumn[] }) =>
      updateBudgetColumns(projectId, cols),
    onSuccess: (_cols, { projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.budgetColumns(projectId) });
    },
  });
}
