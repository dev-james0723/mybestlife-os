import { randomInt } from "node:crypto";
import { resolveSavedMindSkill } from "@/lib/mind-council/resolve-saved-skill";
import { advisorDisplayName } from "@/lib/mind-council/conversation-contract";
import { SCENE_TEMPLATES, CouncilInputError, requireUuid, requireText, requireAdvisorIds, requireTemplate } from "@/lib/mind-council/room-contract";
import { authenticateCouncil, councilError, privateJson, readCouncilBody, dbCheck, publicRoom, councilViewer, CouncilHttpError, type RoomRow } from "@/lib/mind-council/room-server";
export const runtime = "nodejs";
export async function GET(req: Request) {
  try {
    const { db, user } = await authenticateCouncil(req);
    const url = new URL(req.url);
    const before = url.searchParams.get("before");
    if (before && !/^\d{4}-\d{2}-\d{2}T[0-9:.+Z-]+$/.test(before)) throw new CouncilInputError("Invalid page cursor.");
    let query = db.from("mind_council_rooms").select("*").eq("user_id", user.id)
      .eq("is_saved", true).order("updated_at", { ascending: false }).limit(25);
    if (before) query = query.lt("updated_at", before);
    const { data, error } = await query;
    dbCheck(error);
    const rows = (data ?? []) as RoomRow[];
    return privateJson({ rooms: rows.slice(0, 24).map(publicRoom),
      nextCursor: rows.length > 24 ? rows[23].updated_at : null, viewer: await councilViewer(db, user.id) });
  } catch (e) { return councilError(e); }
}
export async function POST(req: Request) {
  try {
    const { db, user } = await authenticateCouncil(req);
    const body = await readCouncilBody(req);
    const id = requireUuid(body.id);
    const ids = requireAdvisorIds(body.advisorIds);
    const question = requireText(body.question, 4000);
    const { data: existing, error: lookupError } = await db.from("mind_council_rooms").select("*").eq("user_id", user.id).eq("id", id).maybeSingle();
    dbCheck(lookupError);
    if (existing) {
      const row = existing as RoomRow;
      if (JSON.stringify(row.advisor_ids) !== JSON.stringify(ids) || row.initial_question !== question)
        throw new CouncilHttpError(409, "This creation identifier already belongs to a different Council.");
      return privateJson({ room: publicRoom(row), viewer: await councilViewer(db, user.id) });
    }
    const { count, error: countError } = await db.from("mind_council_rooms").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).gte("created_at", new Date(Date.now() - 86400000).toISOString());
    dbCheck(countError);
    if ((count ?? 0) >= 50) throw new CouncilHttpError(429, "Too many new rooms today. Reopen a saved room instead.");
    const skills = await Promise.all(ids.map((skillId) => resolveSavedMindSkill(db, user.id, skillId)));
    if (skills.some((s) => !s)) throw new CouncilInputError("One of these advisors is unavailable. Choose saved advisors before starting a room.");
    const advisors = skills.map((s) => ({ id: s!.skillId, name: advisorDisplayName(s!.lensTitle), subtitle: s!.lensSubtitle }));
    let template;
    if (!body.template || body.template === "surprise") {
      const { data: last } = await db.from("mind_council_rooms").select("scene_template").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1);
      const pool = SCENE_TEMPLATES.filter((t) => t !== last?.[0]?.scene_template);
      template = pool[randomInt(pool.length)];
    } else template = requireTemplate(body.template);
    const name = body.name ? requireText(body.name, 100) : question.replace(/\s+/g, " ").slice(0, 64);
    const { data, error } = await db.from("mind_council_rooms").insert({ id, user_id: user.id, name,
      advisor_ids: ids, advisors, initial_question: question, scene_template: template }).select("*").single();
    if (error?.code === "23505") throw new CouncilHttpError(409, "This room is being created. Please retry the same request.");
    dbCheck(error);
    return privateJson({ room: publicRoom(data as RoomRow), viewer: await councilViewer(db, user.id) }, 201);
  } catch (e) { return councilError(e); }
}
