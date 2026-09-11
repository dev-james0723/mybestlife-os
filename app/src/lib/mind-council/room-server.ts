import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CouncilInputError, isRecord, requireUuid, type CouncilRoom, type CouncilMessage, type CouncilViewer } from "./room-contract";

export const SCENE_BUCKET = "mind-council-scenes";
export class CouncilHttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export type CouncilDb = Awaited<ReturnType<typeof createServerSupabaseClient>>;
export type RoomRow = CouncilRoom & {
  user_id: string; advisor_ids: string[]; scene_path: string | null;
  scene_token: string | null; scene_started_at: string | null; scene_attempts: number;
  chat_token: string | null; chat_started_at: string | null;
};
export const MESSAGE_COLUMNS = "id,turn_id,kind,advisor_id,display_name,content,step,created_at";
export function dbCheck(error: { code?: string } | null) {
  if (!error) return;
  if (error.code === "42P01" || error.code === "PGRST205" || error.code === "PGRST202")
    throw new CouncilHttpError(503, "Council storage is not installed yet. Apply the Council Rooms migration before using this feature.");
  throw new CouncilHttpError(503, "Council storage is temporarily unavailable. Please try again.");
}
export async function authenticateCouncil(req: Request) {
  if (req.method !== "GET") {
    const origin = req.headers.get("origin");
    if (req.headers.get("sec-fetch-site") === "cross-site" || (origin && origin !== new URL(req.url).origin))
      throw new CouncilHttpError(403, "Cross-site request rejected.");
  }
  const db = await createServerSupabaseClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) throw new CouncilHttpError(401, "Sign in to use your Council rooms.");
  return { db, user };
}
export async function readCouncilBody(req: Request) {
  const text = await req.text();
  if (new TextEncoder().encode(text).length > 32_768) throw new CouncilHttpError(413, "Request is too large.");
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new CouncilInputError("Invalid JSON request."); }
  if (!isRecord(value)) throw new CouncilInputError("Expected a JSON object.");
  return value;
}
export async function ownedRoom(db: CouncilDb, userId: string, id: string): Promise<RoomRow> {
  requireUuid(id);
  const { data, error } = await db.from("mind_council_rooms").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
  dbCheck(error);
  if (!data) throw new CouncilHttpError(404, "Council room not found.");
  return data as RoomRow;
}
export function publicRoom(r: RoomRow): CouncilRoom {
  return { id: r.id, name: r.name, advisors: r.advisors, initial_question: r.initial_question,
    scene_template: r.scene_template, scene_status: r.scene_status === "generating" && r.scene_started_at && Date.parse(r.scene_started_at) < Date.now() - 360000 ? "error" : r.scene_status, scene_version: r.scene_version,
    scene_error: r.scene_error, scene_model: r.scene_model, is_saved: r.is_saved,
    created_at: r.created_at, updated_at: r.updated_at };
}
export async function roomMessages(db: CouncilDb, userId: string, roomId: string): Promise<CouncilMessage[]> {
  const { data, error } = await db.from("mind_council_messages").select(MESSAGE_COLUMNS)
    .eq("user_id", userId).eq("room_id", roomId).order("created_at").order("step").limit(410);
  dbCheck(error);
  return (data ?? []) as CouncilMessage[];
}
export async function councilViewer(db: CouncilDb, userId: string): Promise<CouncilViewer> {
  const { data } = await db.from("profiles").select("full_name,avatar_url").eq("id", userId).maybeSingle();
  return { name: typeof data?.full_name === "string" ? data.full_name : "You",
    avatar: typeof data?.avatar_url === "string" ? data.avatar_url : null };
}
export async function claimCouncilOperation(db: CouncilDb, roomId: string, kind: "scene" | "turn", token: string) {
  const { data, error } = await db.rpc("claim_mind_council_operation", { p_room_id: roomId, p_kind: kind, p_token: token });
  dbCheck(error);
  if (data === "limited" || data === "exhausted") throw new CouncilHttpError(429,
    data === "limited" ? "Council's daily generation limit has been reached. Try again later." : "This scene has reached its three-attempt limit. The chat is still available.");
  if (data === "busy") throw new CouncilHttpError(409, "This room is already working on that request. Wait for it to finish, then refresh.");
  if (data !== "claimed" && data !== "ready") throw new CouncilHttpError(404, "Council room not found.");
  return data as "claimed" | "ready";
}
export function councilError(error: unknown): Response {
  const status = error instanceof CouncilHttpError ? error.status : error instanceof CouncilInputError ? 400 : 500;
  const message = error instanceof CouncilHttpError || error instanceof CouncilInputError ? error.message : "Council could not complete this request. Please try again.";
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}
export const privateJson = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
