import { createClient } from "@/lib/supabase/client";

export const LOCAL_DEV_USER_ID = "00000000-0000-0000-0000-000000000000";

export async function getCurrentUserId(): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    const msg = error.message?.toLowerCase() ?? "";
    if (msg.includes("session") || msg.includes("jwt")) {
      throw new Error(
        "Your sign-in session is missing or expired. Please sign out and sign in again.",
      );
    }
    throw error;
  }

  if (!data.user) {
    throw new Error("You must be signed in to save Focus & Reality data to the cloud.");
  }

  return data.user.id;
}
