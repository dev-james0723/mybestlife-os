"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  focusPreferencesRepository,
  type UpdateFocusPreferenceInput,
} from "@/lib/repositories/focus-preferences";

export const FOCUS_PREFERENCES_QUERY_KEY = ["focus-preferences"] as const;

export function useFocusPreferences() {
  return useQuery({
    queryKey: FOCUS_PREFERENCES_QUERY_KEY,
    queryFn: () => focusPreferencesRepository.getOrCreate(),
  });
}

export function useUpdateFocusPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateFocusPreferenceInput) =>
      focusPreferencesRepository.update(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FOCUS_PREFERENCES_QUERY_KEY });
    },
  });
}
