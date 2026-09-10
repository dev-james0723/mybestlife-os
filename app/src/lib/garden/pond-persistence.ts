import { z } from "zod";
import { pondCommandSchema, pondWorldSchema, POND_VERSION } from "./pond";

export const pondModuleSchema = z.enum(["task", "habit", "gratitude", "rest"]);
export type PondModule = z.infer<typeof pondModuleSchema>;
const habitCalendarSchema = z.object({ date: z.iso.date(), timezone: z.string().min(1).max(80) }).strict();
export const pondTaskChoicesSchema = z.array(z.object({
  id: z.string().uuid(), title: z.string(), status: z.string(),
  project_id: z.string().uuid().nullable(), recorded_today: z.boolean(),
}));
export const pondRequestSchema = z.discriminatedUnion("kind", [
  ...pondCommandSchema.options,
  z.object({ kind: z.literal("buddy-settings"), enabled: z.boolean() }).strict(),
  z.object({ kind: z.literal("connections"), modules: z.array(pondModuleSchema).max(4) }).strict(),
  z.object({ kind: z.literal("timezone"), timezone: z.string().min(1).max(80) }).strict(),
  z.object({ kind: z.literal("select"), source_kind: pondModuleSchema, source_id: z.string().uuid().nullable().optional(), title: z.string().trim().min(1).max(180), scope: z.enum(["completion", "chosen_step"]).optional(), planned_for: z.iso.date().nullable().optional(), source_calendar: habitCalendarSchema.optional() }).strict(),
  z.object({ kind: z.literal("intention"), action: z.enum(["revise", "pause", "resume"]), intention_id: z.string().uuid(), intention_version: z.number().int().positive(), source_kind: pondModuleSchema.optional(), source_id: z.string().uuid().nullable().optional(), title: z.string().trim().min(1).max(180).optional(), scope: z.enum(["completion", "chosen_step"]).optional(), planned_for: z.iso.date().nullable().optional(), source_calendar: habitCalendarSchema.optional() }).strict(),
  z.object({ kind: z.literal("skip"), intention_id: z.string().uuid(), intention_version: z.number().int().positive().optional() }).strict(),
  z.object({ kind: z.literal("evidence"), action: z.enum(["link", "unlink"]), intention_id: z.string().uuid(), intention_version: z.number().int().positive(), source_kind: z.enum(["task", "habit", "gratitude"]).optional(), source_id: z.string().uuid().optional(), link_id: z.string().uuid().optional(), source_calendar: habitCalendarSchema.optional() }).strict(),
  z.object({ kind: z.literal("claim"), intention_id: z.string().uuid(), intention_version: z.number().int().positive().optional(), confirmed: z.boolean().optional(), source_id: z.string().uuid().optional(), link_id: z.string().uuid().optional() }).strict(),
  z.object({ kind: z.literal("seen"), event_id: z.string().uuid() }).strict(),
]);
export type PondRequest = z.infer<typeof pondRequestSchema>;
export const pondSaveSchema = z.object({
  world: pondWorldSchema,
  invitations: z.object({ enabled: z.boolean(), pause_until: z.string().nullable() }),
  connections: z.array(pondModuleSchema),
  timezone: z.string(), pending_timezone: z.string().nullable(),
  evidence_links: z.array(z.object({
    id: z.string().uuid(), intention_id: z.string().uuid(), source_kind: pondModuleSchema,
    source_id: z.string().uuid().nullable(), occurrence: z.string().nullable(),
    is_primary: z.boolean(), linked_at: z.string(), zone_at_link: z.string(),
  })).default([]),
  intentions: z.array(z.object({
    id: z.string().uuid(), source_kind: pondModuleSchema, source_id: z.string().uuid().nullable(),
    title: z.string(), occurrence: z.string().nullable(), zone_at_selection: z.string(),
    status: z.enum(["active", "paused", "skipped", "granted", "acknowledged_without_grant"]),
    version: z.number().int().positive(), scope: z.enum(["completion", "chosen_step"]),
    planned_for: z.string().nullable(), paused_at: z.string().nullable(),
    selected_at: z.string(), settled_at: z.string().nullable(),
  })),
  grants: z.array(z.object({
    id: z.string().uuid(), intention_id: z.string().uuid(), source_kind: pondModuleSchema,
    issued_at: z.string(), consumed_by: z.string().nullable(), evidence_kind: z.enum(["saved_record", "self_report"]),
  })),
  events: z.array(z.object({ id: z.string().uuid(), kind: z.string(), fact_key: z.string(), created_at: z.string() })),
});
export type PondSave = z.infer<typeof pondSaveSchema>;
export const pondResponseSchema = z.object({ status: z.enum(["ok", "conflict"]), save: pondSaveSchema });
export const pondOutboxSchema = z.object({
  id: z.string().uuid(), account: z.string().uuid(), version: z.literal(POND_VERSION),
  revision: z.number().int().nonnegative(), command: pondRequestSchema,
});
export type PondOutbox = z.infer<typeof pondOutboxSchema>;

function openPondOutbox(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("mybestlife-garden-pond", 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("pending")) db.createObjectStore("pending", { keyPath: "account" });
      if (!db.objectStoreNames.contains("feedback")) db.createObjectStore("feedback", { keyPath: ["account", "id", "action"] }).createIndex("account", "account");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Close the other garden tab to update offline storage."));
  });
}

/** A single unresolved world command per account. Never overwrite an unknown committed result. */
export async function readPondOutbox(account: string): Promise<PondOutbox | null> {
  const db = await openPondOutbox();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pending", "readonly"), request = tx.objectStore("pending").get(account);
    let value: PondOutbox | null = null;
    request.onsuccess = () => {
      if (request.result === undefined) return;
      const parsed = pondOutboxSchema.safeParse(request.result);
      if (!parsed.success || parsed.data.account !== account) { tx.abort(); return; }
      value = parsed.data;
    };
    tx.oncomplete = () => { db.close(); resolve(value); };
    tx.onerror = tx.onabort = () => { db.close(); reject(new Error("Your pending pond change could not be read. It has been kept.")); };
  });
}

export async function writePondOutbox(value: PondOutbox) {
  pondOutboxSchema.parse(value);
  const db = await openPondOutbox();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("pending", "readwrite"), store = tx.objectStore("pending");
    const read = store.get(value.account);
    read.onsuccess = () => {
      if (read.result && read.result.id !== value.id) { tx.abort(); return; }
      store.put(value);
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = tx.onabort = () => { db.close(); reject(new Error("Another pond change is awaiting confirmation. Sync it first.")); };
  });
}

export async function clearPondOutbox(value: PondOutbox) {
  const db = await openPondOutbox();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("pending", "readwrite"), store = tx.objectStore("pending");
    const read = store.get(value.account);
    read.onsuccess = () => { if (read.result?.id === value.id) store.delete(value.account); };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = tx.onabort = () => { db.close(); reject(tx.error ?? new Error("Confirmation is saved; retry sync to clear the pending change.")); };
  });
}

export const pondInvitationResponseSchema = z.object({
  managed: z.boolean(),
  invitation: z.object({ id: z.string().uuid(), kind: z.enum(["growth-ready", "opportunity"]) }).nullable(),
  settings: z.object({ enabled: z.boolean(), pause_until: z.string().nullable(), notifications_enabled: z.boolean() }).nullable(),
});

const pondFeedbackSchema = z.object({ account: z.string().uuid(), id: z.string().uuid(), action: z.enum(["shown", "dismissed", "accepted"]) });
export type PondFeedback = z.infer<typeof pondFeedbackSchema>;
export async function queuePondFeedback(value: PondFeedback) {
  pondFeedbackSchema.parse(value);
  const db = await openPondOutbox();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("feedback", "readwrite"); tx.objectStore("feedback").put(value);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = tx.onabort = () => { db.close(); reject(new Error("Invitation feedback is awaiting storage.")); };
  });
}
export async function readPondFeedback(account: string) {
  const db = await openPondOutbox();
  return new Promise<PondFeedback[]>((resolve, reject) => {
    const tx = db.transaction("feedback", "readonly"), request = tx.objectStore("feedback").index("account").getAll(account);
    let values: PondFeedback[] = [];
    request.onsuccess = () => {
      const parsed = z.array(pondFeedbackSchema).safeParse(request.result);
      if (!parsed.success || parsed.data.some((value) => value.account !== account)) { tx.abort(); return; }
      values = parsed.data;
    };
    tx.oncomplete = () => { db.close(); resolve(values); };
    tx.onerror = tx.onabort = () => { db.close(); reject(new Error("Invitation feedback could not be read; invitations stay quiet.")); };
  });
}
export async function clearPondFeedback(value: PondFeedback) {
  const db = await openPondOutbox();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("feedback", "readwrite"); tx.objectStore("feedback").delete([value.account, value.id, value.action]);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = tx.onabort = () => { db.close(); reject(new Error("Invitation feedback will be confirmed again.")); };
  });
}
