"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  travelDestinationsRepository,
  travelSavedPlacesRepository,
} from "@/lib/travel-explorer/repository";
import { fetchNearby, fetchPlaceDetails } from "@/lib/travel-explorer/places/client";
import type {
  TravelDestinationInsert,
  TravelSavedPlaceInsert,
} from "@/types/travel-explorer";

export const travelKeys = {
  destinations: ["travel", "destinations"] as const,
  savedPlaces: (d: string) => ["travel", "saved", d] as const,
  nearby: (lat?: number, lng?: number) => ["travel", "nearby", lat, lng] as const,
  details: (id: string) => ["travel", "details", id] as const,
};

export function useTravelDestinations() {
  return useQuery({
    queryKey: travelKeys.destinations,
    queryFn: travelDestinationsRepository.list,
  });
}

export function useUpsertDestination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TravelDestinationInsert) =>
      travelDestinationsRepository.upsertBySlug(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: travelKeys.destinations });
    },
    onError: () => toast.error("Could not set that destination"),
  });
}

export function useSavedPlaces(destinationId?: string | null) {
  return useQuery({
    queryKey: travelKeys.savedPlaces(destinationId ?? "__none"),
    queryFn: () => travelSavedPlacesRepository.listByDestination(destinationId as string),
    enabled: Boolean(destinationId),
  });
}

export function useSavePlace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TravelSavedPlaceInsert) =>
      travelSavedPlacesRepository.save(input),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: travelKeys.savedPlaces(row.destination_id) });
      toast.success("Added to your trip");
    },
    onError: () => toast.error("Could not save that place"),
  });
}

export function useRemoveSavedPlace(destinationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => travelSavedPlacesRepository.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: travelKeys.savedPlaces(destinationId) });
    },
  });
}

export function usePlacesNearby(lat?: number, lng?: number) {
  return useQuery({
    queryKey: travelKeys.nearby(lat, lng),
    queryFn: () => fetchNearby(lat as number, lng as number),
    enabled: lat != null && lng != null,
    staleTime: 5 * 60_000,
  });
}

export function usePlaceDetails(placeId?: string | null) {
  return useQuery({
    queryKey: travelKeys.details(placeId ?? "__none"),
    queryFn: () => fetchPlaceDetails(placeId as string),
    enabled: Boolean(placeId),
    staleTime: 5 * 60_000,
  });
}
