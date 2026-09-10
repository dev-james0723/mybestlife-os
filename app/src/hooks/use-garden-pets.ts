"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { GardenPetLibrary } from "@/lib/garden/pets";
const changing = (status: string) =>
  ["uploading", "submitting", "generating", "processing"].includes(status);
export function useGardenPets(userId: string) {
  const cache = useQueryClient(),
    key = ["garden", userId, "personal-pets"];
  const query = useQuery<GardenPetLibrary>({
    queryKey: key,
    enabled: !!userId,
    staleTime: 45_000,
    queryFn: async () => {
      const read = async () => {
        const response = await fetch("/api/garden/pets", {
          cache: "no-store",
          headers: { "x-garden-account": userId },
        });
        if (!response.ok) throw new Error("Your pets could not be loaded.");
        return response.json() as Promise<GardenPetLibrary>;
      };
      const library = await read();
      const active = library.pets.filter((p) =>
        ["generating", "processing"].includes(p.status),
      );
      if (active.length && !document.hidden) {
        await Promise.all(
          active.map((p) =>
            fetch("/api/garden/pets", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-garden-account": userId,
              },
              body: JSON.stringify({ id: p.id }),
            }).catch(() => null),
          ),
        );
        return read();
      }
      return library;
    },
    refetchInterval: (q) =>
      q.state.data?.pets.some((p) => changing(p.status)) ? 10_000 : 45 * 60_000,
  });
  const refresh = async () => {
    await cache.invalidateQueries({ queryKey: key });
  };
  return { ...query, refresh };
}
