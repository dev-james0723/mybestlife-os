import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { addKnowledgeFromText, addKnowledgeFromUrl, finalizeKnowledgeFileUpload } from "@/lib/knowledge/mutations";
import { guessMimeFromExtension } from "@/lib/knowledge/knowledge-file-upload";
import {
  DEFAULT_LOCALE_SLUG,
  appLocaleToUrlSlug,
  type LocaleUrlSlug,
} from "@/lib/i18n/locale-slug";
import { defaultLocalizedPath, withLocalePrefix } from "@/lib/i18n/locale-path";
import { parseAppLocale, type AppLocale } from "@/lib/i18n/app-locale";
import {
  QUICK_SAVE_TEXT_LIMIT,
  QUICK_SAVE_TITLE_LIMIT,
  cleanSharedString,
  extractFirstHttpUrl,
  normalizeQuickSaveDestination,
  sanitizeSharedFilename,
} from "@/lib/quick-save/payload";
import {
  createIdeaFromQuickSave,
  insertQuickSaveCapture,
} from "@/lib/quick-save/server";
import type { QuickSaveDefaultDestination, QuickSaveFileRef } from "@/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const QUICK_SAVE_MAX_FILE_BYTES = 50 * 1024 * 1024;
const QUICK_SAVE_FILE_EXTENSIONS = new Set([
  "pdf",
  "txt",
  "md",
  "png",
  "jpg",
  "jpeg",
  "webp",
]);
const QUICK_SAVE_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

type QuickSaveProfile = {
  language: AppLocale;
  slug: LocaleUrlSlug;
  enabled: boolean;
  defaultDestination: QuickSaveDefaultDestination;
  requireReview: boolean;
};

function redirectTo(request: Request, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, request.url), 303);
}

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File && value.size > 0;
}

function getSharedFiles(formData: FormData): File[] {
  return formData.getAll("files").filter(isUploadFile);
}

function fileExtension(name: string): string {
  const ext = name.split(".").pop()?.trim().toLowerCase() ?? "";
  return ext.length <= 12 ? ext : "";
}

function isAllowedQuickSaveFile(file: File): boolean {
  const mime = file.type.trim().toLowerCase();
  if (mime.startsWith("image/")) return true;
  if (QUICK_SAVE_MIME_TYPES.has(mime)) return true;
  return QUICK_SAVE_FILE_EXTENSIONS.has(fileExtension(file.name));
}

function contentTypeForFile(file: File): string {
  const mime = file.type.trim();
  if (mime) return mime;
  return guessMimeFromExtension(fileExtension(file.name)) ?? "application/octet-stream";
}

function isMissingProfilesColumnError(err: unknown): boolean {
  const o = err && typeof err === "object" ? (err as Record<string, unknown>) : {};
  const code = typeof o.code === "string" ? o.code : "";
  const msg = typeof o.message === "string" ? o.message.toLowerCase() : "";
  const details = typeof o.details === "string" ? o.details.toLowerCase() : "";
  const hint = typeof o.hint === "string" ? o.hint.toLowerCase() : "";
  const combined = `${msg} ${details} ${hint}`;
  return (
    code === "PGRST204" ||
    combined.includes("schema cache") ||
    combined.includes("quick_save_") ||
    combined.includes("could not find")
  );
}

async function loadQuickSaveProfile(userId: string): Promise<QuickSaveProfile> {
  const supabase = await createServerSupabaseClient();
  const defaults: QuickSaveProfile = {
    language: "en",
    slug: DEFAULT_LOCALE_SLUG,
    enabled: false,
    defaultDestination: "review",
    requireReview: true,
  };

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "language, quick_save_enabled, quick_save_default_destination, quick_save_require_review",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error && isMissingProfilesColumnError(error)) {
    const { data: fallback } = await supabase
      .from("profiles")
      .select("language")
      .eq("id", userId)
      .maybeSingle();
    const language = parseAppLocale((fallback as { language?: unknown } | null)?.language);
    return { ...defaults, language, slug: appLocaleToUrlSlug(language) };
  }
  if (error || !data) return defaults;

  const row = data as Record<string, unknown>;
  const language = parseAppLocale(row.language);
  return {
    language,
    slug: appLocaleToUrlSlug(language),
    enabled: typeof row.quick_save_enabled === "boolean" ? row.quick_save_enabled : false,
    defaultDestination: normalizeQuickSaveDestination(row.quick_save_default_destination),
    requireReview:
      typeof row.quick_save_require_review === "boolean"
        ? row.quick_save_require_review
        : true,
  };
}

async function uploadQuickSaveFiles(input: {
  userId: string;
  captureId: string;
  files: File[];
}): Promise<QuickSaveFileRef[]> {
  const supabase = await createServerSupabaseClient();
  const refs: QuickSaveFileRef[] = [];

  for (let index = 0; index < input.files.length; index += 1) {
    const file = input.files[index]!;
    if (!isAllowedQuickSaveFile(file)) throw new Error("QUICK_SAVE_UNSUPPORTED_FILE_TYPE");
    if (file.size > QUICK_SAVE_MAX_FILE_BYTES) throw new Error("QUICK_SAVE_FILE_TOO_LARGE");

    const safeName = sanitizeSharedFilename(file.name || `shared-file-${index + 1}`);
    const storagePath = `quick-save/${input.userId}/${input.captureId}/${index + 1}-${safeName}`;
    const contentType = contentTypeForFile(file);
    const { error } = await supabase.storage
      .from("knowledge-files")
      .upload(storagePath, file, {
        contentType,
        upsert: false,
      });
    if (error) throw error;

    refs.push({
      name: file.name || safeName,
      mime_type: contentType,
      size: file.size,
      storage_path: storagePath,
    });
  }

  return refs;
}

function successPath(
  slug: QuickSaveProfile["slug"],
  destination: "knowledge" | "idea",
  id: string,
): string {
  const params = new URLSearchParams({ destination });
  params.set(destination === "knowledge" ? "item" : "idea", id);
  return `${withLocalePrefix(slug, "/quick-save/success")}?${params.toString()}`;
}

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirectTo(request, `${defaultLocalizedPath("/quick-save-login")}`);

  const profile = await loadQuickSaveProfile(user.id);
  return redirectTo(request, `${withLocalePrefix(profile.slug, "/quick-save/setup")}`);
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirectTo(request, `${defaultLocalizedPath("/quick-save-login")}`);

  const profile = await loadQuickSaveProfile(user.id);
  if (!profile.enabled) {
    return redirectTo(
      request,
      `${withLocalePrefix(profile.slug, "/quick-save/setup")}?reason=disabled`,
    );
  }

  try {
    const formData = await request.formData();
    const title = cleanSharedString(formData.get("title"), QUICK_SAVE_TITLE_LIMIT);
    const text = cleanSharedString(formData.get("text"), QUICK_SAVE_TEXT_LIMIT);
    const url = cleanSharedString(formData.get("url"), 4096);
    const files = getSharedFiles(formData);
    const normalizedUrl = extractFirstHttpUrl(url, text, title);
    const hasIncomingContent = Boolean(title || text || url || normalizedUrl || files.length > 0);

    if (!hasIncomingContent) {
      return redirectTo(
        request,
        `${withLocalePrefix(profile.slug, "/quick-save/setup")}?reason=empty`,
      );
    }

    const destination = profile.defaultDestination;
    const shouldReview = profile.requireReview || destination === "review";

    if (shouldReview) {
      const captureId = crypto.randomUUID();
      const fileRefs = await uploadQuickSaveFiles({ userId: user.id, captureId, files });
      const capture = await insertQuickSaveCapture(supabase, {
        id: captureId,
        userId: user.id,
        title,
        text,
        url,
        normalizedUrl,
        fileRefs,
      });

      return redirectTo(request, withLocalePrefix(profile.slug, `/quick-save/${capture.id}`));
    }

    if (destination === "knowledge") {
      let itemId: string | null = null;
      if (normalizedUrl) {
        const item = await addKnowledgeFromUrl(normalizedUrl, {
          thumbnailStyle: "na",
          language: profile.language,
        });
        itemId = item.id;
      } else if (files.length > 0) {
        const captureId = crypto.randomUUID();
        const fileRefs = await uploadQuickSaveFiles({ userId: user.id, captureId, files });
        for (const file of fileRefs) {
          const item = await finalizeKnowledgeFileUpload({
            storagePath: file.storage_path,
            originalFileName: file.name,
            mimeType: file.mime_type,
            thumbnailStyle: "na",
            language: profile.language,
            byteSizeHint: file.size,
          });
          itemId ??= item.id;
        }
      } else {
        const item = await addKnowledgeFromText(title ?? "Quick Save", text ?? title ?? "", {
          thumbnailStyle: "na",
          sourceType: "plain_text",
          language: profile.language,
        });
        itemId = item.id;
      }

      if (!itemId) throw new Error("QUICK_SAVE_KNOWLEDGE_SAVE_FAILED");
      return redirectTo(request, successPath(profile.slug, "knowledge", itemId));
    }

    if (destination === "idea") {
      const captureId = crypto.randomUUID();
      const fileRefs = await uploadQuickSaveFiles({ userId: user.id, captureId, files });
      const idea = await createIdeaFromQuickSave({
        userId: user.id,
        title,
        text,
        normalizedUrl,
        fileRefs,
      });
      return redirectTo(request, successPath(profile.slug, "idea", idea.id));
    }

    return redirectTo(request, `${withLocalePrefix(profile.slug, "/quick-save/setup")}`);
  } catch (error) {
    console.error("[quick-save] share-target failed", error);
    return redirectTo(
      request,
      `${withLocalePrefix(profile.slug, "/quick-save/setup")}?reason=error`,
    );
  }
}
