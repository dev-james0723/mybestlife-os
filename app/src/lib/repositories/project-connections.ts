import { createClient } from "@/lib/supabase/client";
import { ProjectConnectionError, type ConnectionProblem, type ConnectionDraft, type ProjectConnection } from "@/lib/projects/connections";

export type SaveProjectConnection = { id: string; draft: ConnectionDraft; previous?: ProjectConnection };
function fail(error: unknown): never {
  const e = error as { code?: string; message?: string };
  const problem = e?.message?.match(/project_connection:(invalid|duplicate|cycle|conflict|forbidden)/)?.[1] as ConnectionProblem | undefined;
  if (problem) throw new ProjectConnectionError(problem);
  if (["42P01", "PGRST205", "PGRST202", "42883"].includes(e?.code ?? "")) throw new ProjectConnectionError("unavailable");
  if (["42501", "PGRST301", "PGRST302"].includes(e?.code ?? "")) throw new ProjectConnectionError("forbidden");
  if (e?.code === "23505") throw new ProjectConnectionError("duplicate");
  throw new ProjectConnectionError("failed");
}
async function clientFor(userId: string) {
  const client = createClient();
  const { data, error } = await client.auth.getUser();
  if (error || !userId || data.user?.id !== userId) throw new ProjectConnectionError("forbidden");
  return client;
}
async function mutate(userId: string, action: "save" | "remove" | "restore", id: string, draft?: ConnectionDraft, version?: number): Promise<ProjectConnection> {
  const client = await clientFor(userId);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const { data, error } = await client.rpc("mutate_project_connection", {
      p_action: action, p_id: id, p_source: draft?.source_id ?? null,
      p_target: draft?.target_id ?? null, p_kind: draft?.kind ?? null, p_version: version ?? null,
    }).abortSignal(controller.signal).single();
    if (error) fail(error);
    const row = data as ProjectConnection | null;
    if (!row || row.id !== id || row.user_id !== userId) throw new ProjectConnectionError("failed");
    return row;
  } catch (error) { if (error instanceof ProjectConnectionError) throw error; return fail(error); }
  finally { clearTimeout(timer); }
}
export const projectConnectionsRepository = {
  async list(userId: string): Promise<ProjectConnection[]> {
    const client = await clientFor(userId);
    const result: ProjectConnection[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await client.from("project_connections").select("*")
        .eq("user_id", userId).is("deleted_at", null).order("id").range(offset, offset + 999);
      if (error) fail(error);
      const rows = (data ?? []) as ProjectConnection[];
      result.push(...rows);
      if (rows.length < 1000) return result;
    }
  },
  save(userId: string, input: SaveProjectConnection) { return mutate(userId, "save", input.id, input.draft, input.previous?.version); },
  remove(userId: string, row: ProjectConnection) { return mutate(userId, "remove", row.id, undefined, row.version); },
  restore(userId: string, row: ProjectConnection) { return mutate(userId, "restore", row.id, undefined, row.version); },
};
