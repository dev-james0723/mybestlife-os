import { randomUUID } from "node:crypto";
import { parseAppLocale } from "@/lib/i18n/app-locale";
import { resolveSavedMindSkill } from "@/lib/mind-council/resolve-saved-skill";
import { requireUuid, requireText, mentionedAdvisorIds, removeMentions, executeMeeting, meetingOrder, MAX_ROOM_MESSAGES, type CouncilMessage, type CouncilEvent } from "@/lib/mind-council/room-contract";
import { generateCouncilContribution, generateCouncilSummary, requireMeetingProvider } from "@/lib/mind-council/room-providers";
import { authenticateCouncil, councilError, readCouncilBody, ownedRoom, roomMessages, claimCouncilOperation, dbCheck, CouncilHttpError } from "@/lib/mind-council/room-server";
export const runtime = "nodejs";
export const maxDuration = 300;
type Context = { params: Promise<{ roomId: string }> };
type Turn = { id: string; prompt: string; target_ids: string[]; exchange: boolean; status: string };
const eventLine = (event: CouncilEvent | { type: "heartbeat" }) => new TextEncoder().encode(JSON.stringify(event) + "\n");
export async function POST(req: Request, context: Context) {
  try {
    const { db, user } = await authenticateCouncil(req);
    const room = await ownedRoom(db, user.id, (await context.params).roomId);
    const body = await readCouncilBody(req);
    const turnId = requireUuid(body.requestId);
    const prompt = requireText(body.message, 4000);
    if (body.exchange !== undefined && typeof body.exchange !== "boolean") throw new CouncilHttpError(400, "Invalid meeting mode.");
    const exchange = body.exchange !== false;
    const mentions = mentionedAdvisorIds(prompt, room.advisors);
    if (/(?:^|\s)@[\p{L}\p{N}_]/u.test(removeMentions(prompt, room.advisors)))
      throw new CouncilHttpError(400, "Complete each @mention using an advisor in this room.");
    const ids = mentions.length ? mentions : room.advisor_ids;
    const locale = parseAppLocale(body.locale);
    const existingResult = await db.from("mind_council_turns").select("id,prompt,target_ids,exchange,status")
      .eq("id", turnId).eq("room_id", room.id).eq("user_id", user.id).maybeSingle();
    dbCheck(existingResult.error);
    const existing = existingResult.data as Turn | null;
    if (existing && (existing.prompt !== prompt || existing.exchange !== exchange || JSON.stringify(existing.target_ids) !== JSON.stringify(ids)))
      throw new CouncilHttpError(409, "This request identifier is already used by a different message.");
    const initialHistory = await roomMessages(db, user.id, room.id);
    if (existing?.status === "complete") {
      const events: CouncilEvent[] = initialHistory.filter((m) => m.turn_id === turnId).map((message) => ({ type: "message", message }));
      events.push({ type: "done", turnId });
      return new Response(events.map((e) => JSON.stringify(e)).join("\n") + "\n", { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });
    }
    if (existing) {
      const { data: latest, error } = await db.from("mind_council_turns").select("id").eq("room_id", room.id).eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      dbCheck(error);
      if (latest?.id !== turnId) throw new CouncilHttpError(409, "Only the latest interrupted turn can be resumed. Send a new follow-up instead.");
    }
    const requiredSlots = meetingOrder(ids, exchange).length + (ids.length > 1 ? 1 : 0) + 1;
    if (initialHistory.length + requiredSlots - initialHistory.filter((m) => m.turn_id === turnId).length > MAX_ROOM_MESSAGES) throw new CouncilHttpError(409, "This room has reached its transcript limit. Keep it saved and start a new Council to continue.");
    requireMeetingProvider();
    const resolved = await Promise.all(room.advisor_ids.map((id) => resolveSavedMindSkill(db, user.id, id)));
    if (resolved.some((s) => !s)) throw new CouncilHttpError(409, "A saved advisor is no longer available. The previous conversation is still accessible.");
    const token = randomUUID();
    await claimCouncilOperation(db, room.id, "turn", token);
    const disconnect = new AbortController();
    const signal = AbortSignal.any([req.signal, disconnect.signal, AbortSignal.timeout(270000)]);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        let closed = false;
        const send = (event: CouncilEvent | { type: "heartbeat" }) => {
          if (closed || signal.aborted) return;
          try { controller.enqueue(eventLine(event)); } catch { closed = true; disconnect.abort(); }
        };
        const heartbeat = setInterval(() => send({ type: "heartbeat" }), 15000);
        void (async () => {
          try {
            // Read again after taking the lease; never use browser-supplied conversation history.
            const history = await roomMessages(db, user.id, room.id);
            if (history.length + requiredSlots - history.filter((m) => m.turn_id === turnId).length > MAX_ROOM_MESSAGES)
              throw new CouncilHttpError(409, "This room has reached its transcript limit. Start a new Council to continue.");
            const turn = existing
              ? await db.from("mind_council_turns").update({ status: "running", updated_at: new Date().toISOString() })
                .eq("id", turnId).eq("room_id", room.id).eq("user_id", user.id)
              : await db.from("mind_council_turns").insert({ id: turnId, room_id: room.id, user_id: user.id,
                prompt, target_ids: ids, exchange, status: "running" });
            dbCheck(turn.error);
            const persist = async (content: string, step: number, advisorId: string | null, name: string, kind: CouncilMessage["kind"]) => {
              signal.throwIfAborted();
              const current = await ownedRoom(db, user.id, room.id);
              if (current.chat_token !== token) throw new CouncilHttpError(409, "This meeting lease expired. Refresh the room.");
              const message: CouncilMessage = { id: randomUUID(), turn_id: turnId, kind, advisor_id: advisorId,
                display_name: name, content, step, created_at: new Date().toISOString() };
              const { error } = await db.from("mind_council_messages").insert({ ...message, user_id: user.id, room_id: room.id });
              dbCheck(error);
              return message;
            };
            const oldMessages = history.filter((m) => m.turn_id === turnId);
            for (const message of oldMessages) send({ type: "message", message });
            if (!oldMessages.some((m) => m.step === 0)) {
              const message = await persist(prompt, 0, null, "You", "user");
              history.push(message); send({ type: "message", message });
            }
            const completed = oldMessages.map((m) => m.step);
            const fullHistory = await executeMeeting({ ids, exchange, history, completed, signal,
              status: (step) => send({ type: "status", advisorId: step.advisorId, round: step.round }),
              message: (message) => send({ type: "message", message }),
              generate: async (step, transcript) => {
                const skill = resolved.find((s) => s!.skillId === step.advisorId)!;
                const advisor = room.advisors.find((a) => a.id === step.advisorId)!;
                return generateCouncilContribution({ skill, name: advisor.name, round: step.round, history: transcript, locale,
                  signal: AbortSignal.any([signal, AbortSignal.timeout(65000)]) });
              },
              persist: (text, step) => persist(text, step.step, step.advisorId,
                room.advisors.find((a) => a.id === step.advisorId)!.name, "advisor"),
            });
            if (ids.length > 1 && !completed.includes(9)) {
              send({ type: "status", advisorId: "council-chair", round: 0 });
              const text = await generateCouncilSummary(fullHistory.filter((m) => m.turn_id === turnId), locale,
                AbortSignal.any([signal, AbortSignal.timeout(45000)]));
              send({ type: "message", message: await persist(text, 9, null, "Council summary", "summary") });
            }
            dbCheck((await db.from("mind_council_turns").update({ status: "complete", updated_at: new Date().toISOString() })
              .eq("id", turnId).eq("room_id", room.id).eq("user_id", user.id)).error);
            send({ type: "done", turnId });
          } catch (e) {
            await db.from("mind_council_turns").update({ status: "error", updated_at: new Date().toISOString() }).eq("id", turnId).eq("room_id", room.id).eq("user_id", user.id);
            send({ type: "error", turnId, error: e instanceof CouncilHttpError ? e.message : "This turn was interrupted. Earlier replies are saved; retry resumes the unfinished contributions." });
          } finally {
            clearInterval(heartbeat);
            await db.from("mind_council_rooms").update({ chat_token: null, updated_at: new Date().toISOString() })
              .eq("id", room.id).eq("user_id", user.id).eq("chat_token", token);
            if (!closed) { closed = true; try { controller.close(); } catch { /* disconnected */ } }
          }
        })();
      },
      cancel() { disconnect.abort(); },
    });
    return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform", "X-Accel-Buffering": "no" } });
  } catch (e) { return councilError(e); }
}
