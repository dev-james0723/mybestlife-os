import { createClient } from "@/lib/supabase/client";
import { ensureError } from "@/lib/utils/ensure-error";
import type { AboutMe } from "@/types/database";

const AVATARS_BUCKET = "avatars";
/** Distinct from Settings profile path (`avatar`) so uploads do not overwrite each other. */
const CREW_PROFILE_STORAGE_KEY = "crew-profile";

const ACCEPTED_CREW_PROFILE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_CREW_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;

export type UpsertAboutMeInput = Partial<
  Pick<
    AboutMe,
    | "instruction_manual"
    | "core_values"
    | "mission"
    | "personality_insights"
    | "profile_image_url"
  >
>;

export const aboutMeRepository = {
  /**
   * Uploads an image to Supabase Storage and sets `about_me.profile_image_url` to the public URL.
   */
  async uploadProfileImage(file: File): Promise<AboutMe> {
    if (!ACCEPTED_CREW_PROFILE_IMAGE_TYPES.has(file.type)) {
      throw new Error("INVALID_CREW_PROFILE_IMAGE_TYPE");
    }
    if (file.size > MAX_CREW_PROFILE_IMAGE_BYTES) {
      throw new Error("CREW_PROFILE_IMAGE_TOO_LARGE");
    }

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError) throw ensureError(userError, "Not authenticated");
    if (!user) throw new Error("Not authenticated");

    const objectPath = `${user.id}/${CREW_PROFILE_STORAGE_KEY}`;
    const { error: uploadError } = await supabase.storage
      .from(AVATARS_BUCKET)
      .upload(objectPath, file, { upsert: true, contentType: file.type });
    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(objectPath);

    return aboutMeRepository.upsert({ profile_image_url: publicUrl });
  },

  async get(): Promise<AboutMe | null> {
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError) throw ensureError(userError, "Not authenticated");
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase.from("about_me").select("*").eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    return data;
  },

  async upsert(input: UpsertAboutMeInput): Promise<AboutMe> {
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError) throw ensureError(userError, "Not authenticated");
    if (!user) throw new Error("Not authenticated");

    const { data: existing, error: selectError } = await supabase
      .from("about_me")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (selectError) throw selectError;

    const updatedAt = new Date().toISOString();

    if (existing) {
      const { data, error } = await supabase
        .from("about_me")
        .update({ ...input, updated_at: updatedAt })
        .eq("user_id", user.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const { data, error } = await supabase
      .from("about_me")
      .insert({
        user_id: user.id,
        instruction_manual: input.instruction_manual ?? null,
        core_values: input.core_values ?? null,
        mission: input.mission ?? null,
        personality_insights: input.personality_insights ?? null,
        profile_image_url: input.profile_image_url ?? null,
        updated_at: updatedAt,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
