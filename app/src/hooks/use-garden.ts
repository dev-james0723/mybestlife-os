"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gardenRepository } from "@/lib/repositories/garden";
import type { PlantType } from "@/types/database";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app-store";
import { getMiscUiCopy } from "@/lib/i18n/misc-ui";
import { useAuth } from "@/hooks/use-auth";
import { gardenDay } from "@/lib/garden/game";

export function useActiveGarden() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["garden", user?.id, "active"],
    enabled: !!user,
    queryFn: gardenRepository.getActiveGarden,
  });
}

export function useGardenCollection() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["garden", user?.id, "collection"],
    enabled: !!user,
    queryFn: gardenRepository.getCollection,
  });
}

export function useGardenInventory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["garden", user?.id, "inventory"],
    enabled: !!user,
    queryFn: gardenRepository.getInventory,
  });
}

export function useGardenTodayLog() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["garden", user?.id, "today-log", gardenDay()],
    enabled: !!user,
    queryFn: gardenRepository.getTodayLog,
  });
}

export function useGardenCareHistory(day: string) {
  const { user } = useAuth();
  return useQuery({ queryKey: ["garden", user?.id, "care-history", day], enabled: !!user, queryFn: () => gardenRepository.getCareHistory(day) });
}

export function useGardenLifeActivity(day: string) {
  const { user } = useAuth();
  return useQuery({ queryKey: ["garden", user?.id, "life-activity", day], enabled: !!user, queryFn: () => gardenRepository.getLifeActivity(day), staleTime: 30_000 });
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
      queryClient.invalidateQueries({ queryKey: ["garden"] });
    },
  });
}
