import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { readdirSync } from "node:fs";
import { isDevLoginBypassFeatureEnabled, readDevLoginBypassFromRequest } from "../dev-login-bypass";

const { getUser, createServerClient } = vi.hoisted(() => ({
  getUser: vi.fn(),
  createServerClient: vi.fn(),
}));
vi.mock("@supabase/ssr", () => ({ createServerClient }));
let updateSession: typeof import("./middleware").updateSession;

function request(path: string) {
  return new NextRequest(`https://app.example.invalid${path}`, {
    headers: { cookie: "mylifeos_dev_bypass=1" },
  });
}

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://placeholder.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY", "fixture-key");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
  vi.stubEnv("NEXT_PUBLIC_DEV_LOGIN_BYPASS", "true");
  vi.stubEnv("NEXT_PUBLIC_HIDE_DEV_LOGIN_BYPASS", "false");
  vi.stubEnv("NEXT_PUBLIC_ENABLE_EXPERIMENTAL_TOOLS", "false");
  vi.stubEnv("NEXT_PUBLIC_ENABLE_LEARNING", "false");
  getUser.mockResolvedValue({ data: { user: null }, error: null });
  createServerClient.mockReturnValue({ auth: { getUser } });
  ({ updateSession } = await import("./middleware"));
});
afterEach(() => vi.unstubAllEnvs());

describe("production authentication boundary", () => {
  it.each(["https://placeholder.supabase.co", ""])("fails closed with unavailable backend %s", async (url) => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
    const response = await updateSession(request("/zh-hk/tasks?view=list"));
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/zh-hk/login");
    expect(location.searchParams.get("next")).toBe("/zh-hk/tasks?view=list");
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("fails closed when the key is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://backend.example.invalid");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY", "");
    expect((await updateSession(request("/en/career/profile"))).status).toBe(307);
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it.each(["/en/privacy", "/en/help", "/en/login"])("keeps public information accessible at %s", async (path) => {
    expect((await updateSession(request(path))).status).toBe(200);
  });

  it.each(["/en/ai-assistant", "/en/business-analyst", "/en/youtube-radar", "/en/japanese-study"])("lets disabled route %s render its own notFound boundary", async (path) => {
    expect((await updateSession(request(path))).headers.get("x-middleware-next")).toBe("1");
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("does not accept a dev cookie or opt-in flag in production", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://backend.example.invalid");
    expect(isDevLoginBypassFeatureEnabled()).toBe(false);
    expect(readDevLoginBypassFromRequest(() => "1")).toBe(false);
    expect((await updateSession(request("/en/tasks"))).status).toBe(307);
  });

  it("allows a verified session and preserves a safe login return path", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://backend.example.invalid");
    getUser.mockResolvedValue({ data: { user: { id: "verified-fixture-user" } }, error: null });
    expect((await updateSession(request("/en/tasks"))).status).toBe(200);
    const response = await updateSession(request("/en/login?next=%2Fen%2Ftasks%3Fview%3Dlist"));
    expect(response.headers.get("location")).toBe("https://app.example.invalid/en/tasks?view=list");
  });

  it("denies the route when session verification fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://backend.example.invalid");
    getUser.mockRejectedValue(new Error("fixture backend unavailable"));
    expect((await updateSession(request("/en/tasks"))).status).toBe(307);
  });

  it("retains placeholder UI fixtures only in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    expect((await updateSession(request("/en/tasks"))).status).toBe(200);
    expect(isDevLoginBypassFeatureEnabled()).toBe(true);
  });

  it("requires login for every enabled page root in the protected app layout", async () => {
    const { isDisabledFeatureRoute } = await import("../features");
    const directory = new URL("../../app/[locale]/(protected)/", import.meta.url);
    const roots = readdirSync(directory, { withFileTypes: true }).filter((entry) => entry.isDirectory());
    for (const entry of roots) {
      // These two informational pages deliberately render outside the app shell.
      if (["privacy", "help"].includes(entry.name) || isDisabledFeatureRoute(`/${entry.name}`)) continue;
      const response = await updateSession(request(`/en/${entry.name}`));
      expect(response.status, `unprotected app route: ${entry.name}`).toBe(307);
    }
  });

  it("protects Notes when the feature is enabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_NOTES", "true");
    vi.resetModules();
    const { updateSession: enabledSession } = await import("./middleware");
    expect((await enabledSession(request("/en/notes"))).status).toBe(307);
  });
});
