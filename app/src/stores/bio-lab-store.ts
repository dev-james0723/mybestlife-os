"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BioLabToolId } from "@/lib/bio-lab/tool-types";
import {
  MAX_MIND_SWEEP_ENTRIES,
  MAX_STATE_SCAN_HISTORY,
  MIND_SWEEP_KINDS,
  newMindSweepId,
  newStateScanId,
  type MindSweepEntry,
  type MindSweepKind,
  type StateScanEntry,
} from "@/lib/bio-lab/flow-types";

type BioLabState = {
  activeTool: BioLabToolId | null;
  openTool: (id: BioLabToolId) => void;
  closeTool: () => void;

  mindSweepEntries: MindSweepEntry[];
  addMindSweepEntry: (text: string, kind: MindSweepKind) => void;
  updateMindSweepKind: (id: string, kind: MindSweepKind) => void;
  removeMindSweepEntry: (id: string) => void;
  clearMindSweepEntries: () => void;

  stateScanHistory: StateScanEntry[];
  addStateScanEntry: (payload: {
    mood: number;
    energy: number;
    focus: number;
    stress: number;
    note: string;
  }) => void;
};

export const useBioLabStore = create<BioLabState>()(
  persist(
    (set) => ({
      activeTool: null,

      openTool: (id) => set({ activeTool: id }),
      closeTool: () => set({ activeTool: null }),

      mindSweepEntries: [],

      addMindSweepEntry: (text, kind) => {
        if (!(MIND_SWEEP_KINDS as readonly string[]).includes(kind)) return;
        const trimmed = text.trim();
        if (!trimmed) return;
        const entry: MindSweepEntry = {
          id: newMindSweepId(),
          text: trimmed.slice(0, 4000),
          kind,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          mindSweepEntries: [entry, ...s.mindSweepEntries].slice(0, MAX_MIND_SWEEP_ENTRIES),
        }));
      },

      updateMindSweepKind: (id, kind) => {
        if (!(MIND_SWEEP_KINDS as readonly string[]).includes(kind)) return;
        set((s) => ({
          mindSweepEntries: s.mindSweepEntries.map((e) =>
            e.id === id ? { ...e, kind } : e,
          ),
        }));
      },

      removeMindSweepEntry: (id) =>
        set((s) => ({
          mindSweepEntries: s.mindSweepEntries.filter((e) => e.id !== id),
        })),

      clearMindSweepEntries: () => set({ mindSweepEntries: [] }),

      stateScanHistory: [],

      addStateScanEntry: (payload) => {
        const clamp = (n: number) => Math.min(5, Math.max(1, Math.round(Number(n))));
        const entry: StateScanEntry = {
          id: newStateScanId(),
          mood: clamp(payload.mood),
          energy: clamp(payload.energy),
          focus: clamp(payload.focus),
          stress: clamp(payload.stress),
          note: payload.note.trim().slice(0, 2000),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          stateScanHistory: [entry, ...s.stateScanHistory].slice(0, MAX_STATE_SCAN_HISTORY),
        }));
      },
    }),
    {
      name: "mylifeos-bio-lab",
      partialize: (state) => ({
        mindSweepEntries: state.mindSweepEntries,
        stateScanHistory: state.stateScanHistory,
      }),
    },
  ),
);
