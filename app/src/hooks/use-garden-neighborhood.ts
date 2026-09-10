"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { gardenNeighborhoodRepository as repository } from "@/lib/repositories/garden-neighborhood";
import { GARDEN_NEIGHBORHOOD_EVENT, type GardenNeighborhood } from "@/lib/garden/neighborhood";

type Pending = { id: string; action: string; value: Record<string, unknown> };
export function useGardenNeighborhood(userId: string) {
  const [data, setData] = useState<GardenNeighborhood | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const owner = useRef(userId), mounted = useRef(true), request = useRef(0), locked = useRef(false);
  useEffect(() => {
    owner.current = userId;
  }, [userId]);
  const refresh = useCallback(async () => {
    const sequence = ++request.current;
    try {
      const next = await repository.read(userId);
      if (mounted.current && owner.current === userId && sequence === request.current && !locked.current) { setData(next); setError(null); }
    } catch (e) {
      if (mounted.current && owner.current === userId && sequence === request.current) setError(e instanceof Error ? e.message : "Unable to open your Garden neighbourhood.");
    } finally { if (mounted.current && owner.current === userId) setLoading(false); }
  }, [userId]);
  useEffect(() => {
    mounted.current = true;
    setData(null); setLoading(true); setPending(null); locked.current = false;
    void refresh();
    const update = () => { if (!document.hidden && !locked.current) void refresh(); };
    const timer = setInterval(update, 15_000);
    window.addEventListener(GARDEN_NEIGHBORHOOD_EVENT, update);
    document.addEventListener("visibilitychange", update);
    return () => { mounted.current = false; request.current++; clearInterval(timer); window.removeEventListener(GARDEN_NEIGHBORHOOD_EVENT, update); document.removeEventListener("visibilitychange", update); };
  }, [userId, refresh]);
  const execute = useCallback(async (job: Pending) => {
    if (locked.current) return null;
    locked.current = true; request.current++; setBusy(true); setError(null); setPending(job);
    try {
      const result = await repository.command(userId, job.action, job.id, job.value);
      if (!mounted.current || owner.current !== userId) return null;
      setData(result.save); setPending(null);
      return result;
    } catch (e) {
      if (mounted.current && owner.current === userId) setError(e instanceof Error ? e.message : "Unable to save. Retry the same request.");
      return null;
    } finally { locked.current = false; if (mounted.current && owner.current === userId) setBusy(false); }
  }, [userId]);
  const command = useCallback((action: string, value: Record<string, unknown>) => execute({ id: crypto.randomUUID(), action, value: { ...value, revision: data?.estate.revision } }), [data?.estate.revision, execute]);
  return { data, loading, error, busy, pending, refresh, command, retry: () => pending ? execute(pending) : Promise.resolve(null), dismissError: () => { setPending(null); setError(null); void refresh(); } };
}
