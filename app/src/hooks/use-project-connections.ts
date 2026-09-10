"use client";

import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { projectConnectionsRepository, type SaveProjectConnection } from "@/lib/repositories/project-connections";
import { ProjectConnectionError, type ProjectConnection } from "@/lib/projects/connections";

export function useProjectConnections() {
  const { user, isLoading: authLoading } = useAuth();
  const userId = user?.id ?? "";
  const qc = useQueryClient();
  const key = useMemo(() => ["project-connections", userId] as const, [userId]);
  const query = useQuery({
    queryKey: key, queryFn: () => projectConnectionsRepository.list(userId), enabled: !!userId,
    staleTime: 15000, retry: 1, throwOnError: false,
  });
  const scope = { id: `project-connections:${userId}` };
  const onSuccess = (row: ProjectConnection) => {
    qc.setQueryData<ProjectConnection[]>(key, (old = []) => {
      const others = old.filter((item) => item.id !== row.id);
      return row.deleted_at ? others : [...others, row];
    });
    return qc.invalidateQueries({ queryKey: key });
  };
  const onError = (error: Error) => {
    if (error instanceof ProjectConnectionError && error.problem === "conflict") void qc.invalidateQueries({ queryKey: key });
  };
  const save = useMutation({ scope, retry: false, mutationFn: (input: SaveProjectConnection) => projectConnectionsRepository.save(userId, input), onSuccess, onError });
  const remove = useMutation({ scope, retry: false, mutationFn: (row: ProjectConnection) => projectConnectionsRepository.remove(userId, row), onSuccess, onError });
  const restore = useMutation({ scope, retry: false, mutationFn: (row: ProjectConnection) => projectConnectionsRepository.restore(userId, row), onSuccess, onError });
  useEffect(() => {
    if (!userId) return;
    const client = createClient();
    const channel = client.channel(`project-connections:${userId}`).on("postgres_changes", {
      event: "*", schema: "public", table: "project_connections", filter: `user_id=eq.${userId}`,
    }, () => { void qc.invalidateQueries({ queryKey: key }); }).subscribe();
    return () => { void client.removeChannel(channel); };
  }, [userId, qc, key]);
  return { userId, query, save, remove, restore, loading: authLoading || (!!userId && query.isLoading), busy: save.isPending || remove.isPending || restore.isPending };
}
