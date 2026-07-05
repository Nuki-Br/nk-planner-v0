"use client";

import { useQuery } from "@tanstack/react-query";

import { listVersions } from "@/lib/data/store";

import { queryKeys } from "./queryKeys";

export function useVersions() {
  return useQuery({ queryKey: queryKeys.versions, queryFn: listVersions });
}
