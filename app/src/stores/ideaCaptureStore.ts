"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_DRAFT,
  hasDraft,
  type DraftIdea,
  type PersistedDraft,
} from "@/types/idea";

export type SaveState = "idle" | "saving" | "saved" | "error";

interface IdeaCaptureState {
  open: boolean;
  draft: DraftIdea;
  saveState: SaveState;
  errorMessage: string | null;

  openSheet: () => void;
  closeSheet: () => void;
  toggle: () => void;
  setDraft: (patch: Partial<DraftIdea>) => void;
  resetDraft: () => void;
  setSaveState: (saveState: SaveState, errorMessage?: string | null) => void;
}

export const useIdeaCaptureStore = create<IdeaCaptureState>()(
  persist(
    (set) => ({
      open: false,
      draft: DEFAULT_DRAFT,
      saveState: "idle",
      errorMessage: null,

      openSheet: () => set({ open: true }),
      closeSheet: () => set({ open: false, saveState: "idle", errorMessage: null }),
      toggle: () =>
        set((s) => ({ open: !s.open, saveState: "idle", errorMessage: null })),
      setDraft: (patch) =>
        set((s) => ({ draft: { ...s.draft, ...patch } })),
      resetDraft: () => set({ draft: DEFAULT_DRAFT }),
      setSaveState: (saveState, errorMessage = null) =>
        set({ saveState, errorMessage }),
    }),
    {
      name: "mylifeos-idea-draft",
      // Only persist the draft — open/saveState/errorMessage are session-only.
      partialize: (state): { draft: PersistedDraft } => ({
        draft: {
          content: state.draft.content,
          title: state.draft.title,
          captureKind: state.draft.captureKind,
          destinations: state.draft.destinations,
          manualTags: state.draft.manualTags,
          voiceTranscript: state.draft.voiceTranscript,
          sourceType: state.draft.sourceType,
          // Strip File objects and object URLs — not serialisable.
          attachments: state.draft.attachments.map(
            ({ file: _f, preview_url: _u, ...rest }) => rest
          ),
        },
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<{ draft: PersistedDraft }>;
        if (!p.draft) return current;
        return {
          ...current,
          draft: {
            ...DEFAULT_DRAFT,
            ...p.draft,
            // Restore persisted attachments without File/preview_url.
            // They will need re-upload; upload_state stays 'pending'.
            attachments: (p.draft.attachments ?? []).map((a) => ({
              ...a,
              preview_url: "",
              upload_state: "pending" as const,
            })),
          },
        };
      },
    }
  )
);

// Selector helpers — imported by components for ergonomic access.
export const selectHasDraft = (s: IdeaCaptureState) => hasDraft(s.draft);
export const selectDraftContent = (s: IdeaCaptureState) => s.draft.content;
