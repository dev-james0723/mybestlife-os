import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { neighborhoodSchema, shareChoiceSchema, visitSchema, type GardenNeighborhood, type GardenVisit } from "@/lib/garden/neighborhood";

async function clientFor(userId: string) {
  const client = createClient();
  const { data, error } = await client.auth.getUser();
  if (error || data.user?.id !== userId) throw new Error("Your account changed. Reopen your Garden.");
  return client;
}
async function rpc(userId: string, name: "garden_neighborhood" | "garden_visit", input: Record<string, unknown>) {
  const client = await clientFor(userId);
  const { data, error } = await client.rpc(name, input);
  if (error) throw new Error(error.code === "PGRST202" || error.code === "42883" ? "The Garden neighbourhood is not available yet." : error.message);
  if (data && typeof data === "object" && "error" in data) throw new Error(String(data.error));
  return data;
}
export const gardenNeighborhoodRepository = {
  async read(userId: string): Promise<GardenNeighborhood> {
    return neighborhoodSchema.parse(await rpc(userId, "garden_neighborhood", { p_action: "read" }));
  },
  async command(userId: string, action: string, commandId: string, value: Record<string, unknown>) {
    const data = z.object({ save: neighborhoodSchema, result: z.record(z.string(), z.unknown()) }).parse(
      await rpc(userId, "garden_neighborhood", { p_action: action, p_command: commandId, p_value: value }),
    );
    return data;
  },
  async choices(userId: string) {
    return z.array(shareChoiceSchema).parse(await rpc(userId, "garden_neighborhood", { p_action: "choices" }));
  },
  async visit(userId: string, action: "enter" | "read" | "wave", value: Record<string, unknown>): Promise<GardenVisit> {
    return visitSchema.parse(await rpc(userId, "garden_visit", { p_action: action, p_value: value }));
  },
  async leave(userId: string, sessionId: string) {
    await rpc(userId, "garden_visit", { p_action: "leave", p_value: { session_id: sessionId } });
  },
};
