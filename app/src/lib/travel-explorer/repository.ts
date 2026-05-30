/**
 * Supabase CRUD for the Explorer Console's own (user-owned) data:
 * destinations + saved places. RLS scopes every row to auth.uid(); inserts
 * omit user_id so the column DEFAULT auth.uid() fills it. Places CONTENT is
 * never written here — only place_id + user metadata (see migration notes).
 */

import { createClient } from "@/lib/supabase/client";
import type {
  TravelDestination,
  TravelDestinationInsert,
  TravelSavedPlace,
  TravelSavedPlaceInsert,
} from "@/types/travel-explorer";

export const travelDestinationsRepository = {
  async list(): Promise<TravelDestination[]> {
    const { data, error } = await createClient()
      .from("travel_destinations")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as TravelDestination[];
  },

  async getBySlug(slug: string): Promise<TravelDestination | null> {
    const { data, error } = await createClient()
      .from("travel_destinations")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return (data as TravelDestination | null) ?? null;
  },

  /** Find-or-create by (user, slug); refreshes core fields when it exists. */
  async upsertBySlug(input: TravelDestinationInsert): Promise<TravelDestination> {
    const existing = await travelDestinationsRepository.getBySlug(input.slug);
    if (existing) {
      const { data, error } = await createClient()
        .from("travel_destinations")
        .update(input)
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) throw error;
      return data as TravelDestination;
    }
    const { data, error } = await createClient()
      .from("travel_destinations")
      .insert(input)
      .select("*")
      .single();
    if (error) throw error;
    return data as TravelDestination;
  },
};

export const travelSavedPlacesRepository = {
  async listByDestination(destinationId: string): Promise<TravelSavedPlace[]> {
    const { data, error } = await createClient()
      .from("travel_saved_places")
      .select("*")
      .eq("destination_id", destinationId)
      .order("position", { ascending: true });
    if (error) throw error;
    return (data ?? []) as TravelSavedPlace[];
  },

  /** Idempotent save — a duplicate (same place in the same destination)
      returns the existing row instead of erroring. */
  async save(input: TravelSavedPlaceInsert): Promise<TravelSavedPlace> {
    const { data, error } = await createClient()
      .from("travel_saved_places")
      .insert(input)
      .select("*")
      .single();
    if (error) {
      const code = (error as { code?: string }).code;
      if (code === "23505") {
        const { data: existing } = await createClient()
          .from("travel_saved_places")
          .select("*")
          .eq("destination_id", input.destination_id)
          .eq("provider", input.provider)
          .eq("place_id", input.place_id)
          .maybeSingle();
        if (existing) return existing as TravelSavedPlace;
      }
      throw error;
    }
    return data as TravelSavedPlace;
  },

  async remove(id: string): Promise<void> {
    const { error } = await createClient()
      .from("travel_saved_places")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};
