/**
 * Server-side screenshot capture using `@sparticuz/chromium` + `playwright-core`.
 *
 * This module is the **single** entry point for all snapshot capture in the
 * Knowledge Base. Providers don't touch Playwright directly — they call
 * `captureAndUploadSnapshot()` (or, more commonly, ask the cascade to defer
 * a snapshot via `screenshotRequested: true`).
 *
 * Vercel serverless constraints:
 *   - Cold start ~600–900ms for chromium load + first launch.
 *   - First page.goto is another 1.5–2.5s.
 *   - Total budget ≈ 3–5s on cold; ~1–2s warm.
 *
 * **We never bypass login walls.** This module only screenshots publicly
 * accessible content. Private / login-gated pages are detected by string +
 * DOM heuristics and reported back as `screenshot_failed` with a
 * loginWallDetected flag the caller can use to surface a "manual upload"
 * CTA.
 */

import crypto from "node:crypto";
import type { Page } from "playwright-core";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { KnowledgeAssetSource } from "@/types/knowledge-source";

type LoginWallReason = "login_required" | "private_or_restricted";

const STORAGE_BUCKET = "knowledge-files";

export type SnapshotInput = {
  /** Page URL to capture. Must be http(s). */
  url: string;
  /** Owning user ID — used for the storage path. */
  userId: string;
  /** Knowledge item this snapshot belongs to (for the `knowledge_assets` row). */
  knowledgeItemId?: string;
  /** Capture mode. "post" attempts a tight crop of the main post element;
   *  "fullpage" captures everything above the fold (default). */
  mode?: "post" | "fullpage";
  /** Hard timeout for the page load + screenshot (ms). Default 12_000. */
  timeoutMs?: number;
  /** Source label for `knowledge_assets.source`. */
  source?: KnowledgeAssetSource;
};

export type SnapshotResult =
  | {
      ok: true;
      storagePath: string;
      publicUrl: string;
      width: number;
      height: number;
      capturedAt: string;
    }
  | {
      ok: false;
      reason:
        | "login_required"
        | "private_or_restricted"
        | "deleted_or_unavailable"
        | "geo_restricted"
        | "screenshot_failed";
      message?: string;
    };

const LOGIN_WALL_PHRASES = [
  // English
  "log in",
  "log into",
  "sign up to continue",
  "sign up to see",
  "join now to continue",
  "see more on",
  "create an account",
  // Instagram-specific
  "see this post and more",
  "view in app",
  // Facebook
  "you must log in to continue",
  "see more on facebook",
  // Threads
  "log in or sign up",
  // Reddit
  "you must be logged in",
];

/**
 * Capture a screenshot of a public URL and upload it to the knowledge-files
 * bucket. Returns either an ok result with the public URL, or a precise
 * failure reason that maps to a `previewStatus`.
 *
 * Loads playwright + chromium lazily so module import doesn't pay the cost
 * for non-snapshot codepaths.
 */
export async function captureAndUploadSnapshot(
  input: SnapshotInput,
): Promise<SnapshotResult> {
  const { url, userId } = input;
  const mode = input.mode ?? "fullpage";
  const timeoutMs = input.timeoutMs ?? 12_000;

  // Defensive: refuse non-http(s) URLs.
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: "screenshot_failed", message: "invalid_url" };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, reason: "screenshot_failed", message: "non_http_url" };
  }

  // Lazy import to avoid loading chromium for non-snapshot codepaths.
  const [{ chromium: playwrightChromium }, sparticuzChromium] = await Promise.all([
    import("playwright-core"),
    import("@sparticuz/chromium"),
  ]);
  const chromium = sparticuzChromium.default ?? sparticuzChromium;

  let browser: Awaited<ReturnType<typeof playwrightChromium.launch>> | null = null;
  try {
    browser = await playwrightChromium.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const context = await browser.newContext({
      viewport: { width: 1080, height: 1350 },
      userAgent:
        "Mozilla/5.0 (compatible; MyLifeOS-Knowledge/1.0; +https://example.com/bot)",
      // Don't carry any cookies / auth — public-only.
      ignoreHTTPSErrors: false,
      locale: "en-US",
    });

    const page = await context.newPage();

    // Race goto against our timeout budget.
    let nav: { statusCode: number };
    try {
      const response = await page.goto(url, {
        waitUntil: "networkidle",
        timeout: timeoutMs,
      });
      nav = { statusCode: response?.status() ?? 0 };
    } catch (err) {
      return {
        ok: false,
        reason: "screenshot_failed",
        message: err instanceof Error ? err.message : "goto_failed",
      };
    }

    if (nav.statusCode === 404 || nav.statusCode === 410) {
      return { ok: false, reason: "deleted_or_unavailable" };
    }
    if (nav.statusCode === 451) {
      return { ok: false, reason: "geo_restricted" };
    }

    // Detect login walls via visible text + URL signals.
    const wall = await detectLoginWall(page, parsed);
    if (wall) {
      return { ok: false, reason: wall };
    }

    // Best-effort cookie banner dismissal — non-blocking, short timeout.
    await dismissCookieBanners(page);

    // Capture screenshot. For "post" mode we try to crop to the article body
    // if we can find it; otherwise fall back to fullpage above-the-fold.
    let buffer: Buffer;
    if (mode === "post") {
      buffer = await capturePostMode(page);
    } else {
      buffer = await page.screenshot({
        type: "png",
        fullPage: false,
        omitBackground: false,
      });
    }

    const dim = { width: 1080, height: 1350 };

    // Upload to Supabase Storage.
    const supabase = await createServerSupabaseClient();
    const id = crypto.randomUUID();
    const storagePath = `snapshots/${userId}/${id}.png`;
    const { error: uploadErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: "image/png",
        upsert: false,
      });
    if (uploadErr) {
      return {
        ok: false,
        reason: "screenshot_failed",
        message: uploadErr.message,
      };
    }

    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    // Insert knowledge_assets row if a knowledgeItemId was given.
    if (input.knowledgeItemId) {
      try {
        await supabase.from("knowledge_assets").insert({
          knowledge_item_id: input.knowledgeItemId,
          user_id: userId,
          asset_type: "auto_snapshot",
          storage_path: storagePath,
          public_url: urlData.publicUrl,
          source: input.source ?? "playwright",
          mime_type: "image/png",
          byte_size: buffer.byteLength,
          width: dim.width,
          height: dim.height,
        });
      } catch (err) {
        // Non-fatal — the file is uploaded; failure to insert the asset row
        // means we lose the audit trail but the screenshot is still usable.
        console.error("[snapshot] knowledge_assets insert failed:", err);
      }
    }

    return {
      ok: true,
      storagePath,
      publicUrl: urlData.publicUrl,
      width: dim.width,
      height: dim.height,
      capturedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      ok: false,
      reason: "screenshot_failed",
      message: err instanceof Error ? err.message : "unknown",
    };
  } finally {
    if (browser) {
      await browser.close().catch(() => {
        // ignore
      });
    }
  }
}

/**
 * Detect whether the page is showing a login wall instead of the actual
 * content the user pasted. We do NOT attempt to bypass — we report the wall
 * and let the user upload a manual screenshot.
 */
async function detectLoginWall(
  page: Page,
  parsed: URL,
): Promise<LoginWallReason | null> {
  try {
    // Check for redirect to a login URL.
    const finalUrl = page.url();
    if (
      /\/(login|signin|sign_in|accounts\/login)/i.test(finalUrl) ||
      /\?next=|redirect_to=/i.test(finalUrl)
    ) {
      return "login_required";
    }

    // Check Instagram / Facebook / Threads private-account markers.
    const bodyText = await page.evaluate(() => document.body?.innerText ?? "");
    const lc = bodyText.toLowerCase();

    if (
      lc.includes("this account is private") ||
      lc.includes("the link you followed may be broken") ||
      lc.includes("this content isn't available") ||
      lc.includes("page isn't available")
    ) {
      return "private_or_restricted";
    }

    for (const phrase of LOGIN_WALL_PHRASES) {
      if (lc.includes(phrase)) {
        return "login_required";
      }
    }

    // Instagram embed iframe shows "View in app" — same idea.
    if (
      parsed.hostname.includes("instagram.com") &&
      (lc.includes("view in app") || lc.includes("see more on instagram"))
    ) {
      return "login_required";
    }

    return null;
  } catch {
    return null;
  }
}

async function dismissCookieBanners(page: Page): Promise<void> {
  const SELECTORS = [
    'button:has-text("Accept all")',
    'button:has-text("Accept All")',
    'button:has-text("Allow all")',
    'button:has-text("I agree")',
    '[aria-label="Accept all"]',
    "#onetrust-accept-btn-handler",
  ];
  for (const sel of SELECTORS) {
    try {
      const el = await page.$(sel);
      if (el) {
        await el.click({ timeout: 800 }).catch(() => undefined);
        return;
      }
    } catch {
      // ignore
    }
  }
}

async function capturePostMode(page: Page): Promise<Buffer> {
  const SELECTORS = [
    "article",
    "[role='article']",
    ".post-content",
    "main",
  ];
  for (const sel of SELECTORS) {
    try {
      const el = await page.$(sel);
      if (el) {
        const buf = await el.screenshot({ type: "png" });
        return Buffer.from(buf);
      }
    } catch {
      // try next
    }
  }
  const buf = await page.screenshot({ type: "png", fullPage: false });
  return Buffer.from(buf);
}
