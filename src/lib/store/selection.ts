"use client";

import { create } from "zustand";

// Seleção ativa entre telas — substitui o onNavigate(dest, {objeto}) do
// protótipo (que passava objetos vivos). Guarda APENAS ids; os dados vêm dos
// hooks React Query a partir das rotas ([id], [cid]).
interface SelectionState {
  activeProjectId: number | null;
  selectedTipologiaId: number | null;
  selectedComponentId: number | null;
  setActiveProject: (id: number | null) => void;
  setSelectedTipologia: (id: number | null) => void;
  setSelectedComponent: (id: number | null) => void;
  clearSelection: () => void;
}

export const useSelection = create<SelectionState>()((set) => ({
  activeProjectId: null,
  selectedTipologiaId: null,
  selectedComponentId: null,
  setActiveProject: (id) => set({ activeProjectId: id }),
  setSelectedTipologia: (id) => set({ selectedTipologiaId: id }),
  setSelectedComponent: (id) => set({ selectedComponentId: id }),
  clearSelection: () =>
    set({ activeProjectId: null, selectedTipologiaId: null, selectedComponentId: null }),
}));
