import { requireText, requireUuid } from "@/lib/mind-council/room-contract";
import { authenticateCouncil, councilError, privateJson, readCouncilBody, ownedRoom, publicRoom, roomMessages, councilViewer, dbCheck, CouncilHttpError, type RoomRow } from "@/lib/mind-council/room-server";
export const runtime = "nodejs";
type Context = { params: Promise<{ roomId: string }> };
export async function GET(req: Request, context: Context) {
  try {
    const { db, user } = await authenticateCouncil(req);
    const room = await ownedRoom(db, user.id, (await context.params).roomId);
    const { data: lastTurn, error } = await db.from("mind_council_turns").select("id,prompt,exchange,status")
      .eq("user_id", user.id).eq("room_id", room.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    dbCheck(error);
    const busy = Boolean(room.chat_token && room.chat_started_at && Date.parse(room.chat_started_at) > Date.now() - 360000);
    return privateJson({ room: publicRoom(room), messages: await roomMessages(db, user.id, room.id),
      viewer: await councilViewer(db, user.id), lastTurn, busy });
  } catch (e) { return councilError(e); }
}
export async function PATCH(req: Request, context: Context) {
  try {
    const { db, user } = await authenticateCouncil(req);
    const id = requireUuid((await context.params).roomId);
    await ownedRoom(db, user.id, id);
    const body = await readCouncilBody(req);
    const patch: { name?: string; is_saved?: boolean; updated_at: string } = { updated_at: new Date().toISOString() };
    if ("name" in body) patch.name = requireText(body.name, 100);
    if ("is_saved" in body) {
      if (typeof body.is_saved !== "boolean") throw new CouncilHttpError(400, "Invalid save state.");
      patch.is_saved = body.is_saved;
    }
    if (Object.keys(patch).length === 1) throw new CouncilHttpError(400, "No supported changes supplied.");
    const { data, error } = await db.from("mind_council_rooms").update(patch).eq("id", id).eq("user_id", user.id).select("*").single();
    dbCheck(error);
    return privateJson({ room: publicRoom(data as RoomRow) });
  } catch (e) { return councilError(e); }
}
