"use client";

import { useQuery } from "@tanstack/react-query";

import { getTipologia, listTipologias } from "@/lib/data/store";

import { queryKeys } from "./queryKeys";

export function useTipologias(projectId: number | null) {
  return useQuery({
    queryKey: queryKeys.tipologias(projectId ?? 0),
    queryFn: () => listTipologias(projectId ?? 0),
    enabled: projectId !== null,
  });
}

export function useTipologia(id: number | null) {
  return useQuery({
    queryKey: queryKeys.tipologia(id ?? 0),
    queryFn: () => getTipologia(id ?? 0),
    enabled: id !== null,
  });
}
