"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DEFAULT_LOCALE_SLUG, normalizeLocaleSlug } from "@/lib/i18n/locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import {
  discardQuickSaveCapture,
  saveQuickSaveCaptureToIdea,
  saveQuickSaveCaptureToKnowledge,
} from "@/lib/quick-save/server";

async function requireUserId() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return user.id;
}

function successPath(
  locale: string,
  destination: "knowledge" | "idea",
  id: string,
): string {
  const slug = normalizeLocaleSlug(locale) ?? DEFAULT_LOCALE_SLUG;
  const params = new URLSearchParams({ destination });
  params.set(destination === "knowledge" ? "item" : "idea", id);
  return `${withLocalePrefix(slug, "/quick-save/success")}?${params.toString()}`;
}

export async function saveQuickSaveKnowledgeAction(locale: string, captureId: string) {
  const userId = await requireUserId();
  const result = await saveQuickSaveCaptureToKnowledge({ captureId, userId });
  redirect(successPath(locale, "knowledge", result.itemId));
}

export async function saveQuickSaveIdeaAction(locale: string, captureId: string) {
  const userId = await requireUserId();
  const result = await saveQuickSaveCaptureToIdea({ captureId, userId });
  redirect(successPath(locale, "idea", result.ideaId));
}

export async function discardQuickSaveAction(locale: string, captureId: string) {
  const userId = await requireUserId();
  await discardQuickSaveCapture({ captureId, userId });
  const slug = normalizeLocaleSlug(locale) ?? DEFAULT_LOCALE_SLUG;
  redirect(withLocalePrefix(slug, "/dashboard?quick_save=discarded"));
}
