/**
 * Types for the `social_connections` and `knowledge_assets` tables.
 *
 * Tokens are encrypted AES-256-GCM via TOKEN_ENCRYPTION_KEY (server env).
 * The plaintext token NEVER appears in any of these types — only the three
 * ciphertext components exposed by the DB row. The `decrypt` step lives in
 * `src/lib/security/token-crypto.ts` (server-only) and produces a transient
 * runtime-only `DecryptedConnection`. That value MUST NEVER be returned to
 * the client; the API layer always strips token fields before responding.
 */

import type {
  KnowledgeAssetSource,
  KnowledgeAssetType,
  OAuthProvider,
  SocialConnectionStatus,
} from "./knowledge-source";

/** Raw row as stored in `public.social_connections`. */
export type SocialConnectionRow = {
  id: string;
  user_id: string;
  provider: OAuthProvider;
  provider_account_id: string | null;
  account_name: string | null;
  account_handle: string | null;
  access_token_ct: string;
  access_token_iv: string;
  access_token_tag: string;
  refresh_token_ct: string | null;
  refresh_token_iv: string | null;
  refresh_token_tag: string | null;
  scopes: string[];
  expires_at: string | null;
  status: SocialConnectionStatus;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Client-safe shape returned by `/api/social/status`. Token columns are
 * stripped. Used by the Settings → Social Integrations UI.
 */
export type SocialConnectionPublic = {
  id: string;
  provider: OAuthProvider;
  providerAccountId?: string;
  accountName?: string;
  accountHandle?: string;
  scopes: string[];
  expiresAt?: string;
  status: SocialConnectionStatus;
  lastCheckedAt?: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * Server-only shape with decrypted tokens. Produced by the token-crypto
 * helper; passed into provider extractors via `ProviderContext.connection`.
 * MUST NEVER be serialized to a client response.
 */
export type DecryptedConnection = {
  id: string;
  userId: string;
  provider: OAuthProvider;
  providerAccountId?: string;
  accountName?: string;
  accountHandle?: string;
  accessToken: string;
  refreshToken?: string;
  scopes: string[];
  expiresAt?: string;
  status: SocialConnectionStatus;
};

export function toPublicConnection(row: SocialConnectionRow): SocialConnectionPublic {
  return {
    id: row.id,
    provider: row.provider,
    providerAccountId: row.provider_account_id ?? undefined,
    accountName: row.account_name ?? undefined,
    accountHandle: row.account_handle ?? undefined,
    scopes: row.scopes,
    expiresAt: row.expires_at ?? undefined,
    status: row.status,
    lastCheckedAt: row.last_checked_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Raw row as stored in `public.knowledge_assets`. */
export type KnowledgeAssetRow = {
  id: string;
  knowledge_item_id: string;
  user_id: string;
  asset_type: KnowledgeAssetType;
  storage_path: string;
  public_url: string | null;
  source: KnowledgeAssetSource | null;
  mime_type: string | null;
  byte_size: number | null;
  width: number | null;
  height: number | null;
  created_at: string;
};

export type KnowledgeAsset = {
  id: string;
  knowledgeItemId: string;
  userId: string;
  assetType: KnowledgeAssetType;
  storagePath: string;
  publicUrl?: string;
  source?: KnowledgeAssetSource;
  mimeType?: string;
  byteSize?: number;
  width?: number;
  height?: number;
  createdAt: string;
};

export function mapRowToAsset(row: KnowledgeAssetRow): KnowledgeAsset {
  return {
    id: row.id,
    knowledgeItemId: row.knowledge_item_id,
    userId: row.user_id,
    assetType: row.asset_type,
    storagePath: row.storage_path,
    publicUrl: row.public_url ?? undefined,
    source: row.source ?? undefined,
    mimeType: row.mime_type ?? undefined,
    byteSize: row.byte_size ?? undefined,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    createdAt: row.created_at,
  };
}
