import { describe, expect, it, vi } from "vitest";
import { insertOrRecoverOwned } from "./insert-or-recover";

const id = "11111111-1111-4111-8111-111111111111";
function fixture(insertError: unknown, existing: Record<string, unknown> | null) {
  const chain = {
    insert: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: insertError ? null : { id }, error: insertError }),
    maybeSingle: vi.fn().mockResolvedValue({ data: existing, error: null }),
  };
  const client = { from: vi.fn().mockReturnValue(chain) };
  return { chain, client: client as unknown as Parameters<typeof insertOrRecoverOwned>[0] };
}
describe("recovering a repeated save", () => {
  it("reuses the existing owner's row without overwriting later edits", async () => {
    const { client, chain } = fixture({ code: "23505" }, { id, title: "Edited after saving" });
    await expect(insertOrRecoverOwned(client, "knowledge_items", { title: "Old draft" }, "owner", id))
      .resolves.toEqual({ data: { id, title: "Edited after saving" }, recovered: true });
    expect(chain.eq.mock.calls).toEqual([["id", id], ["user_id", "owner"]]);
  });
  it("does not recover another account's row or unrelated write errors", async () => {
    const conflict = { code: "23505" };
    const missing = fixture(conflict, null);
    await expect(insertOrRecoverOwned(missing.client, "ideas", {}, "owner", id)).rejects.toEqual(conflict);
    const unavailable = fixture({ code: "503" }, { id });
    await expect(insertOrRecoverOwned(unavailable.client, "ideas", {}, "owner", id)).rejects.toEqual({ code: "503" });
    expect(unavailable.chain.maybeSingle).not.toHaveBeenCalled();
  });
  it("preserves normal creation and rejects malformed operation IDs before writing", async () => {
    const { client, chain } = fixture(null, null);
    await expect(insertOrRecoverOwned(client, "ideas", {}, "owner")).resolves.toEqual({ data: { id }, recovered: false });
    await expect(insertOrRecoverOwned(client, "ideas", {}, "owner", "bad")).rejects.toThrow("INVALID_SAVE_OPERATION_ID");
    expect(chain.insert).toHaveBeenCalledTimes(1);
  });
});
