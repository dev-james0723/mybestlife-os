"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { canonicalConnection, parseConnection, type ConnectionInput, type ProjectConnection } from "@/lib/projects/connections";

const key = (owner: string) => ["project-connections", owner] as const;

// Verify ownership again on every action. An old inspector/Undo must not write after an account switch.
async function clientFor(owner: string) {
  const client = createClient();
  const { data, error } = await client.auth.getUser();
  if (error || !owner || data.user?.id !== owner) throw new Error("PROJECT_CONNECTION_ACCESS");
  return client;
}

export function connectionFailure(error: unknown): "unavailable" | "access" | "conflict" | "cycle" | "duplicate" | "failed" {
  const e = error as { code?: string; message?: string } | undefined;
  if (["42P01", "PGRST205"].includes(e?.code ?? "")) return "unavailable";
  if (e?.code === "23505") return "duplicate";
  if (e?.code === "PGRST116" || e?.message?.includes("CONFLICT")) return "conflict";
  if (e?.message?.includes("CYCLE")) return "cycle";
  if (e?.code === "42501" || e?.message?.includes("ACCESS")) return "access";
  return "failed";
}

export function useProjectMapConnections(owner: string) {
  const cache = useQueryClient();
  const query = useQuery<ProjectConnection[]>({
    queryKey: key(owner),
    enabled: !!owner,
    queryFn: async ({ signal }) => {
      const client = await clientFor(owner);
      const rows: ProjectConnection[] = [];
      // PostgREST normally caps one response. Never silently validate only the first page.
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await client.from("project_connections")
          .select("*").eq("user_id", owner).order("id").range(offset, offset + 499).abortSignal(signal);
        if (error) throw error; // Missing migrations are errors, NOT an empty map.
        rows.push(...(data ?? []).map(parseConnection));
        if (!data || data.length < 500) return rows;
      }
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
    retry: 1,
  });
  const save = useMutation({
    mutationFn: async ({ input, existing }: { input: ConnectionInput; existing?: ProjectConnection }) => {
      const client = await clientFor(owner);
      const payload = canonicalConnection(input);
      const request = existing
        ? client.from("project_connections").update(payload).eq("id", existing.id).eq("user_id", owner).eq("updated_at", existing.updated_at)
        : client.from("project_connections").insert({ ...payload, user_id: owner });
      const { data, error } = await request.select("*").single();
      if (error) throw error;
      return parseConnection(data);
    },
    onMutate: () => cache.cancelQueries({ queryKey: key(owner) }),
    onSuccess: (row) => cache.setQueryData<ProjectConnection[]>(key(owner), (current = []) => [...current.filter((entry) => entry.id !== row.id), row]),
    onSettled: () => { void cache.invalidateQueries({ queryKey: key(owner) }); },
    retry: false,
  });
  const remove = useMutation({
    mutationFn: async (existing: ProjectConnection) => {
      const client = await clientFor(owner);
      const { data, error } = await client.from("project_connections").delete()
        .eq("id", existing.id).eq("user_id", owner).eq("updated_at", existing.updated_at).select("*").single();
      if (error) throw error;
      return parseConnection(data);
    },
    onMutate: () => cache.cancelQueries({ queryKey: key(owner) }),
    onSuccess: (row) => cache.setQueryData<ProjectConnection[]>(key(owner), (current = []) => current.filter((entry) => entry.id !== row.id)),
    onSettled: () => { void cache.invalidateQueries({ queryKey: key(owner) }); },
    retry: false,
  });
  return { ...query, save, remove };
}
