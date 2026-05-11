import { processLock } from "@supabase/auth-js";
import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseKey, getSupabaseUrl } from "@/lib/supabase/env";

/**
 * Use `processLock` instead of the default `navigatorLock` so auth does not rely on
 * `navigator.locks` steal/recovery (AbortError / “lock was stolen” under React Strict Mode
 * and concurrent `getUser()` calls). Cross-tab refresh is still handled by GoTrue.
 */
export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseKey(), {
    auth: {
      lock: processLock,
    },
  });
}
