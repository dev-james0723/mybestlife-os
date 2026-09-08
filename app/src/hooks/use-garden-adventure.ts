"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { gardenAdventureRepository } from "@/lib/repositories/garden-adventure";
import {
  addAdventurePending,
  adventureOutboxKey,
  mergeAdventurePending,
  readAdventureOutbox,
  type AdventureSave,
  type AdventureSettings,
  type PendingAdventureAction,
} from "@/lib/garden/persistence";
import type { AdventureAction } from "@/lib/garden/adventure";

/** Serial durable outbox. Authentication is checked again immediately before every write. */
export function useGardenAdventure(userId: string, day: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["garden", userId, "adventure", day],
    enabled: !!userId,
    queryFn: () => gardenAdventureRepository.read(userId, day),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
  const pending = useRef<PendingAdventureAction[]>([]),
    running = useRef(false),
    alive = useRef(true);
  const [pendingCount, setPendingCount] = useState(0),
    [saving, setSaving] = useState(false),
    [saveError, setSaveError] = useState(false),
    [storageUnavailable, setStorageUnavailable] = useState(false);
  const persist = useCallback(
    (acknowledged?: PendingAdventureAction) => {
      try {
        pending.current = mergeAdventurePending(
          pending.current,
          readAdventureOutbox(localStorage, userId),
          acknowledged,
        );
        localStorage.setItem(
          adventureOutboxKey(userId),
          JSON.stringify(pending.current),
        );
        setStorageUnavailable(false);
      } catch {
        setStorageUnavailable(true);
      }
      setPendingCount(pending.current.length);
    },
    [userId],
  );
  const storeSave = useCallback(
    (save: AdventureSave) => {
      queryClient.setQueryData(["garden", userId, "adventure", save.day], save);
    },
    [queryClient, userId],
  );
  const flush = useCallback(async () => {
    if (running.current || !alive.current || !userId) return;
    running.current = true;
    setSaving(true);
    try {
      while (pending.current.length && alive.current) {
        const next = pending.current[0];
        const result = await gardenAdventureRepository.action(
          userId,
          next.day,
          next.action,
        );
        if (!alive.current) break;
        pending.current = pending.current.filter(
          (p) => p.day !== next.day || p.action !== next.action,
        );
        persist(next);
        storeSave(result);
      }
      if (alive.current) setSaveError(false);
    } catch {
      if (alive.current) setSaveError(true);
    } finally {
      running.current = false;
      if (alive.current) setSaving(false);
    }
  }, [persist, storeSave, userId]);
  useEffect(() => {
    alive.current = true;
    let unavailable = false;
    try {
      pending.current = readAdventureOutbox(localStorage, userId);
    } catch {
      unavailable = true;
    }
    // Outbox is restored only inside the keyed, authenticated account component.
    queueMicrotask(() => {
      if (alive.current) {
        setPendingCount(pending.current.length);
        setStorageUnavailable(unavailable);
      }
    });
    if (pending.current.length) void flush();
    const online = () => {
      void flush();
    };
    const changed = (event: StorageEvent) => {
      if (event.key !== adventureOutboxKey(userId)) return;
      // Another tab can add work while this tab is waiting on its network response.
      persist();
      if (pending.current.length) void flush();
    };
    window.addEventListener("online", online);
    window.addEventListener("storage", changed);
    return () => {
      alive.current = false;
      window.removeEventListener("online", online);
      window.removeEventListener("storage", changed);
    };
  }, [userId, flush, persist]);
  const enqueue = useCallback(
    (action: AdventureAction, actionDay: string) => {
      pending.current = addAdventurePending(pending.current, {
        day: actionDay,
        action,
      });
      persist();
      void flush();
    },
    [persist, flush],
  );
  const updateSettings = useCallback(
    async (value: Partial<AdventureSettings>) => {
      const save = await gardenAdventureRepository.action(
        userId,
        day,
        "settings",
        value,
      );
      if (alive.current) storeSave(save);
    },
    [day, storeSave, userId],
  );
  return {
    ...query,
    enqueue,
    flush,
    pendingCount,
    saving,
    saveError,
    storageUnavailable,
    updateSettings,
    pending,
  };
}
