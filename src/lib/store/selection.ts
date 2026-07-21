"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// Seleção ativa entre telas — substitui o onNavigate(dest, {objeto}) do
// protótipo (que passava objetos vivos). Guarda APENAS ids; os dados vêm dos
// hooks React Query a partir das rotas ([id], [cid]).
//
// O empreendimento ativo é PERSISTIDO (localStorage): ele escopa quase todas as
// queries do app, então perdê-lo num F5 deixaria as telas sem dados. As
// sub-seleções ficam de fora do persist de propósito — são efêmeras, e
// ressuscitar a tipologia de uma sessão antiga confundiria telas que assumem
// estado novo.
interface SelectionState {
  activeProjectId: number | null;
  selectedTipologiaId: number | null;
  selectedComponentId: number | null;
  /** false até o localStorage rehidratar — ver useActiveProjectId. */
  hasHydrated: boolean;
  setActiveProject: (id: number | null) => void;
  setSelectedTipologia: (id: number | null) => void;
  setSelectedComponent: (id: number | null) => void;
  setHydrated: () => void;
  /** Limpa tipologia/componente; o empreendimento ativo permanece. */
  clearSubSelection: () => void;
  clearSelection: () => void;
}

export const useSelection = create<SelectionState>()(
  persist(
    (set) => ({
      activeProjectId: null,
      selectedTipologiaId: null,
      selectedComponentId: null,
      hasHydrated: false,
      // Trocar de empreendimento limpa as sub-seleções AQUI, no setter, e não
      // num useEffect distante: getTipologia valida só a org, não o
      // empreendimento — um selectedTipologiaId vazado do projeto A resolveria
      // silenciosamente com dados de A enquanto o header mostra B.
      setActiveProject: (id) =>
        set((s) =>
          s.activeProjectId === id
            ? { activeProjectId: id }
            : { activeProjectId: id, selectedTipologiaId: null, selectedComponentId: null }
        ),
      setSelectedTipologia: (id) => set({ selectedTipologiaId: id }),
      setSelectedComponent: (id) => set({ selectedComponentId: id }),
      setHydrated: () => set({ hasHydrated: true }),
      clearSubSelection: () => set({ selectedTipologiaId: null, selectedComponentId: null }),
      clearSelection: () =>
        set({ activeProjectId: null, selectedTipologiaId: null, selectedComponentId: null }),
    }),
    {
      name: "nk-planner-selection",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ activeProjectId: s.activeProjectId }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    }
  )
);
