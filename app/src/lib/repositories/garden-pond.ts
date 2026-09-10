import { createClient } from "@/lib/supabase/client";
import { pondOutboxSchema, pondResponseSchema, pondInvitationResponseSchema, pondTaskChoicesSchema, type PondOutbox, type PondModule } from "@/lib/garden/pond-persistence";

/** A PostgreSQL rule rejection rolls back the whole RPC; transport failures do not prove that. */
export class PondRuleRejection extends Error {
  constructor(message: string) { super(message); this.name = "PondRuleRejection"; }
}

async function accountClient(account: string) {
  const client = createClient(), { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (data.user?.id !== account) throw new Error("Garden account changed. Reopen your pond.");
  return client;
}

export const gardenPondRepository = {
  async read(account: string) {
    const client = await accountClient(account);
    const { data, error } = await client.rpc("garden_pond_command", {
      p_command_id: crypto.randomUUID(), p_revision: 0, p_command: { kind: "read", account, device_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    });
    if (error) throw error;
    return pondResponseSchema.parse(data).save;
  },
  async command(pending: PondOutbox) {
    const request = pondOutboxSchema.parse(pending), client = await accountClient(request.account);
    const { data, error } = await client.rpc("garden_pond_command", {
      p_command_id: request.id, p_revision: request.revision,
      p_command: { ...request.command, account: request.account },
    });
    if (error) {
      if (error.code === "P0001") throw new PondRuleRejection(error.message);
      throw error;
    }
    return pondResponseSchema.parse(data);
  },
  async invitation(account: string, action: "read" | "reserve" | "shown" | "dismissed" | "accepted", deliveryId?: string) {
    const client = await accountClient(account);
    const { data, error } = await client.rpc("garden_pond_invitation", {
      p_action: action, p_input: { account, ...(deliveryId ? { delivery_id: deliveryId } : {}) },
    });
    if (error) throw error;
    return pondInvitationResponseSchema.parse(data);
  },
  async choices(account: string, connections: PondModule[]) {
    const client = await accountClient(account);
    const [tasks, habits, gratitude] = await Promise.all([
      connections.includes("task") ? client.rpc("garden_pond_task_choices", { p_account: account }) : { data: [], error: null },
      connections.includes("habit") ? client.from("habits").select("id,name").eq("user_id", account).is("archived_at", null).eq("is_active", true).order("created_at", { ascending: false }).limit(25) : { data: [], error: null },
      // List completion metadata only. The garden never reads gratitude content.
      connections.includes("gratitude") ? client.from("grateful_things").select("id,created_at").eq("user_id", account).order("created_at", { ascending: false }).limit(12) : { data: [], error: null },
    ]);
    const taskChoices = pondTaskChoicesSchema.safeParse(tasks.data);
    return { tasks: tasks.error || !taskChoices.success ? [] : taskChoices.data, habits: habits.error ? [] : habits.data, gratitude: gratitude.error ? [] : gratitude.data, tasksAvailable: !tasks.error && taskChoices.success, habitsAvailable: !habits.error, gratitudeAvailable: !gratitude.error };
  },
};
