import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/api/vault/_shared", () => ({
  getVaultRouteContext: vi.fn(),
  parseVaultJson: vi.fn(),
}));

import { getVaultRouteContext, parseVaultJson } from "@/app/api/vault/_shared";
import { POST } from "@/app/api/vault/usage/record/route";

const ENTRY_ID = "10000000-0000-4000-8000-000000000001";
const USER_ID = "20000000-0000-4000-8000-000000000002";

function chain<T>(result: T) {
  const builder = {
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    select: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => result),
    single: vi.fn(async () => result),
  };
  return builder;
}

type MockError = { code?: string; message: string };

type MockSupabaseOptions = {
  current?: {
    data: { launch_count: number | null } | null;
    error: MockError | null;
  };
  updated?: {
    data: { launch_count: number | null; last_opened_at: string | null } | null;
    error: MockError | null;
  };
  event?: {
    data: { id: string } | null;
    error: MockError | null;
  };
};

function makeSupabase({
  current = { data: { launch_count: 4 }, error: null },
  updated = {
    data: { launch_count: 5, last_opened_at: "2026-09-03T00:00:00.000Z" },
    error: null,
  },
  event = {
    data: null,
    error: {
      code: "PGRST205",
      message: "Could not find the table 'public.software_usage_events' in the schema cache",
    },
  },
}: MockSupabaseOptions = {}) {
  const read = chain(current);
  const update = chain(updated);
  const eventWrite = chain(event);
  const softwareVault = {
    select: vi.fn(() => read),
    update: vi.fn(() => update),
  };
  const usageEvents = {
    insert: vi.fn(() => eventWrite),
  };
  const supabase = {
    from: vi.fn((table: string) =>
      table === "software_vault" ? softwareVault : usageEvents,
    ),
  };
  return { supabase, softwareVault, usageEvents };
}

describe("POST /api/vault/usage/record", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(parseVaultJson).mockResolvedValue({
      ok: true,
      data: {
        entryId: ENTRY_ID,
        eventType: "used",
        contextType: "vault",
      },
    });
  });

  it("returns 401 before touching the database when there is no signed-in user", async () => {
    const { supabase } = makeSupabase();
    vi.mocked(getVaultRouteContext).mockResolvedValue({
      supabase: supabase as never,
      user: null,
    });

    const response = await POST(new Request("http://localhost/api/vault/usage/record"));

    expect(response.status).toBe(401);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("persists and returns the visible counter even when optional history is unavailable", async () => {
    const { supabase, softwareVault, usageEvents } = makeSupabase();
    vi.mocked(getVaultRouteContext).mockResolvedValue({
      supabase: supabase as never,
      user: { id: USER_ID } as never,
    });

    const response = await POST(new Request("http://localhost/api/vault/usage/record"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      launchCount: 5,
      lastOpenedAt: "2026-09-03T00:00:00.000Z",
      historyRecorded: false,
    });
    expect(softwareVault.update).toHaveBeenCalledWith(
      expect.objectContaining({ launch_count: 5 }),
    );
    expect(usageEvents.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: USER_ID,
        software_vault_entry_id: ENTRY_ID,
        event_type: "manually_marked_used",
      }),
    );
  });

  it("returns 404 without attempting an update for an entry the user cannot read", async () => {
    const { supabase, softwareVault, usageEvents } = makeSupabase({
      current: { data: null, error: null },
    });
    vi.mocked(getVaultRouteContext).mockResolvedValue({
      supabase: supabase as never,
      user: { id: USER_ID } as never,
    });

    const response = await POST(new Request("http://localhost/api/vault/usage/record"));

    expect(response.status).toBe(404);
    expect(softwareVault.update).not.toHaveBeenCalled();
    expect(usageEvents.insert).not.toHaveBeenCalled();
  });
});
