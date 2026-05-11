// Supabase Edge Function — `resolve-share`
//
// Public endpoint that turns a share token into a short-lived signed-URL
// bundle the anonymous viewer can render. Runs with the service role so it
// can read the private tables, but the caller cannot; every validation
// (token, password, expiration, view cap) happens inside this function.
//
// Request body:
//   {
//     "token":    string,
//     "password": string?   // when the share is password-protected
//     "action":   "preview" | "downloaded"  // "preview" is the default
//   }
//
// Response 200:
//   {
//     shareType, ownerName, recipientLabel, allowDownload,
//     watermarkEnabled, expiresAt, maxViews, viewCount, createdAt,
//     bundle?: {...},
//     files: [{ id, filename, fileSize, mimeType, signedUrl, order }]
//   }
//
// Response 401: { error: "password_required" | "password_invalid" }
// Response 404: { error: "not_found" | "revoked" | "expired" | "exhausted" }
//
// Env:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Security notes:
// - IP is SHA-256-hashed before it's written to `share_access_logs`; the
//   plaintext never leaves this function.
// - Password verification uses PBKDF2-SHA256 with 100 000 iterations, same
//   parameters as the client-side hasher in lib/career-vault/share-crypto.ts.

// deno-lint-ignore-file no-explicit-any
// @ts-nocheck — this file targets the Supabase Edge runtime, not the Next.js TS project.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const BUCKET = "career-vault";
const SIGNED_URL_TTL = 60 * 15; // 15 min
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEY_LEN = 32;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const bin = atob(padded + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pbkdf2(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    key,
    PBKDF2_KEY_LEN * 8,
  );
  return new Uint8Array(bits);
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  const bytes = new Uint8Array(buf);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "0.0.0.0"
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json(405, { error: "method_not_allowed" });
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, { error: "server_misconfigured" });
  }

  let payload: {
    token?: string;
    password?: string;
    action?: "preview" | "downloaded";
  };
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "invalid_json" });
  }

  const token = (payload.token || "").trim();
  if (!token) return json(400, { error: "missing_token" });

  const action = payload.action === "downloaded" ? "downloaded" : "preview";

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ipHash = await sha256Hex(getClientIp(req));
  const userAgent = (req.headers.get("user-agent") || "").slice(0, 300);

  const logAccess = async (
    shareId: string,
    logAction: "viewed" | "downloaded" | "password_failed",
  ) => {
    try {
      await admin.from("share_access_logs").insert({
        share_id: shareId,
        ip_hash: ipHash,
        user_agent: userAgent,
        action: logAction,
      });
    } catch {
      // Log failures are never fatal for the public viewer.
    }
  };

  const { data: shareRow, error: shareErr } = await admin
    .from("career_vault_shares")
    .select("*")
    .eq("share_token", token)
    .maybeSingle();

  if (shareErr) return json(500, { error: "lookup_failed" });
  if (!shareRow) return json(404, { error: "not_found" });
  if (!shareRow.is_active) return json(404, { error: "revoked" });

  if (shareRow.expires_at && new Date(shareRow.expires_at).getTime() < Date.now()) {
    return json(404, { error: "expired" });
  }
  if (
    typeof shareRow.max_views === "number" &&
    shareRow.view_count >= shareRow.max_views
  ) {
    return json(404, { error: "exhausted" });
  }

  // Password gate.
  if (shareRow.password_hash && shareRow.password_salt) {
    const supplied = (payload.password || "").toString();
    if (!supplied) {
      return json(401, { error: "password_required" });
    }
    const salt = base64UrlToBytes(shareRow.password_salt);
    const expected = base64UrlToBytes(shareRow.password_hash);
    const derived = await pbkdf2(supplied, salt);
    if (!constantTimeEqual(derived, expected)) {
      await logAccess(shareRow.id, "password_failed");
      return json(401, { error: "password_invalid" });
    }
  }

  // Resolve the owner display name (best-effort).
  let ownerName: string | null = null;
  try {
    const { data: profile } = await admin
      .from("user_profiles")
      .select("full_name")
      .eq("id", shareRow.user_id)
      .maybeSingle();
    ownerName = (profile?.full_name as string) ?? null;
  } catch {
    ownerName = null;
  }

  // Resolve files.
  const files: Array<{
    id: string;
    filename: string;
    fileSize: number;
    mimeType: string;
    signedUrl: string;
    order: number;
  }> = [];

  let bundle:
    | {
        name: string;
        description: string | null;
        includeCoverPage: boolean;
        coverTitle: string | null;
        coverSubtitle: string | null;
        coverRecipient: string | null;
      }
    | null = null;

  if (shareRow.share_type === "single_file" && shareRow.file_id) {
    const { data: fileRow, error: fileErr } = await admin
      .from("career_vault_files")
      .select("id, filename, file_path, file_size, mime_type, user_id")
      .eq("id", shareRow.file_id)
      .maybeSingle();
    if (fileErr || !fileRow) return json(404, { error: "not_found" });

    const { data: signed } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(fileRow.file_path, SIGNED_URL_TTL);
    files.push({
      id: fileRow.id,
      filename: fileRow.filename,
      fileSize: fileRow.file_size,
      mimeType: fileRow.mime_type,
      signedUrl: signed?.signedUrl ?? "",
      order: 0,
    });
  } else if (shareRow.share_type === "bundle" && shareRow.bundle_id) {
    const { data: bundleRow, error: bundleErr } = await admin
      .from("career_vault_bundles")
      .select("*")
      .eq("id", shareRow.bundle_id)
      .maybeSingle();
    if (bundleErr || !bundleRow) return json(404, { error: "not_found" });

    bundle = {
      name: bundleRow.name,
      description: bundleRow.description,
      includeCoverPage: !!bundleRow.include_cover_page,
      coverTitle: bundleRow.cover_title,
      coverSubtitle: bundleRow.cover_subtitle,
      coverRecipient: bundleRow.cover_recipient,
    };

    const fileIds: string[] = bundleRow.file_order || [];
    if (fileIds.length > 0) {
      const { data: fileRows } = await admin
        .from("career_vault_files")
        .select("id, filename, file_path, file_size, mime_type")
        .in("id", fileIds);

      const byId = new Map<string, any>();
      for (const f of fileRows || []) byId.set(f.id, f);

      for (let i = 0; i < fileIds.length; i++) {
        const f = byId.get(fileIds[i]);
        if (!f) continue;
        const { data: signed } = await admin.storage
          .from(BUCKET)
          .createSignedUrl(f.file_path, SIGNED_URL_TTL);
        files.push({
          id: f.id,
          filename: f.filename,
          fileSize: f.file_size,
          mimeType: f.mime_type,
          signedUrl: signed?.signedUrl ?? "",
          order: i,
        });
      }
    }
  }

  // Increment view count and log access.
  try {
    await admin
      .from("career_vault_shares")
      .update({ view_count: (shareRow.view_count ?? 0) + 1 })
      .eq("id", shareRow.id);
  } catch {
    // non-fatal
  }
  await logAccess(shareRow.id, action === "downloaded" ? "downloaded" : "viewed");

  const response = {
    shareType: shareRow.share_type,
    ownerName,
    recipientLabel: shareRow.recipient_label,
    allowDownload: !!shareRow.allow_download,
    watermarkEnabled: !!shareRow.watermark_enabled,
    expiresAt: shareRow.expires_at,
    maxViews: shareRow.max_views,
    viewCount: (shareRow.view_count ?? 0) + 1,
    createdAt: shareRow.created_at,
    bundle,
    files,
  };
  return json(200, response);
});
