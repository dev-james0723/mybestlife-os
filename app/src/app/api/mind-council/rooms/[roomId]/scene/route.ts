import { randomUUID } from "node:crypto";
import { buildCouncilScenePrompt } from "@/lib/mind-council/room-scene-prompt";
import { generateCouncilScene, requireSceneProvider } from "@/lib/mind-council/room-providers";
import { authenticateCouncil, councilError, privateJson, readCouncilBody, ownedRoom, publicRoom, claimCouncilOperation, dbCheck, SCENE_BUCKET, CouncilHttpError, type CouncilDb, type RoomRow } from "@/lib/mind-council/room-server";
export const runtime = "nodejs";
export const maxDuration = 300;
type Context = { params: Promise<{ roomId: string }> };
export async function GET(req: Request, context: Context) {
  try {
    const { db, user } = await authenticateCouncil(req);
    const room = await ownedRoom(db, user.id, (await context.params).roomId);
    if (room.scene_status !== "ready" || !room.scene_path) throw new CouncilHttpError(404, "Scene is not ready.");
    const { data, error } = await db.storage.from(SCENE_BUCKET).download(room.scene_path);
    if (error || !data) throw new CouncilHttpError(503, "This saved scene is temporarily unavailable.");
    return new Response(await data.arrayBuffer(), { headers: { "Content-Type": "image/webp",
      "Cache-Control": "private, max-age=300", "Vary": "Cookie", "X-Content-Type-Options": "nosniff" } });
  } catch (e) { return councilError(e); }
}
export async function POST(req: Request, context: Context) {
  let release: { db: CouncilDb; userId: string; roomId: string; token: string } | undefined;
  try {
    const { db, user } = await authenticateCouncil(req);
    const room = await ownedRoom(db, user.id, (await context.params).roomId);
    if (room.scene_status === "ready") return privateJson({ room: publicRoom(room) });
    const body = await readCouncilBody(req);
    if (room.scene_status === "error" && body.retry !== true) throw new CouncilHttpError(409, "Choose Retry scene to request another generation.");
    requireSceneProvider();
    const token = randomUUID();
    const claim = await claimCouncilOperation(db, room.id, "scene", token);
    if (claim === "ready") return privateJson({ room: publicRoom(await ownedRoom(db, user.id, room.id)) });
    release = { db, userId: user.id, roomId: room.id, token };
    const result = await generateCouncilScene(buildCouncilScenePrompt(room.advisors, room.scene_template),
      AbortSignal.any([req.signal, AbortSignal.timeout(240000)]));
    const path = `${user.id}/${room.id}/${token}.webp`;
    const upload = await db.storage.from(SCENE_BUCKET).upload(path, result.bytes, { contentType: "image/webp", upsert: false });
    if (upload.error) throw new CouncilHttpError(503, "The scene was generated but could not be stored. Chat remains available.");
    const { data, error } = await db.from("mind_council_rooms").update({ scene_status: "ready", scene_path: path,
      scene_version: token, scene_model: result.model, scene_token: null, scene_error: null, updated_at: new Date().toISOString() })
      .eq("id", room.id).eq("user_id", user.id).eq("scene_token", token).select("*").maybeSingle();
    dbCheck(error);
    if (!data) throw new CouncilHttpError(409, "This scene request expired. Refresh the room.");
    release = undefined;
    return privateJson({ room: publicRoom(data as RoomRow) });
  } catch (e) {
    if (release) {
      const { db, roomId, userId, token } = release;
      await db.from("mind_council_rooms").update({ scene_status: "error", scene_token: null,
        scene_error: e instanceof CouncilHttpError ? e.message : "Scene generation was interrupted. You can retry; chat is still available." })
        .eq("id", roomId).eq("user_id", userId).eq("scene_token", token);
    }
    return councilError(e);
  }
}
