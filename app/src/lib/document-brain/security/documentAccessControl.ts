import type { User } from "@supabase/supabase-js";

export function assertSameUser(userId: string, sessionUser: User): void {
  if (userId !== sessionUser.id) {
    throw new Error("FORBIDDEN");
  }
}
