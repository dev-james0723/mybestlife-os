"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SoftwareVaultEntry } from "@/types/database";

export type VaultViewMode = "grid" | "list";
export type VaultSortKey = "recent" | "alpha" | "most-used" | "cost-desc";

/** Top-level Software Vault experience (personal library + library modes). */
export type VaultSoftwareMode =
  | "my-vault"
  | "usage"
  | "recommended-stacks"
  | "compare"
  | "build-stack";

export const VAULT_SOFTWARE_MODES: VaultSoftwareMode[] = [
  "my-vault",
  "usage",
  "recommended-stacks",
  "compare",
  "build-stack",
];

export function isVaultSoftwareMode(value: string): value is VaultSoftwareMode {
  return (VAULT_SOFTWARE_MODES as string[]).includes(value);
}

export type VaultFilters = {
  search: string;
  status: string;
  priority: string;
  costTier: string;
  category: string;
};

export const EMPTY_VAULT_FILTERS: VaultFilters = {
  search: "",
  status: "all",
  priority: "all",
  costTier: "all",
  category: "all",
};

/* ── Session slice: unlock memory per browser session ─────────────── */

type VaultSessionState = {
  isUnlocked: boolean;
  isUnlocking: boolean;
  skipAnimation: boolean;
  soundMuted: boolean;
  unlock: () => void;
  lock: () => void;
  setUnlocking: (v: boolean) => void;
  setSkipAnimation: (v: boolean) => void;
  setSoundMuted: (v: boolean) => void;
};

const sessionStorageAdapter =
  typeof window !== "undefined"
    ? createJSONStorage(() => window.sessionStorage)
    : undefined;

export const useVaultSession = create<VaultSessionState>()(
  persist(
    (set) => ({
      isUnlocked: false,
      isUnlocking: false,
      skipAnimation: false,
      soundMuted: true,
      unlock: () => set({ isUnlocked: true, isUnlocking: false }),
      lock: () => set({ isUnlocked: false, isUnlocking: false, skipAnimation: false }),
      setUnlocking: (v) => set({ isUnlocking: v }),
      setSkipAnimation: (v) => set({ skipAnimation: v }),
      setSoundMuted: (v) => set({ soundMuted: v }),
    }),
    {
      name: "mylifeos-vault-session",
      storage: sessionStorageAdapter,
      partialize: (state) => ({
        isUnlocked: state.isUnlocked,
        skipAnimation: state.skipAnimation,
        soundMuted: state.soundMuted,
      }),
    },
  ),
);

/* ── Data/UI slice: filters, sort, view mode, selected id ─────────── */

const MAX_COMPARE_VAULT_ENTRIES = 4;

type VaultDataState = {
  filters: VaultFilters;
  sortBy: VaultSortKey;
  viewMode: VaultViewMode;
  softwareMode: VaultSoftwareMode;
  /** Vault row ids selected in Compare mode (Phase 4 UI). */
  compareVaultEntryIds: string[];
  selectedEntryId: string | null;
  addDialogOpen: boolean;
  setFilters: (patch: Partial<VaultFilters>) => void;
  resetFilters: () => void;
  setSort: (key: VaultSortKey) => void;
  setViewMode: (mode: VaultViewMode) => void;
  setSoftwareMode: (mode: VaultSoftwareMode) => void;
  setCompareVaultEntryIds: (ids: string[]) => void;
  toggleCompareVaultEntryId: (id: string) => void;
  selectEntry: (id: string | null) => void;
  setAddDialogOpen: (open: boolean) => void;
};

export const useVaultData = create<VaultDataState>((set, get) => ({
  filters: { ...EMPTY_VAULT_FILTERS },
  sortBy: "alpha",
  viewMode: "grid",
  softwareMode: "my-vault",
  compareVaultEntryIds: [],
  selectedEntryId: null,
  addDialogOpen: false,
  setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
  resetFilters: () => set({ filters: { ...EMPTY_VAULT_FILTERS } }),
  setSort: (key) => set({ sortBy: key }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSoftwareMode: (mode) => set({ softwareMode: mode }),
  setCompareVaultEntryIds: (ids) =>
    set({
      compareVaultEntryIds: ids.filter(Boolean).slice(0, MAX_COMPARE_VAULT_ENTRIES),
    }),
  toggleCompareVaultEntryId: (id) => {
    const cur = get().compareVaultEntryIds;
    if (cur.includes(id)) {
      set({ compareVaultEntryIds: cur.filter((x) => x !== id) });
      return;
    }
    if (cur.length >= MAX_COMPARE_VAULT_ENTRIES) return;
    set({ compareVaultEntryIds: [...cur, id] });
  },
  selectEntry: (id) => set({ selectedEntryId: id }),
  setAddDialogOpen: (open) => set({ addDialogOpen: open }),
}));

/* ── Selectors / helpers ─────────────────────────────────────────── */

export function parseMonthlyCost(entry: SoftwareVaultEntry): number {
  if (entry.cost_amount == null) return 0;
  const amount = Number(entry.cost_amount);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const period = (entry.cost_period ?? "").toLowerCase();
  if (/(year|yr|annual)/.test(period)) return amount / 12;
  if (/(week|wk)/.test(period)) return amount * 52 / 12;
  if (/(day|daily)/.test(period)) return amount * 365 / 12;
  if (/(quarter)/.test(period)) return amount / 3;
  return amount;
}

/** Rows considered part of the recurring monthly spend: subscription + "Active" (legacy using). */
export function isRecurringActive(entry: SoftwareVaultEntry): boolean {
  if (entry.status !== "Active") return false;
  return entry.cost_type === "Subscription" || entry.cost_type === "Paid";
}
