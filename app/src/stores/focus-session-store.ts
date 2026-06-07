import { create } from "zustand";
import type { PlannerFocusSession } from "@/types/database";

type FocusSessionStore = {
  activeSession: PlannerFocusSession | null;
  setActiveSession: (session: PlannerFocusSession | null) => void;
  clearActiveSession: () => void;
};

export const useFocusSessionStore = create<FocusSessionStore>((set) => ({
  activeSession: null,
  setActiveSession: (session) => set({ activeSession: session }),
  clearActiveSession: () => set({ activeSession: null }),
}));
