"use client";

import { useQuery } from "@tanstack/react-query";

import { listKits } from "@/lib/data/store";

import { queryKeys } from "./queryKeys";

export function useKits() {
  return useQuery({ queryKey: queryKeys.kits, queryFn: listKits });
}
