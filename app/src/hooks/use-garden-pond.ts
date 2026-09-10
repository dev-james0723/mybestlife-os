"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { gardenPondRepository, PondRuleRejection } from "@/lib/repositories/garden-pond";
import { clearPondOutbox, readPondOutbox, writePondOutbox, type PondOutbox, type PondRequest, type PondSave } from "@/lib/garden/pond-persistence";

export function useGardenPond(account: string, enabled: boolean) {
  const client = useQueryClient(), busy = useRef<number | null>(null), scope = useRef(0), alive = useRef(false);
  const pendingRef = useRef<PondOutbox | null>(null);
  const [pending, setPending] = useState<PondOutbox | null>(null), [error, setError] = useState("");
  const [sending, setSending] = useState(false), [conflict, setConflict] = useState(false), [storageReady, setStorageReady] = useState(false);
  const [rejected, setRejected] = useState(false);
  const query = useQuery({
    queryKey: ["garden", account, "pond-v3"], enabled: enabled && !!account,
    queryFn: () => gardenPondRepository.read(account), retry: 1, staleTime: 10_000,
    refetchInterval: enabled ? 30_000 : false,
  });
  const setSave = useCallback((save: PondSave) => {
    client.setQueryData<PondSave>(["garden", account, "pond-v3"], (old) => !old || old.world.revision <= save.world.revision ? save : old);
  }, [client, account]);
  const flush = useCallback(async () => {
    if (busy.current === scope.current || !alive.current) return false;
    const generation = scope.current;
    const current = () => alive.current && scope.current === generation;
    busy.current = generation; setSending(true);
    try {
      const next = await readPondOutbox(account);
      if (!next || !current()) return false;
      pendingRef.current = next; setPending(next); setRejected(false);
      const response = await gardenPondRepository.command(next);
      if (!current()) return false;
      setSave(response.save);
      if (response.status === "conflict") { setConflict(true); setError("Your pond changed on another device. Your proposed change is kept; choose its position again."); return false; }
      await clearPondOutbox(next);
      if (!current()) return false;
      pendingRef.current = null; setPending(null); setConflict(false); setError("");
      return response.save;
    } catch (failure) {
      if (current()) {
        setRejected(failure instanceof PondRuleRejection);
        setError(failure instanceof Error ? failure.message : String((failure as { message?: string })?.message ?? "Unable to confirm the pond change. Retry when connected."));
      }
      return false;
    } finally {
      if (busy.current === generation) {
        busy.current = null;
        if (current()) setSending(false);
      }
    }
  }, [account, setSave]);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const generation = ++scope.current;
    alive.current = true;
    void readPondOutbox(account).then((value) => {
      if (cancelled) return;
      pendingRef.current = value; setPending(value); setStorageReady(true);
      if (value) void flush();
    }).catch(() => { if (!cancelled) setError("Offline storage is unavailable. Your pond is safe; enable browser storage to save changes."); });
    const online = () => { void flush(); };
    window.addEventListener("online", online);
    return () => { cancelled = true; alive.current = false; scope.current = generation + 1; window.removeEventListener("online", online); };
  }, [account, enabled, flush]);
  const execute = useCallback(async (command: PondRequest) => {
    if (!alive.current || !query.data || !storageReady || pendingRef.current || busy.current === scope.current) return false;
    const generation = scope.current;
    const value: PondOutbox = { id: crypto.randomUUID(), version: 3, account, revision: query.data.world.revision, command };
    try {
      await writePondOutbox(value);
      if (!alive.current || scope.current !== generation) return false;
      pendingRef.current = value; setPending(value); setError("");
      return await flush();
    } catch (failure) { if (alive.current) setError(failure instanceof Error ? failure.message : "Unable to keep this pending change."); return false; }
  }, [account, query.data, storageReady, flush]);
  const discard = useCallback(async () => {
    // Only known rolled-back commands may be discarded. Unknown network outcomes must be retried.
    const value = pendingRef.current;
    if (!value || !(conflict || rejected) || busy.current === scope.current) return;
    const generation = scope.current;
    try {
      await clearPondOutbox(value);
      if (!alive.current || scope.current !== generation) return;
      pendingRef.current = null; setPending(null); setConflict(false); setRejected(false); setError("");
    } catch { if (alive.current && scope.current === generation) setError("Unable to clear this proposed change. Retry when browser storage is available."); }
  }, [conflict, rejected]);
  return { ...query, execute, flush, discard, pending, conflict, canDiscard: conflict || rejected, sending, syncError: error, storageReady };
}
