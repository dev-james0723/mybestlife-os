"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gardenRepository } from "@/lib/repositories/garden";
import type { PlantType } from "@/types/database";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app-store";
import { getMiscUiCopy } from "@/lib/i18n/misc-ui";

export function useActiveGarden() {
  return useQuery({
    queryKey: ["garden", "active"],
    queryFn: gardenRepository.getActiveGarden,
  });
}

export function useGardenCollection() {
  return useQuery({
    queryKey: ["garden", "collection"],
    queryFn: gardenRepository.getCollection,
  });
}

export function useGardenInventory() {
  return useQuery({
    queryKey: ["garden", "inventory"],
    queryFn: gardenRepository.getInventory,
  });
}

export function useGardenTodayLog() {
  return useQuery({
    queryKey: ["garden", "today-log"],
    queryFn: gardenRepository.getTodayLog,
  });
}

export function usePlantSeed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (plantType: PlantType) => gardenRepository.plantSeed(plantType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["garden"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.garden;
      toast.success(ui.seedPlanted);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.garden;
      toast.error(ui.seedPlantFailed);
    },
  });
}

export function useWaterPlant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => gardenRepository.waterPlant(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["garden"] });
      if (data.is_wilted === false) {
        const ui = getMiscUiCopy(useAppStore.getState().language).toasts.garden;
        toast.success(ui.plantWatered);
      }
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.garden;
      toast.error(ui.plantWaterFailed);
    },
  });
}

export function useUseFertilizer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => gardenRepository.useFertilizer(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["garden"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.garden;
      if (data) {
        toast.success(ui.fertilizerApplied);
      } else {
        toast.error(ui.noFertilizer);
      }
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.garden;
      toast.error(ui.fertilizerUseFailed);
    },
  });
}

export function useHarvestPlant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => gardenRepository.harvestPlant(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["garden"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.garden;
      toast.success(ui.plantHarvested);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.garden;
      toast.error(ui.plantHarvestFailed);
    },
  });
}

export function useClaimDailyChest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => gardenRepository.claimDailyChest(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["garden"] });
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.garden;
      toast.error(ui.chestClaimFailed);
    },
  });
}

export function useCheckWilt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => gardenRepository.checkAndApplyWilt(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["garden", "active"] });
    },
  });
}
