import { create } from "zustand";

/**
 * Client-only UI state for the Habits page.
 *
 * Server data (habits, completions, routines, streaks, insights) stays in
 * TanStack Query caches so it invalidates cleanly and survives navigation.
 * This store holds *only* transient UI state that several components need to
 * share without prop-drilling: drawer openness, selection, focused day,
 * in-flight AI operation flags.
 */

type DetailTarget =
  | { kind: "habit"; id: string }
  | { kind: "routine"; id: string }
  | null;

interface HabitsUiState {
  /** ISO `YYYY-MM-DD` currently focused in the Today view (defaults to today). */
  focusedDate: string | null;
  setFocusedDate: (date: string | null) => void;

  detailTarget: DetailTarget;
  openHabitDetail: (id: string) => void;
  openRoutineDetail: (id: string) => void;
  closeDetail: () => void;

  /** Creation dialog mode. */
  createMode: "none" | "habit" | "routine" | "ai-habit" | "ai-routine";
  setCreateMode: (mode: HabitsUiState["createMode"]) => void;

  /** Which per-completion note popover is open (habit id), for single-at-a-time UX. */
  openNotePopoverHabitId: string | null;
  setNotePopoverHabitId: (id: string | null) => void;
}

export const useHabitsStore = create<HabitsUiState>((set) => ({
  focusedDate: null,
  setFocusedDate: (date) => set({ focusedDate: date }),

  detailTarget: null,
  openHabitDetail: (id) => set({ detailTarget: { kind: "habit", id } }),
  openRoutineDetail: (id) => set({ detailTarget: { kind: "routine", id } }),
  closeDetail: () => set({ detailTarget: null }),

  createMode: "none",
  setCreateMode: (mode) => set({ createMode: mode }),

  openNotePopoverHabitId: null,
  setNotePopoverHabitId: (id) => set({ openNotePopoverHabitId: id }),
}));
