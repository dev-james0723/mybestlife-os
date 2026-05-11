/**
 * Connection store — server-only DB layer for `social_connections`.
 *
 * Tokens are encrypted at rest with AES-256-GCM (`token-crypto.ts`).
 * Decryption happens here when a provider needs to call upstream APIs;
 * the resulting `DecryptedConnection` MUST stay server-side and MUST NOT
 * be returned to the client. For client-facing reads, use
 * {@link listConnectionsForClient} which returns the sanitized public shape.
 *
 * RLS on `social_connections` allows a user to read their own rows; the
 * ciphertext returned to the client is useless without the master key.
 */

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { decrypt, encrypt } from "@/lib/security/token-crypto";
import type {
  OAuthProvider,
  SocialConnectionStatus,
} from "@/types/knowledge-source";
import type {
  DecryptedConnection,
  SocialConnectionPublic,
  SocialConnectionRow,
} from "@/types/social-connections";
import { toPublicConnection } from "@/types/social-connections";

const TABLE = "social_connections";

type SaveConnectionInput = {
  userId: string;
  provider: OAuthProvider;
  accessToken: string;
  refreshToken?: string;
  scopes?: string[];
  expiresAt?: string | Date;
  providerAccountId?: string;
  accountName?: string;
  accountHandle?: string;
};

/**
 * Insert or update a connection (one row per (user, provider)). Encrypts the
 * tokens before write. Resets status to "active" so a previously expired /
 * disconnected row reactivates.
 */
export async function saveConnection(input: SaveConnectionInput): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const accessBlob = encrypt(input.accessToken);
  const refreshBlob = input.refreshToken ? encrypt(input.refreshToken) : null;
  const expiresAtIso =
    input.expiresAt instanceof Date
      ? input.expiresAt.toISOString()
      : input.expiresAt ?? null;

  const row = {
    user_id: input.userId,
    provider: input.provider,
    provider_account_id: input.providerAccountId ?? null,
    account_name: input.accountName ?? null,
    account_handle: input.accountHandle ?? null,
    access_token_ct: accessBlob.ct,
    access_token_iv: accessBlob.iv,
    access_token_tag: accessBlob.tag,
    refresh_token_ct: refreshBlob?.ct ?? null,
    refresh_token_iv: refreshBlob?.iv ?? null,
    refresh_token_tag: refreshBlob?.tag ?? null,
    scopes: input.scopes ?? [],
    expires_at: expiresAtIso,
    status: "active" satisfies SocialConnectionStatus,
    last_checked_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from(TABLE)
    .upsert(row, { onConflict: "user_id,provider" });
  if (error) {
    throw new Error(`saveConnection failed: ${error.message}`);
  }
}

/**
 * Load + decrypt a connection. Returns null when no row exists OR when the
 * row is in a non-active state. Use {@link listConnectionsForClient} when
 * you want to show "expired" / "disconnected" in the UI.
 */
export async function getConnection(
  userId: string,
  provider: OAuthProvider,
): Promise<DecryptedConnection | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as SocialConnectionRow;
  if (row.status !== "active") return null;

  let accessToken: string;
  let refreshToken: string | undefined;
  try {
    accessToken = decrypt({
      ct: row.access_token_ct,
      iv: row.access_token_iv,
      tag: row.access_token_tag,
    });
    if (row.refresh_token_ct && row.refresh_token_iv && row.refresh_token_tag) {
      refreshToken = decrypt({
        ct: row.refresh_token_ct,
        iv: row.refresh_token_iv,
        tag: row.refresh_token_tag,
      });
    }
  } catch (err) {
    // Decryption failures usually mean the master key was rotated without
    // re-encrypting rows, or the row is corrupted. Mark as error so the user
    // sees "Reconnect" in the UI rather than silently failing.
    console.error("[connection-store] decrypt failed:", err);
    await markStatus(userId, provider, "error");
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    providerAccountId: row.provider_account_id ?? undefined,
    accountName: row.account_name ?? undefined,
    accountHandle: row.account_handle ?? undefined,
    accessToken,
    refreshToken,
    scopes: row.scopes,
    expiresAt: row.expires_at ?? undefined,
    status: row.status,
  };
}

/** Mark a connection's status (e.g. "expired" after a 401). */
export async function markStatus(
  userId: string,
  provider: OAuthProvider,
  status: SocialConnectionStatus,
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ status, last_checked_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("provider", provider);
  if (error) {
    throw new Error(`markStatus failed: ${error.message}`);
  }
}

/** Hard-delete a connection (user clicked "Disconnect"). */
export async function deleteConnection(
  userId: string,
  provider: OAuthProvider,
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("user_id", userId)
    .eq("provider", provider);
  if (error) {
    throw new Error(`deleteConnection failed: ${error.message}`);
  }
}

/**
 * List the calling user's connections in client-safe form (NO TOKENS). Used
 * by Settings → Social Integrations and the `/api/social/status` route.
 */
export async function listConnectionsForClient(
  userId: string,
): Promise<SocialConnectionPublic[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return (data as SocialConnectionRow[]).map(toPublicConnection);
}
