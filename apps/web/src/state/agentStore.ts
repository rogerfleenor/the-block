import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { AgentFact, AgentSuggestion } from '@block/shared';

interface ActiveSuggestion {
  suggestion: AgentSuggestion;
  /** Wall-clock deadline ms; UI ticks against this. */
  deadlineMs: number;
}

interface AgentState {
  /** Facts cached by vehicleId. */
  factsByVehicle: Record<string, AgentFact[] | undefined>;
  /** Global, unattached facts (e.g. inventory-level). */
  globalFacts: AgentFact[];
  dismissedFacts: Record<string, boolean>;
  /** At most one suggestion in flight at a time. */
  active: ActiveSuggestion | null;
  open: boolean;
}

interface AgentActions {
  setFacts(vehicleId: string | undefined, facts: AgentFact[]): void;
  appendFact(fact: AgentFact): void;
  dismissFact(id: string): void;
  pushSuggestion(s: AgentSuggestion): void;
  clearSuggestion(): void;
  openCommandBar(): void;
  closeCommandBar(): void;
  toggleCommandBar(): void;
}

export const useAgentStore = create<AgentState & AgentActions>()(
  persist(
    (set, get) => ({
      factsByVehicle: {},
      globalFacts: [],
      dismissedFacts: {},
      active: null,
      open: false,
      setFacts(vehicleId, facts) {
        if (!vehicleId) {
          set({ globalFacts: facts });
          return;
        }
        set((state) => ({
          factsByVehicle: { ...state.factsByVehicle, [vehicleId]: facts },
        }));
      },
      appendFact(fact) {
        if (fact.vehicleId) {
          set((state) => {
            const existing = state.factsByVehicle[fact.vehicleId!] ?? [];
            const merged = existing.some((f) => f.id === fact.id)
              ? existing
              : [fact, ...existing].slice(0, 32);
            return { factsByVehicle: { ...state.factsByVehicle, [fact.vehicleId!]: merged } };
          });
          return;
        }
        set((state) => ({
          globalFacts: state.globalFacts.some((f) => f.id === fact.id)
            ? state.globalFacts
            : [fact, ...state.globalFacts].slice(0, 32),
        }));
      },
      dismissFact(id) {
        set((state) => ({ dismissedFacts: { ...state.dismissedFacts, [id]: true } }));
      },
      pushSuggestion(suggestion) {
        const deadlineMs = Date.now() + suggestion.confirmWindowMs;
        // Replace any previous suggestion — only one slot.
        set({ active: { suggestion, deadlineMs } });
      },
      clearSuggestion() {
        const current = get().active;
        if (!current) return;
        set({ active: null });
      },
      openCommandBar() {
        set({ open: true });
      },
      closeCommandBar() {
        set({ open: false });
      },
      toggleCommandBar() {
        set((state) => ({ open: !state.open }));
      },
    }),
    {
      name: 'block.agent',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ dismissedFacts: state.dismissedFacts }),
      version: 1,
    },
  ),
);
