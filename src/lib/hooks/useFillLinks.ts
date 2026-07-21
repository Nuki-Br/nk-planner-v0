"use client";

import { useMutation } from "@tanstack/react-query";

import { createFillLink, type FillLinkInput } from "@/lib/data/store";

export function useCreateFillLink(projectId: number) {
  return useMutation({
    mutationFn: (input: FillLinkInput) => createFillLink(projectId, input),
  });
}
