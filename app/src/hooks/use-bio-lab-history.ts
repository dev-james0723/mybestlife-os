"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  bioLabRepository,
  type BioLabFocusSprintRow,
  type BioLabMindSweepRow,
  type BioLabStateScanRow,
  type BioLabSystemResetRow,
  type CreateFocusSprintInput,
  type CreateMindSweepInput,
  type CreateStateScanInput,
  type CreateSystemResetInput,
} from "@/lib/repositories/bio-lab";

/**
 * React Query hooks for the four Bio Lab tables.
 *
 * Query keys are namespaced under `bio-lab/<entity>` so the four lists can
 * be invalidated independently. The Phase 2 panels will call the create
 * mutations on completion; the Phase 1 panels still use the local zustand
 * store, so these hooks are stand-by infrastructure.
 *
 * Toasts are intentionally NOT raised here — the panels own their own UX
 * (e.g. State Scan flashes a "Saved" pill instead of a toast).
 */

// ============================================================
// Query keys
// ============================================================

export const bioLabKeys = {
  stateScans: () => ["bio-lab", "state-scans"] as const,
  mindSweeps: () => ["bio-lab", "mind-sweeps"] as const,
  focusSprints: () => ["bio-lab", "focus-sprints"] as const,
  systemResets: () => ["bio-lab", "system-resets"] as const,
};

// ============================================================
// State Scan
// ============================================================

export function useBioLabStateScans(limit = 30) {
  return useQuery<BioLabStateScanRow[]>({
    queryKey: [...bioLabKeys.stateScans(), limit],
    queryFn: () => bioLabRepository.getRecentStateScans(limit),
    staleTime: 60 * 1000,
  });
}

export function useCreateBioLabStateScan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStateScanInput) =>
      bioLabRepository.createStateScan(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bioLabKeys.stateScans() });
    },
  });
}

// ============================================================
// Mind Sweep
// ============================================================

export function useBioLabMindSweeps(limit = 30) {
  return useQuery<BioLabMindSweepRow[]>({
    queryKey: [...bioLabKeys.mindSweeps(), limit],
    queryFn: () => bioLabRepository.getRecentMindSweeps(limit),
    staleTime: 60 * 1000,
  });
}

export function useCreateBioLabMindSweep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMindSweepInput) =>
      bioLabRepository.createMindSweep(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bioLabKeys.mindSweeps() });
    },
  });
}

// ============================================================
// Focus Sprint
// ============================================================

export function useBioLabFocusSprints(limit = 30) {
  return useQuery<BioLabFocusSprintRow[]>({
    queryKey: [...bioLabKeys.focusSprints(), limit],
    queryFn: () => bioLabRepository.getRecentFocusSprints(limit),
    staleTime: 60 * 1000,
  });
}

export function useCreateBioLabFocusSprint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFocusSprintInput) =>
      bioLabRepository.createFocusSprint(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bioLabKeys.focusSprints() });
    },
  });
}

// ============================================================
// System Reset
// ============================================================

export function useBioLabSystemResets(limit = 30) {
  return useQuery<BioLabSystemResetRow[]>({
    queryKey: [...bioLabKeys.systemResets(), limit],
    queryFn: () => bioLabRepository.getRecentSystemResets(limit),
    staleTime: 60 * 1000,
  });
}

export function useCreateBioLabSystemReset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSystemResetInput) =>
      bioLabRepository.createSystemReset(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bioLabKeys.systemResets() });
    },
  });
}
