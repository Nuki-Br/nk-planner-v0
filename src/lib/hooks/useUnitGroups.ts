"use client";

import { useQuery } from "@tanstack/react-query";

import { listTorres, listUnitGroups } from "@/lib/data/store";

import { queryKeys } from "./queryKeys";

export function useUnitGroups() {
  return useQuery({ queryKey: queryKeys.unitGroups, queryFn: listUnitGroups });
}

export function useTorres() {
  return useQuery({ queryKey: queryKeys.torres, queryFn: listTorres });
}
