import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import {
  readDevLoginBypassFromRequest,
} from "@/lib/dev-login-bypass";
import type { createServerSupabaseClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

export const DEV_PAGE_USER_ID = "00000000-0000-4000-8000-000000000001";

export type ServerPageUser = Pick<User, "id" | "email"> &
  Partial<Omit<User, "id" | "email">>;

/**
 * Server Component page guard that mirrors middleware's dev-login bypass.
 *
 * API routes and mutations should continue to call Supabase auth directly so
 * writes never happen under a synthetic user. This helper is for page render
 * coverage, local demos, and browser audits that need protected shells to load.
 */
export async function getServerPageUser(
  supabase: ServerSupabaseClient,
): Promise<ServerPageUser | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return user;

  const cookieStore = await cookies();
  const devBypassActive = readDevLoginBypassFromRequest((name) =>
    cookieStore.get(name)?.value,
  );
  if (!devBypassActive) return null;

  return {
    id: DEV_PAGE_USER_ID,
    email: "dev-bypass@mylifeos.local",
    aud: "authenticated",
    role: "authenticated",
    app_metadata: { provider: "dev-bypass", providers: ["dev-bypass"] },
    user_metadata: { dev_bypass: true },
  };
}
